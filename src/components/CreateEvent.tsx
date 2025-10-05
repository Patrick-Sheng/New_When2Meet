import { useState, useRef } from 'react';
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const draggedDatesRef = useRef<Set<string>>(new Set());

  // Generate calendar months (3 months from today)
  const generateCalendarMonths = () => {
    const today = new Date();
    const months: { monthKey: string; monthName: string; dates: (Date | null)[] }[] = [];

    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // Get first day of month and last day of month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

      const monthKey = `${year}-${month}`;
      const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const dates: (Date | null)[] = [];

      // Add empty cells for days before month starts
      for (let i = 0; i < startDayOfWeek; i++) {
        dates.push(null);
      }

      // Add all days in the month
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month, day));
      }

      months.push({ monthKey, monthName, dates });
    }

    return months;
  };

  const calendarMonths = generateCalendarMonths();

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleMouseDown = (dateStr: string) => {
    setIsDragging(true);
    setDragStartDate(dateStr);
    draggedDatesRef.current = new Set([dateStr]);

    // Determine the mode based on current state of the first clicked date
    if (selectedDates.includes(dateStr)) {
      // First date is selected, so we're deselecting
      setDragMode('deselect');
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    } else {
      // First date is not selected, so we're selecting
      setDragMode('select');
      setSelectedDates(prev => [...prev, dateStr]);
    }
  };

  const handleMouseEnter = (dateStr: string) => {
    if (!isDragging || !dragMode) return;

    // Avoid re-processing the same date
    if (draggedDatesRef.current.has(dateStr)) return;

    draggedDatesRef.current.add(dateStr);

    if (dragMode === 'select') {
      // Add the date if not already selected
      setSelectedDates(prev => {
        if (!prev.includes(dateStr)) {
          return [...prev, dateStr];
        }
        return prev;
      });
    } else {
      // Remove the date if selected
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartDate(null);
    setDragMode(null);
    draggedDatesRef.current.clear();
  };

  const removeDate = (date: string) => {
    setSelectedDates(selectedDates.filter(d => d !== date));
  };

  const handleCreateEvent = () => {
    if (!title || selectedDates.length === 0) {
      alert('Please enter a title and select at least one date');
      return;
    }

    const timeSlots: TimeSlot[] = selectedDates.map(date => ({
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
    <div className="max-w-5xl" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
              Select Dates * (Click and drag to select multiple)
            </label>

            <div className="calendar-container">
              {calendarMonths.map(({ monthKey, monthName, dates }) => (
                <div key={monthKey} className="calendar-month">
                  <h3 className="calendar-month-title">{monthName}</h3>

                  <div className="calendar-grid">
                    {/* Weekday headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}

                    {/* Date cells (including empty cells at start) */}
                    {dates.map((date, index) => {
                      if (date === null) {
                        return <div key={`empty-${index}`} className="calendar-day-empty"></div>;
                      }

                      const dateStr = formatDateString(date);
                      const isSelected = selectedDates.includes(dateStr);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isToday = date.getTime() === today.getTime();
                      const isPast = date < today;

                      return (
                        <div
                          key={dateStr}
                          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                          onMouseDown={() => !isPast && handleMouseDown(dateStr)}
                          onMouseEnter={() => !isPast && handleMouseEnter(dateStr)}
                          style={{
                            userSelect: 'none',
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            opacity: isPast ? 0.4 : 1
                          }}
                        >
                          {date.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedDates.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>
                  Selected Dates ({selectedDates.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.sort().map(date => (
                    <span key={date} className="tag">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            )}
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