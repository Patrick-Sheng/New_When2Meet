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
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-4xl font-bold mb-4">Welcome to New When2Meet</h2>
      <p className="text-gray-600 mb-12 text-lg">
        Find the best time for your group to meet
      </p>

      <div className="space-y-6">
        <button
          onClick={onCreateClick}
          className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-medium text-lg"
        >
          Create New Event
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-50 text-gray-500">or</span>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Enter event ID"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
          />
          <button
            onClick={handleJoinEvent}
            className="w-full bg-gray-200 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-300 transition font-medium text-lg"
          >
            Join Existing Event
          </button>
        </div>

        {events.length > 0 && (
          <div className="mt-12 text-left">
            <h3 className="text-xl font-semibold mb-4">Recent Events</h3>
            <div className="space-y-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition text-left"
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-500">ID: {event.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}