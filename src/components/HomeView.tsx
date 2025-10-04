import { useState } from 'react';
import type { Event } from '../types';

type HomeViewProps = {
  events: Event[];
  onCreateClick: () => void;
  onEventSelect: (event: Event) => void;
};

export function HomeView({ events, onCreateClick, onEventSelect }: HomeViewProps) {
  const [eventId, setEventId] = useState('');

  const handleJoinEvent = () => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      onEventSelect(event);
    } else {
      alert('Event not found!');
    }
  };

  return (
    <div className="text-center max-w-2xl">
      <div className="mb-12">
        <h2 className="gradient-text mb-4" style={{ fontSize: '3rem', fontWeight: '700', lineHeight: '1.2' }}>
          Welcome to When2Meet
        </h2>
        <p style={{ color: 'var(--gray-600)', fontSize: '1.25rem' }}>
          Find the perfect time for your group to meet
        </p>
      </div>

      <div className="space-y-6">
        <button
          onClick={onCreateClick}
          className="btn btn-primary w-full"
          style={{ padding: '1.25rem 2rem', fontSize: '1.125rem' }}
        >
          ✨ Create New Event
        </button>

        <div className="divider">
          <span className="divider-text">or join an existing event</span>
        </div>

        <div className="card">
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Enter event ID"
            className="input mb-4"
          />
          <button
            onClick={handleJoinEvent}
            className="btn btn-secondary w-full"
          >
            Join Event
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-12" style={{ textAlign: 'left' }}>
            <h3 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-800)' }}>
              Recent Events
            </h3>
            <div className="space-y-3">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="event-item w-full"
                >
                  <div className="event-item-title">{event.title}</div>
                  <div className="event-item-id">ID: {event.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}