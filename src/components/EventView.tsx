import React, { useState, useRef, useEffect } from 'react';
import type { Event, Availability } from '../types';
import { availabilityApi } from '../supabaseClient';

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
  const draggedCellsRef = useRef(new Set<string>());

  // Load availability on mount
  useEffect(() => {
    loadAvailability();
  }, [event.id]);

  const loadAvailability = async () => {
    try {
      setIsLoading(true);
      const data = await availabilityApi.getEventAvailability(event.id);

      const loadedAvailability: Availability[] = data.map(item => ({
        userName: item.user_name,
        timeSlotId: item.time_slot_id
      }));

      setAvailabilities(loadedAvailability);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique dates from time slots
  const dates = Array.from(new Set(event.timeSlots.map(s => s.date))).sort();

  // Get hour range from all time slots and create 15-min intervals
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

  // Check if a cell is within a valid time slot
  const isValidCell = (date: string, hour: number, minute: number) => {
    return event.timeSlots.some(slot => {
      if (slot.date !== date) return false;
      const cellTime = hour + minute / 60;
      return cellTime >= slot.startHour && cellTime < slot.endHour;
    });
  };

  // Get users available for a specific cell
  const getUsersForCell = (date: string, hour: number, minute: number) => {
    return availabilities.filter(a => {
      const slot = event.timeSlots.find(s => s.id === a.timeSlotId);
      if (!slot || slot.date !== date) return false;
      const cellTime = hour + minute / 60;
      return cellTime >= slot.startHour && cellTime < slot.endHour;
    }).map(a => a.userName);
  };

  const handleMouseDown = (date: string, hour: number, minute: number) => {
    if (!userName) {
      alert('Please enter your name first');
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
    if (!isDragging || !dragMode || !isValidCell(date, hour, minute)) return;

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
      // Get unique time slot IDs from selected cells
      const timeSlotIds = new Set<string>();

      selectedCells.forEach(cellId => {
        const parts = cellId.split('-');
        const date = parts.slice(0, 3).join('-');
        const hour = parseInt(parts[3]);
        const minute = parseInt(parts[4]);
        const cellTime = hour + minute / 60;

        const slot = event.timeSlots.find(s =>
          s.date === date && cellTime >= s.startHour && cellTime < s.endHour
        );

        if (slot) {
          timeSlotIds.add(slot.id);
        }
      });

      // Save to Supabase
      await availabilityApi.saveAvailability(
        event.id,
        userName,
        Array.from(timeSlotIds)
      );

      // Reload availability
      await loadAvailability();

      setSelectedCells(new Set());
      alert(`Saved availability for ${userName}!`);
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          <button
            onClick={handleSave}
            disabled={!userName || selectedCells.size === 0 || isSaving}
            className="btn btn-save btn-nowrap"
            style={{
              opacity: !userName || selectedCells.size === 0 || isSaving ? 0.5 : 1,
              cursor: !userName || selectedCells.size === 0 || isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>

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
                const intensity = Math.min(usersInCell.length / (users.length || 1), 1);
                const isLocked = !userName || isSaving;

                return (
                  <div
                    key={cellId}
                    onMouseDown={() => !isLocked && handleMouseDown(date, hour, minute)}
                    onMouseEnter={() => !isLocked && handleMouseEnter(date, hour, minute)}
                    className={`calendar-cell ${isSelected ? 'calendar-cell-selected' : ''} ${!isValid || isLocked ? 'calendar-cell-unavailable' : ''}`}
                    style={{
                      backgroundColor: !isSelected && usersInCell.length > 0
                        ? `rgba(147, 51, 234, ${0.1 + intensity * 0.3})`
                        : undefined,
                      cursor: isLocked ? 'not-allowed' : (isValid ? 'pointer' : 'not-allowed'),
                      opacity: isLocked ? 0.6 : 1
                    }}
                  >
                    {usersInCell.length > 0 && !isSelected && (
                      <div className="calendar-cell-availability">
                        {usersInCell.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {!userName && (
        <div className="calendar-instructions" style={{
          background: '#fef3c7',
          borderColor: '#fbbf24',
          color: '#92400e'
        }}>
          ⚠️ Please enter your name above to select your availability
        </div>
      )}

      {userName && !isSaving && (
        <div className="calendar-instructions">
          💡 Click and drag to select your available times
        </div>
      )}

      {users.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
            Participants ({users.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {users.map(user => (
              <span key={user} className="tag">
                {user}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventView;