import { useState } from 'react';
import type { Event } from '../types';

interface HomeViewProps {
  events: Event[];
  onCreateClick: () => void;
  onEventSelect: (event: Event) => void;
}

function HomeView({ events, onCreateClick, onEventSelect }: HomeViewProps) {
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
    <div className="home-view">
      <div className="home-header">
        <h2 className="gradient-text home-title">
          Welcome to ComIt
        </h2>
        <p className="home-subtitle">
          Find the perfect time for your group to meet
        </p>
      </div>

      <div className="space-y-6">
        <button onClick={onCreateClick} className="btn btn-primary w-full btn-large">
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
          <button onClick={handleJoinEvent} className="btn btn-secondary w-full">
            Join Event
          </button>
        </div>

        {events.length > 0 && (
          <div className="recent-events">
            <h3 className="recent-events-title">Recent Events</h3>
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

export default HomeView;