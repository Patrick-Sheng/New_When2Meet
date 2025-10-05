import React, { useState } from 'react';
import type { Event, Availability } from '../types';
import { mockAvailabilities } from '../App';

interface EventViewProps {
  event: Event;
  onBack: () => void;
}

function EventView({ event, onBack }: EventViewProps) {
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState(new Set<string>());
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [isEditing, setIsEditing] = useState(false);

  const users = Array.from(new Set(availabilities.map(a => a.userName)));

  const toggleSlot = (slotId: string) => {
    if (!isEditing || !userName) return;

    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    setSelectedSlots(newSelected);
  };

  const handleStartEditing = () => {
    if (!userName) {
      alert('Please enter your name first');
      return;
    }

    const userAvail = availabilities
      .filter(a => a.userName === userName)
      .map(a => a.timeSlotId);
    setSelectedSlots(new Set(userAvail));
    setIsEditing(true);
  };

  const handleSave = () => {
    const filtered = mockAvailabilities.filter(a => a.userName !== userName);

    selectedSlots.forEach(slotId => {
      filtered.push({ userName, timeSlotId: slotId });
    });

    mockAvailabilities.length = 0;
    mockAvailabilities.push(...filtered);
    setAvailabilities([...mockAvailabilities]);
    setIsEditing(false);
    setSelectedSlots(new Set());
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedSlots(new Set());
  };

  const isUserAvailable = (userName: string, slotId: string) => {
    return availabilities.some(a => a.userName === userName && a.timeSlotId === slotId);
  };

  const getSlotCount = (slotId: string) => {
    return availabilities.filter(a => a.timeSlotId === slotId).length;
  };

  const shareableLink = `${window.location.origin}?event=${event.id}`;

  return (
    <div className="event-view-container">
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
            disabled={isEditing}
            className={`input user-input-flex ${isEditing ? 'input-disabled' : ''}`}
          />
          {!isEditing ? (
            <button onClick={handleStartEditing} className="btn btn-primary btn-nowrap">
              Edit Availability
            </button>
          ) : (
            <>
              <button onClick={handleSave} className="btn btn-save">Save</button>
              <button onClick={handleCancel} className="btn btn-cancel">Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="card card-overflow">
        <table className="availability-table">
          <thead>
            <tr>
              <th className="availability-table-header availability-table-header-timeslot">
                Time Slot
              </th>
              {users.map(user => (
                <th key={user} className="availability-table-header availability-table-user">
                  {user}
                </th>
              ))}
              {isEditing && userName && !users.includes(userName) && (
                <th className="availability-table-header availability-table-user availability-table-user-current">
                  {userName} (You)
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {event.timeSlots.map(slot => {
              const count = getSlotCount(slot.id);
              const intensity = Math.min(count / (users.length + 1), 1);

              return (
                <tr key={slot.id}>
                  <td className="availability-table-timeslot">
                    <div className="timeslot-date">
                      {new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="timeslot-time">
                      {slot.startHour.toString().padStart(2, '0')}:00 - {slot.endHour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="timeslot-count">
                      {count} {count === 1 ? 'person' : 'people'}
                    </div>
                  </td>
                  {users.map(user => (
                    <td key={user} className="availability-table-cell">
                      <div
                        className="availability-cell"
                        style={{
                          backgroundColor: isUserAvailable(user, slot.id)
                            ? `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`
                            : 'var(--gray-100)'
                        }}
                      >
                        {isUserAvailable(user, slot.id) ? '✓' : ''}
                      </div>
                    </td>
                  ))}
                  {isEditing && userName && !users.includes(userName) && (
                    <td className="availability-table-cell">
                      <div
                        onClick={() => toggleSlot(slot.id)}
                        className={`availability-cell availability-cell-editable ${selectedSlots.has(slot.id) ? 'availability-cell-selected' : ''}`}
                      >
                        {selectedSlots.has(slot.id) ? '✓' : ''}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventView;