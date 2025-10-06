import React, { useState, useRef, useEffect } from 'react';
import type { Event, Availability } from '../types';
import { availabilityApi } from '../supabaseClient';
import { supabase } from '../supabaseClient';

interface EventViewProps {
  event: Event;
  onBack: () => void;
}

function EventView({ event, onBack }: EventViewProps) {
  const [userName, setUserName] = useState('');
  const [selectedCells, setSelectedCells] = useState(new Set<string>());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const draggedCellsRef = useRef(new Set<string>());

  // Load availability and time slots on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadTimeSlots();
        await loadAvailability();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [event.id]);

  // Load user's existing selections when they enter their name
  useEffect(() => {
    if (userName.trim()) {
      loadUserSelections(userName.trim());
    } else {
      setSelectedCells(new Set());
      setIsEditingExisting(false);
      setHasExistingData(false);
      setIsEditMode(false);
    }
  }, [userName, availabilities]);

  const loadUserSelections = (name: string) => {
    // Find all cells this user has selected
    const userCells = availabilities
      .filter(a => a.userName.toLowerCase() === name.toLowerCase())
      .map(a => a.timeSlotId);

    if (userCells.length > 0) {
      setSelectedCells(new Set(userCells));
      setHasExistingData(true);
      setIsEditingExisting(true);
      setIsEditMode(false); // Start in view mode, not edit mode
    } else {
      setSelectedCells(new Set());
      setHasExistingData(false);
      setIsEditingExisting(false);
      setIsEditMode(true); // New user, go straight to edit mode
    }
  };

  const [validCells, setValidCells] = useState<Set<string>>(new Set());
  const [dates, setDates] = useState<string[]>([]);

  const loadTimeSlots = async () => {
    try {
      const { data: timeSlots, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', event.id);

      if (error) throw error;

      // Generate 15-min cells from time slot ranges
      const cellsSet = new Set<string>();
      const datesSet = new Set<string>();

      timeSlots?.forEach((slot) => {
        const startDate = new Date(slot.start_time);
        const endDate = new Date(slot.end_time);

        // Format date in local timezone
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;

        datesSet.add(date);

        // Generate 15-minute cells for this time range
        const current = new Date(startDate);
        while (current < endDate) {
          const hour = current.getHours();
          const minute = current.getMinutes();
          const cellId = `${date}-${hour}-${minute}`;
          cellsSet.add(cellId);

          // Move to next 15-minute interval
          current.setMinutes(current.getMinutes() + 15);
        }
      });

      const sortedDates = Array.from(datesSet).sort();

      setDates(sortedDates);
      setValidCells(cellsSet);
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  };

  const loadAvailability = async () => {
    try {
      const data = await availabilityApi.getEventAvailability(event.id);

      // Map availability - each record now has selected_cells as JSON array
      const loadedAvailability: Availability[] = [];

      data.forEach(item => {
        // selected_cells is an array of cell IDs
        const selectedCells = item.selected_cells || [];

        selectedCells.forEach((cellId: string) => {
          loadedAvailability.push({
            userName: item.user_name,
            timeSlotId: cellId
          });
        });
      });

      setAvailabilities(loadedAvailability);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  // Get unique dates from time slots
  const allHours = event.timeSlots.flatMap(s => [s.startHour, s.endHour]);
  const minHour = Math.min(...allHours);
  const maxHour = Math.max(...allHours);

  // Create 15-minute time slots: each hour has 4 slots (0, 15, 30, 45)
  const timeSlots: Array<{ hour: number; minute: number }> = [];
  for (let h = minHour; h < maxHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeSlots.push({ hour: h, minute: m });
    }
  }

  const users = Array.from(new Set(availabilities.map(a => a.userName)));

  const getCellId = (date: string, hour: number, minute: number) => `${date}-${hour}-${minute}`;

  // Check if a cell is valid (exists in generated cells from time slots)
  const isValidCell = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);
    return validCells.has(cellId);
  };

  // Get users available for a specific cell (excluding current user if in edit mode)
  const getUsersForCell = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);

    // If user is in edit mode, exclude them from the count
    // If user is in view mode, include everyone
    if (isEditMode && userName) {
      return availabilities
        .filter(a => a.timeSlotId === cellId && a.userName.toLowerCase() !== userName.toLowerCase())
        .map(a => a.userName);
    } else {
      return availabilities
        .filter(a => a.timeSlotId === cellId)
        .map(a => a.userName);
    }
  };

  // Check if a specific user selected a cell
  const isUserAvailableForCell = (cellId: string, user: string) => {
    return availabilities.some(
      a => a.timeSlotId === cellId && a.userName === user
    );
  };

  const handleMouseDown = (date: string, hour: number, minute: number) => {
    if (!userName || !isEditMode) {
      return;
    }

    if (!isValidCell(date, hour, minute)) return;

    const cellId = getCellId(date, hour, minute);
    setIsDragging(true);
    draggedCellsRef.current = new Set([cellId]);

    if (selectedCells.has(cellId)) {
      setDragMode('deselect');
      setSelectedCells(prev => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    } else {
      setDragMode('select');
      setSelectedCells(prev => new Set(prev).add(cellId));
    }
  };

  const handleMouseEnter = (date: string, hour: number, minute: number) => {
    if (!isDragging || !dragMode || !isValidCell(date, hour, minute) || !isEditMode) return;

    const cellId = getCellId(date, hour, minute);
    if (draggedCellsRef.current.has(cellId)) return;

    draggedCellsRef.current.add(cellId);

    if (dragMode === 'select') {
      setSelectedCells(prev => new Set(prev).add(cellId));
    } else {
      setSelectedCells(prev => {
        const next = new Set(prev);
        next.delete(cellId);
        return next;
      });
    }
  };

  const handleCellHover = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);
    const usersInCell = getUsersForCell(date, hour, minute);

    // Show tooltip if there are other users or if cell is selected by current user
    if (usersInCell.length > 0 || selectedCells.has(cellId)) {
      setHoveredCell(cellId);
    }
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
    draggedCellsRef.current.clear();
  };

  const handleSave = async () => {
    if (!userName || selectedCells.size === 0) {
      alert('Please enter your name and select available times');
      return;
    }

    setIsSaving(true);

    try {
      const cellIds = Array.from(selectedCells);

      console.log('Saving availability for cells:', cellIds);

      await availabilityApi.saveAvailability(
        event.id,
        userName.trim(),
        cellIds
      );

      await loadAvailability();

      const action = isEditingExisting ? 'Updated' : 'Saved';
      alert(`${action} availability for ${userName}!`);

      // After saving, exit edit mode
      setIsEditMode(false);
      setHasExistingData(true);
      setIsEditingExisting(true);
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const shareableLink = `${window.location.origin}?event=${event.id}`;

  if (isLoading) {
    return (
      <div className="event-view-container">
        <button onClick={onBack} className="btn-back mb-6">
          ← Back to Home
        </button>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-600)' }}>Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-view-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <button onClick={onBack} className="btn-back mb-6">
        ← Back to Home
      </button>

      <div className="card mb-6">
        <h2 className="event-view-title">{event.title}</h2>
        {event.description && (
          <p className="event-view-description">{event.description}</p>
        )}

        <div className="share-box">
          <p className="share-box-label">Share this event:</p>
          <div className="share-input-group">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="input share-input"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareableLink)}
              className="btn-copy"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Instruction moved ABOVE name input */}
      {!userName && (
        <div className="calendar-instructions" style={{
          background: '#fef3c7',
          borderColor: '#fbbf24',
          color: '#92400e',
          marginBottom: '1.5rem'
        }}>
          ⚠️ Please enter your name below to select your availability
        </div>
      )}

      <div className="card mb-6">
        <label className="form-label">Your Name</label>
        <div className="user-input-group">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="input user-input-flex"
            disabled={isSaving}
          />
          {hasExistingData && !isEditMode ? (
            <button
              onClick={handleEditClick}
              className="btn btn-secondary btn-nowrap"
            >
              Edit Availability
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!userName || selectedCells.size === 0 || isSaving}
              className="btn btn-save btn-nowrap"
              style={{
                opacity: !userName || selectedCells.size === 0 || isSaving ? 0.5 : 1,
                cursor: !userName || selectedCells.size === 0 || isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving ? 'Saving...' : isEditingExisting ? 'Update Availability' : 'Save Availability'}
            </button>
          )}
        </div>
        {hasExistingData && !isEditMode && (
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--green-500)',
            fontWeight: '500'
          }}>
            ✓ Your availability is saved
          </p>
        )}
        {isEditMode && isEditingExisting && (
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--primary-blue)',
            fontWeight: '500'
          }}>
            ✏️ Editing mode - make changes and click Update
          </p>
        )}
      </div>

      {users.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
            Participants ({users.length}) - Hover to highlight their availability
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {users.map(user => (
              <span
                key={user}
                className={`tag participant-tag ${hoveredUser === user ? 'participant-tag-active' : ''}`}
                onMouseEnter={() => setHoveredUser(user)}
                onMouseLeave={() => setHoveredUser(null)}
              >
                {user}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="calendar-week-container">
        <div className="calendar-week-grid" style={{
          gridTemplateColumns: `80px repeat(${dates.length}, 1fr)`
        }}>
          {/* Day Headers */}
          <div style={{ background: 'var(--gray-100)' }}></div>
          {dates.map(date => (
            <div key={date} className="calendar-day-header">
              {formatDate(date)}
            </div>
          ))}

          {/* Time Slots */}
          {timeSlots.map(({ hour, minute }) => (
            <React.Fragment key={`${hour}-${minute}`}>
              <div className="calendar-time-label">
                {minute === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
              </div>
              {dates.map(date => {
                const cellId = getCellId(date, hour, minute);
                const isSelected = selectedCells.has(cellId);
                const isValid = isValidCell(date, hour, minute);
                const usersInCell = getUsersForCell(date, hour, minute);

                // Check if hovered user selected this cell
                const isHoveredUserCell = hoveredUser && isUserAvailableForCell(cellId, hoveredUser);

                // Calculate total count (other users + current user if selected)
                const totalCount = isEditMode && isSelected ? usersInCell.length + 1 : usersInCell.length;
                const intensity = Math.min(usersInCell.length / (users.length || 1), 1);

                const isLocked = !userName || isSaving || !isEditMode;
                const isHovered = hoveredCell === cellId;
                const showTooltip = isHovered && (usersInCell.length > 0 || isSelected);

                return (
                  <div
                    key={cellId}
                    onMouseDown={() => !isLocked && handleMouseDown(date, hour, minute)}
                    onMouseEnter={() => {
                      if (!isLocked) {
                        handleMouseEnter(date, hour, minute);
                      }
                      handleCellHover(date, hour, minute);
                    }}
                    onMouseLeave={handleCellLeave}
                    className={`calendar-cell ${isSelected ? 'calendar-cell-selected' : ''} ${!isValid || isLocked ? 'calendar-cell-unavailable' : ''} ${isHoveredUserCell ? 'calendar-cell-user-highlighted' : ''}`}
                    style={{
                      backgroundColor: !isSelected && usersInCell.length > 0
                        ? `rgba(147, 51, 234, ${0.1 + intensity * 0.3})`
                        : undefined,
                      cursor: isLocked ? 'not-allowed' : (isValid ? 'pointer' : 'not-allowed'),
                      opacity: isLocked ? 0.6 : 1
                    }}
                  >
                    {/* Show count if there are other users OR if current user selected it in edit mode */}
                    {totalCount > 0 && (
                      <div className="calendar-cell-availability">
                        {totalCount}
                      </div>
                    )}

                    {/* Tooltip */}
                    {showTooltip && (
                      <div className={`calendar-cell-tooltip ${showTooltip ? 'visible' : ''}`}>
                        {isSelected && usersInCell.length === 0 ? (
                          <div>You {hasExistingData && !isEditMode ? '' : isEditMode ? '(editing)' : '(not saved)'}</div>
                        ) : (
                          <div className="tooltip-users">
                            {isSelected && (
                              <div className="tooltip-user">
                                <div className="tooltip-user-dot"></div>
                                <span>You {hasExistingData && !isEditMode ? '' : isEditMode ? '(editing)' : '(not saved)'}</span>
                              </div>
                            )}
                            {usersInCell.map(user => (
                              <div key={user} className="tooltip-user">
                                <div className="tooltip-user-dot"></div>
                                <span>{user}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {userName && !isSaving && isEditMode && !isEditingExisting && (
        <div className="calendar-instructions">
          💡 Click and drag to select your available times. Hover over cells to see who's available.
        </div>
      )}

      {userName && !isSaving && isEditMode && isEditingExisting && (
        <div className="calendar-instructions" style={{
          background: '#dbeafe',
          borderColor: '#3b82f6',
          color: '#1e40af'
        }}>
          ✏️ You're editing your previous selections. Make changes and click "Update Availability" to save.
        </div>
      )}

      {userName && hasExistingData && !isEditMode && (
        <div className="calendar-instructions" style={{
          background: '#f0fdf4',
          borderColor: '#86efac',
          color: '#166534'
        }}>
          ✓ Your availability is displayed below. Click "Edit Availability" to make changes.
        </div>
      )}
    </div>
  );
}

export default EventView;