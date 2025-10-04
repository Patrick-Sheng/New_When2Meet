import { useState } from 'react';
import type { Event, Availability } from '../types';
import { mockAvailabilities } from '../mockData';

type EventViewProps = {
  event: Event;
  onBack: () => void;
};

export function EventView({ event, onBack }: EventViewProps) {
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [isEditing, setIsEditing] = useState(false);

  // Get unique users
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

    // Load existing availability for this user
    const userAvail = availabilities
      .filter(a => a.userName === userName)
      .map(a => a.timeSlotId);
    setSelectedSlots(new Set(userAvail));
    setIsEditing(true);
  };

  const handleSave = () => {
    // Remove old availabilities for this user
    const filtered = mockAvailabilities.filter(a => a.userName !== userName);

    // Add new availabilities
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
    <div className="max-w-7xl">
      <button onClick={onBack} className="btn-back mb-6">
        ← Back to Home
      </button>

      {/* Header */}
      <div className="card mb-6">
        <h2 className="mb-2" style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--gray-900)' }}>
          {event.title}
        </h2>
        {event.description && (
          <p className="mb-4" style={{ color: 'var(--gray-600)', fontSize: '1rem' }}>
            {event.description}
          </p>
        )}

        <div className="share-box">
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
            Share this event:
          </p>
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

      {/* User Input Section */}
      <div className="card mb-6">
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--gray-700)',
          marginBottom: '0.5rem'
        }}>
          Your Name
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            disabled={isEditing}
            className="input"
            style={{
              flex: 1,
              backgroundColor: isEditing ? 'var(--gray-100)' : 'white'
            }}
          />
          {!isEditing ? (
            <button
              onClick={handleStartEditing}
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              Edit Availability
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="btn"
                style={{
                  backgroundColor: 'var(--green-500)',
                  color: 'white'
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="btn"
                style={{
                  backgroundColor: 'var(--gray-600)',
                  color: 'white'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid View */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="availability-table">
          <thead>
            <tr>
              <th className="availability-table-header" style={{ minWidth: '180px' }}>
                Time Slot
              </th>
              {users.map(user => (
                <th key={user} className="availability-table-header availability-table-user">
                  {user}
                </th>
              ))}
              {isEditing && userName && !users.includes(userName) && (
                <th className="availability-table-header availability-table-user" style={{ color: 'var(--primary-blue)' }}>
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
                    <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                      {new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.75rem' }}>
                      {slot.startHour.toString().padStart(2, '0')}:00 - {slot.endHour.toString().padStart(2, '0')}:00
                    </div>
                    <div style={{
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: 'var(--primary-purple)',
                      fontWeight: '600'
                    }}>
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
                        className="availability-cell availability-cell-editable"
                        style={{
                          backgroundColor: selectedSlots.has(slot.id)
                            ? 'var(--green-500)'
                            : 'var(--gray-100)',
                          borderColor: selectedSlots.has(slot.id) ? '#16a34a' : 'var(--gray-300)'
                        }}
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