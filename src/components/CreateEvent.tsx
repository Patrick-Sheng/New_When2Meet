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
    <div className="max-w-2xl">
      <button onClick={onBack} className="btn-back mb-6">
        ← Back to Home
      </button>

      <div className="card-lg">
        <h2 className="mb-8" style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--gray-800)' }}>
          Create New Event
        </h2>

        <div className="space-y-6">
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Team Meeting"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input textarea"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
              Add Dates *
            </label>
            <input
              type="date"
              onChange={(e) => addDate(e.target.value)}
              className="input"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {dates.map(date => (
                <span key={date} className="tag">
                  {new Date(date).toLocaleDateString()}
                  <button
                    onClick={() => removeDate(date)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                Start Time
              </label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="input select"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                End Time
              </label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="input select"
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
            className="btn btn-primary w-full"
            style={{ padding: '1rem 1.5rem', fontSize: '1rem' }}
          >
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}