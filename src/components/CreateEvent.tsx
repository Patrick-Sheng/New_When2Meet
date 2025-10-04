import { useState } from 'react';
import type { Event, TimeSlot } from '../types';
import { mockEvents } from '../mockData';

type CreateEventProps = {
  onBack: () => void;
  onEventCreated: (event: Event) => void;
  setEvents: (events: Event[]) => void;
};

export function CreateEvent({ onBack, onEventCreated, setEvents }: CreateEventProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);

  const addDate = (date: string) => {
    if (!dates.includes(date)) {
      setDates([...dates, date]);
    }
  };

  const removeDate = (date: string) => {
    setDates(dates.filter(d => d !== date));
  };

  const handleCreateEvent = () => {
    if (!title || dates.length === 0) {
      alert('Please enter a title and select at least one date');
      return;
    }

    const timeSlots: TimeSlot[] = dates.map(date => ({
      id: `${date}-${startHour}-${endHour}`,
      date,
      startHour,
      endHour
    }));

    const newEvent: Event = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      timeSlots
    };

    mockEvents.push(newEvent);
    setEvents([...mockEvents]);
    onEventCreated(newEvent);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
      >
        ← Back to Home
      </button>

      <h2 className="text-2xl font-semibold mb-6">Create New Event</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Team Meeting"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Optional description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Dates *
          </label>
          <input
            type="date"
            onChange={(e) => addDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {dates.map(date => (
              <span
                key={date}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {new Date(date).toLocaleDateString()}
                <button
                  onClick={() => removeDate(date)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCreateEvent}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Create Event
        </button>
      </div>
    </div>
  );
}