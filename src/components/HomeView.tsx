import React, { useState } from 'react';
import type { StoredEvent } from '../utils/eventStorage';

interface HomeViewProps {
  recentEvents: StoredEvent[];
  onCreateClick: () => void;
  onEventSelect: (event: StoredEvent) => void;
}

function HomeView({ recentEvents, onCreateClick, onEventSelect }: HomeViewProps) {
  const [eventId, setEventId] = useState('');

  const handleJoinEvent = () => {
    // When joining by ID, we need to create a minimal StoredEvent
    // The actual event data will be loaded by App.tsx
    if (eventId.trim()) {
      onEventSelect({ id: eventId.trim(), title: '', lastVisited: '' });
    } else {
      alert('Please enter an event ID');
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

        {recentEvents.length > 0 && (
          <div className="recent-events">
            <h3 className="recent-events-title">Your Recent Events</h3>
            <div className="space-y-3">
              {recentEvents.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="event-item w-full"
                >
                  <div className="event-item-title">{event.title}</div>
                  <div className="event-item-id">
                    Last visited: {new Date(event.lastVisited).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </button>
              ))}

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all recent events?')) {
                    localStorage.removeItem('comit_user_events');
                    window.location.reload(); // simplest way to refresh the list
                  }
                }}
                className="btn btn-danger w-full mt-4"
              >
                🗑️ Clear All Recent Events
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeView;