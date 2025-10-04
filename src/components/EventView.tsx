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
  const [showingUser, setShowingUser] = useState<string | null>(null);

  const toggleSlot = (slotId: string) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    setSelectedSlots(newSelected);
  };

  const handleSubmitAvailability = () => {
    if (!userName) {
      alert('Please enter your name');
      return;
    }

    // Remove old availabilities for this user
    const filtered = mockAvailabilities.filter(a => a.userName !== userName);

    // Add new availabilities
    selectedSlots.forEach(slotId => {
      filtered.push({ userName, timeSlotId: slotId });
    });

    mockAvailabilities.length = 0;
    mockAvailabilities.push(...filtered);
    setAvailabilities([...mockAvailabilities]);
    alert('Availability saved!');
  };

  const getAvailabilityCount = (slotId: string) => {
    return availabilities.filter(a => a.timeSlotId === slotId).length;
  };

  const getUsersForSlot = (slotId: string) => {
    return availabilities
      .filter(a => a.timeSlotId === slotId)
      .map(a => a.userName);
  };

  const shareableLink = `${window.location.origin}?event=${event.id}`;

  return (
    <div className="max-w-4xl">
      <button onClick={onBack} className="btn-back mb-6">
        ← Back to Home
      </button>

      <div className="card mb-6">
        <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--gray-900)' }}>
          {event.title}
        </h2>
        {event.description && (
          <p className="mb-4" style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
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

      <div className="card">
        <h3 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--gray-900)' }}>
          Your Availability
        </h3>

        <div className="mb-6">
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="input"
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2 mb-6">
          {event.timeSlots.map(slot => {
            const count = getAvailabilityCount(slot.id);
            const users = getUsersForSlot(slot.id);
            const isSelected = selectedSlots.has(slot.id);

            return (
              <div key={slot.id}>
                <button
                  onClick={() => toggleSlot(slot.id)}
                  className={`time-slot w-full ${isSelected ? 'selected' : ''}`}
                  style={{ display: 'block' }}
                >
                  <div className="flex justify-between items-center">
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '1.125rem', color: 'var(--gray-900)' }}>
                        {new Date(slot.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                        {slot.startHour.toString().padStart(2, '0')}:00 - {slot.endHour.toString().padStart(2, '0')}:00
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="time-slot-count">
                        {count}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                        {count === 1 ? 'person' : 'people'}
                      </div>
                    </div>
                  </div>
                  {count > 0 && (
                    <div className="mt-2" style={{ fontSize: '0.875rem', color: 'var(--gray-600)', textAlign: 'left' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowingUser(showingUser === slot.id ? null : slot.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-blue)',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: '500'
                        }}
                      >
                        {showingUser === slot.id ? 'Hide' : 'Show'} names
                      </button>
                      {showingUser === slot.id && (
                        <div className="mt-2" style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                          {users.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmitAvailability}
          className="btn btn-primary w-full"
          style={{ padding: '1rem 1.5rem', fontSize: '1rem' }}
        >
          Submit Availability
        </button>
      </div>
    </div>
  );
}