import React, { useState, useRef, useEffect } from 'react';
import type { Event, Availability, AvailabilityStatus } from '../types';
import { availabilityApi } from '../supabaseClient';
import { supabase } from '../supabaseClient';

interface EventViewProps {
  event: Event;
  onBack: () => void;
}

function EventView({ event, onBack }: EventViewProps) {
  const [userName, setUserName] = useState('');
  const [selectedCells, setSelectedCells] = useState<Map<string, AvailabilityStatus>>(new Map());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AvailabilityStatus>('available');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const draggedCellsRef = useRef(new Set<string>());

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

  useEffect(() => {
    if (userName.trim()) {
      loadUserSelections(userName.trim());
    } else {
      setSelectedCells(new Map());
      setIsEditingExisting(false);
      setHasExistingData(false);
      setIsEditMode(false);
    }
  }, [userName, availabilities]);

  const loadUserSelections = (name: string) => {
    const userCells = new Map<string, AvailabilityStatus>();

    availabilities
      .filter(a => a.userName.toLowerCase() === name.toLowerCase())
      .forEach(a => {
        userCells.set(a.timeSlotId, a.status);
      });

    if (userCells.size > 0) {
      setSelectedCells(userCells);
      setHasExistingData(true);
      setIsEditingExisting(true);
      setIsEditMode(false);
    } else {
      setSelectedCells(new Map());
      setHasExistingData(false);
      setIsEditingExisting(false);
      setIsEditMode(true);
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

      const cellsSet = new Set<string>();
      const datesSet = new Set<string>();

      timeSlots?.forEach((slot) => {
        const startDate = new Date(slot.start_time);
        const endDate = new Date(slot.end_time);

        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;

        datesSet.add(date);

        const current = new Date(startDate);
        while (current < endDate) {
          const hour = current.getHours();
          const minute = current.getMinutes();
          const cellId = `${date}-${hour}-${minute}`;
          cellsSet.add(cellId);
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

      const loadedAvailability: Availability[] = [];

      data.forEach(item => {
        const selectedCells = item.selected_cells || [];

        selectedCells.forEach((cellData: { cellId: string; status: string }) => {
          loadedAvailability.push({
            userName: item.user_name,
            timeSlotId: cellData.cellId,
            status: cellData.status as AvailabilityStatus
          });
        });
      });

      setAvailabilities(loadedAvailability);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  };

  const allHours = event.timeSlots.flatMap(s => [s.startHour, s.endHour]);
  const minHour = Math.min(...allHours);
  const maxHour = Math.max(...allHours);

  const timeSlots: Array<{ hour: number; minute: number }> = [];
  for (let h = minHour; h < maxHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeSlots.push({ hour: h, minute: m });
    }
  }

  const users = Array.from(new Set(availabilities.map(a => a.userName)));

  const getCellId = (date: string, hour: number, minute: number) => `${date}-${hour}-${minute}`;

  const isValidCell = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);
    return validCells.has(cellId);
  };

  const getUsersForCell = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);

    if (isEditMode && userName) {
      return availabilities
        .filter(a => a.timeSlotId === cellId && a.userName.toLowerCase() !== userName.toLowerCase());
    } else {
      return availabilities
        .filter(a => a.timeSlotId === cellId);
    }
  };

  const isUserAvailableForCell = (cellId: string, user: string) => {
    return availabilities.some(
      a => a.timeSlotId === cellId && a.userName === user
    );
  };

  const getUserStatusForCell = (cellId: string, user: string): AvailabilityStatus | null => {
    const availability = availabilities.find(
      a => a.timeSlotId === cellId && a.userName === user
    );
    return availability?.status || null;
  };

  const handleMouseDown = (date: string, hour: number, minute: number) => {
    if (!userName || !isEditMode) {
      return;
    }

    if (!isValidCell(date, hour, minute)) return;

    const cellId = getCellId(date, hour, minute);
    setIsDragging(true);
    draggedCellsRef.current = new Set([cellId]);

    // Cycle through statuses or remove
    const currentCellStatus = selectedCells.get(cellId);
    const newCells = new Map(selectedCells);

    if (!currentCellStatus) {
      // Not selected, set to current status
      newCells.set(cellId, currentStatus);
    } else if (currentCellStatus === currentStatus) {
      // Same status, remove it
      newCells.delete(cellId);
    } else {
      // Different status, update to current status
      newCells.set(cellId, currentStatus);
    }

    setSelectedCells(newCells);
  };

  const handleMouseEnter = (date: string, hour: number, minute: number) => {
    if (!isDragging || !isValidCell(date, hour, minute) || !isEditMode) return;

    const cellId = getCellId(date, hour, minute);
    if (draggedCellsRef.current.has(cellId)) return;

    draggedCellsRef.current.add(cellId);

    const newCells = new Map(selectedCells);
    newCells.set(cellId, currentStatus);
    setSelectedCells(newCells);
  };

  const handleCellHover = (date: string, hour: number, minute: number) => {
    const cellId = getCellId(date, hour, minute);
    const usersInCell = getUsersForCell(date, hour, minute);

    if (usersInCell.length > 0 || selectedCells.has(cellId)) {
      setHoveredCell(cellId);
    }
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    draggedCellsRef.current.clear();
  };

  const handleSave = async () => {
    if (!userName || selectedCells.size === 0) {
      alert('Please enter your name and select available times');
      return;
    }

    setIsSaving(true);

    try {
      const cellData = Array.from(selectedCells.entries()).map(([cellId, status]) => ({
        cellId,
        status
      }));

      console.log('Saving availability with statuses:', cellData);

      await availabilityApi.saveAvailability(
        event.id,
        userName.trim(),
        cellData
      );

      await loadAvailability();

      const action = isEditingExisting ? 'Updated' : 'Saved';
      alert(`${action} availability for ${userName}!`);

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

        {/* Status Selection Buttons */}
        {userName && isEditMode && (
          <div style={{ marginTop: '1rem' }}>
            <label className="form-label">Select status to paint:</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentStatus('available')}
                className={`status-btn ${currentStatus === 'available' ? 'status-btn-active' : ''}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: currentStatus === 'available' ? '2px solid var(--green-500)' : '2px solid var(--gray-300)',
                  background: currentStatus === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'white',
                  fontWeight: currentStatus === 'available' ? '600' : '500',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>🟢</span>
                Available
              </button>
              <button
                onClick={() => setCurrentStatus('if-needed')}
                className={`status-btn ${currentStatus === 'if-needed' ? 'status-btn-active' : ''}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: currentStatus === 'if-needed' ? '2px solid #eab308' : '2px solid var(--gray-300)',
                  background: currentStatus === 'if-needed' ? 'rgba(234, 179, 8, 0.2)' : 'white',
                  fontWeight: currentStatus === 'if-needed' ? '600' : '500',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>🟡</span>
                If Needed
              </button>
              <button
                onClick={() => setCurrentStatus('unavailable')}
                className={`status-btn ${currentStatus === 'unavailable' ? 'status-btn-active' : ''}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: currentStatus === 'unavailable' ? '2px solid var(--gray-500)' : '2px solid var(--gray-300)',
                  background: currentStatus === 'unavailable' ? 'rgba(107, 114, 128, 0.2)' : 'white',
                  fontWeight: currentStatus === 'unavailable' ? '600' : '500',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>⚫</span>
                Unavailable
              </button>
            </div>
          </div>
        )}

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
            ✏️ Editing mode - select a status and click cells to update
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
                const cellStatus = selectedCells.get(cellId);
                const isValid = isValidCell(date, hour, minute);
                const usersInCell = getUsersForCell(date, hour, minute);

                const isHoveredUserCell = hoveredUser && isUserAvailableForCell(cellId, hoveredUser);
                const hoveredUserStatus = hoveredUser ? getUserStatusForCell(cellId, hoveredUser) : null;

                // Count users by status
                const availableCount = usersInCell.filter(a => a.status === 'available').length;
                const ifNeededCount = usersInCell.filter(a => a.status === 'if-needed').length;
                const unavailableCount = usersInCell.filter(a => a.status === 'unavailable').length;

                // Add current user's status if in edit mode
                const totalAvailable = isEditMode && cellStatus === 'available' ? availableCount + 1 : availableCount;
                const totalIfNeeded = isEditMode && cellStatus === 'if-needed' ? ifNeededCount + 1 : ifNeededCount;
                const totalUnavailable = isEditMode && cellStatus === 'unavailable' ? unavailableCount + 1 : unavailableCount;

                const isLocked = !userName || isSaving || !isEditMode;
                const isHovered = hoveredCell === cellId;
                const showTooltip = isHovered && (usersInCell.length > 0 || cellStatus);

                // Calculate background color based on status
                let backgroundColor = 'white';
                let borderColor = 'var(--gray-200)';

                if (cellStatus) {
                  // Current user has a status for this cell
                  if (isEditMode) {
                    // Editing mode - brighter colors
                    switch (cellStatus) {
                      case 'available':
                        backgroundColor = 'rgba(34, 197, 94, 0.4)';
                        borderColor = 'var(--green-500)';
                        break;
                      case 'if-needed':
                        backgroundColor = 'rgba(234, 179, 8, 0.4)';
                        borderColor = '#eab308';
                        break;
                      case 'unavailable':
                        backgroundColor = 'rgba(107, 114, 128, 0.4)';
                        borderColor = 'var(--gray-500)';
                        break;
                    }
                  } else {
                    // View mode - show saved status
                    switch (cellStatus) {
                      case 'available':
                        backgroundColor = 'rgba(34, 197, 94, 0.3)';
                        borderColor = 'var(--green-500)';
                        break;
                      case 'if-needed':
                        backgroundColor = 'rgba(234, 179, 8, 0.3)';
                        borderColor = '#eab308';
                        break;
                      case 'unavailable':
                        backgroundColor = 'rgba(107, 114, 128, 0.3)';
                        borderColor = 'var(--gray-500)';
                        break;
                    }
                  }
                } else if (availableCount > 0 || ifNeededCount > 0 || unavailableCount > 0) {
                  // No current user status, but show other users' availability
                  // Prioritize showing the most common status
                  if (availableCount >= ifNeededCount && availableCount >= unavailableCount) {
                    // Green dominant
                    const intensity = Math.min(availableCount / (users.length || 1), 1);
                    backgroundColor = `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`;
                  } else if (ifNeededCount > availableCount && ifNeededCount >= unavailableCount) {
                    // Yellow dominant
                    const intensity = Math.min(ifNeededCount / (users.length || 1), 1);
                    backgroundColor = `rgba(234, 179, 8, ${0.1 + intensity * 0.2})`;
                  } else if (unavailableCount > 0) {
                    // Grey dominant
                    const intensity = Math.min(unavailableCount / (users.length || 1), 1);
                    backgroundColor = `rgba(107, 114, 128, ${0.1 + intensity * 0.2})`;
                  }
                }

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
                    className={`calendar-cell ${!isValid || isLocked ? 'calendar-cell-unavailable' : ''} ${isHoveredUserCell ? 'calendar-cell-user-highlighted' : ''}`}
                    style={{
                      backgroundColor: isHoveredUserCell && hoveredUserStatus
                        ? hoveredUserStatus === 'available'
                          ? 'rgba(34, 197, 94, 0.6)'
                          : hoveredUserStatus === 'if-needed'
                            ? 'rgba(234, 179, 8, 0.6)'
                            : 'rgba(107, 114, 128, 0.6)'
                        : backgroundColor,
                      border: isHoveredUserCell && hoveredUserStatus
                        ? hoveredUserStatus === 'available'
                          ? '2px solid var(--green-500)'
                          : hoveredUserStatus === 'if-needed'
                            ? '2px solid #eab308'
                            : '2px solid var(--gray-500)'
                        : cellStatus
                          ? `2px solid ${borderColor}`
                          : '1px solid var(--gray-200)',
                      cursor: isLocked ? 'not-allowed' : (isValid ? 'pointer' : 'not-allowed'),
                      opacity: isLocked && !cellStatus ? 0.6 : 1,
                      position: 'relative',
                      minHeight: '35px',
                      boxShadow: isHoveredUserCell && hoveredUserStatus
                        ? hoveredUserStatus === 'available'
                          ? '0 0 0 2px rgba(34, 197, 94, 0.3)'
                          : hoveredUserStatus === 'if-needed'
                            ? '0 0 0 2px rgba(234, 179, 8, 0.3)'
                            : '0 0 0 2px rgba(107, 114, 128, 0.3)'
                        : 'none'
                    }}
                  >
                    {/* Show counts */}
                    {(totalAvailable > 0 || totalIfNeeded > 0 || totalUnavailable > 0) && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        display: 'flex',
                        gap: '2px',
                        fontSize: '0.65rem',
                        fontWeight: '600'
                      }}>
                        {totalAvailable > 0 && (
                          <span style={{ color: 'var(--green-500)' }}>
                            {totalAvailable}
                          </span>
                        )}
                        {totalIfNeeded > 0 && (
                          <span style={{ color: '#eab308' }}>
                            {totalIfNeeded}
                          </span>
                        )}
                        {totalUnavailable > 0 && (
                          <span style={{ color: 'var(--gray-500)' }}>
                            {totalUnavailable}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip */}
                    {showTooltip && (
                      <div className={`calendar-cell-tooltip ${showTooltip ? 'visible' : ''}`}>
                        <div className="tooltip-users">
                          {cellStatus && (
                            <div className="tooltip-user">
                              <div className="tooltip-user-dot" style={{
                                backgroundColor: cellStatus === 'available' ? 'var(--green-500)' :
                                  cellStatus === 'if-needed' ? '#eab308' : 'var(--gray-500)'
                              }}></div>
                              <span>
                                You ({cellStatus === 'available' ? '🟢 Available' :
                                  cellStatus === 'if-needed' ? '🟡 If Needed' : '⚫ Unavailable'})
                                {hasExistingData && !isEditMode ? '' : isEditMode ? ' (editing)' : ' (not saved)'}
                              </span>
                            </div>
                          )}
                          {usersInCell.map(avail => (
                            <div key={avail.userName} className="tooltip-user">
                              <div className="tooltip-user-dot" style={{
                                backgroundColor: avail.status === 'available' ? 'var(--green-500)' :
                                  avail.status === 'if-needed' ? '#eab308' : 'var(--gray-500)'
                              }}></div>
                              <span>
                                {avail.userName} ({avail.status === 'available' ? '🟢' :
                                  avail.status === 'if-needed' ? '🟡' : '⚫'})
                              </span>
                            </div>
                          ))}
                        </div>
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
          💡 Select a status above, then click and drag to mark your availability. Hover over cells to see who's available.
        </div>
      )}

      {userName && !isSaving && isEditMode && isEditingExisting && (
        <div className="calendar-instructions" style={{
          background: '#dbeafe',
          borderColor: '#3b82f6',
          color: '#1e40af'
        }}>
          ✏️ You're editing your previous selections. Choose a status and click cells to update, then click "Update Availability" to save.
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