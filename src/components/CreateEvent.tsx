import { useState, useRef } from 'react';
import type { Event, TimeSlot } from '../types';
import { eventApi } from '../supabaseClient';

interface CreateEventProps {
  onBack: () => void;
  onEventCreated: (event: Event) => void;
}

function CreateEvent({ onBack, onEventCreated }: CreateEventProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const draggedDatesRef = useRef(new Set<string>());

  const generateCalendarMonths = () => {
    const today = new Date();
    const months = [];

    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay();

      const monthKey = `${year}-${month}`;
      const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const dates: (Date | null)[] = [];

      for (let i = 0; i < startDayOfWeek; i++) {
        dates.push(null);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(new Date(year, month, day));
      }

      months.push({ monthKey, monthName, dates });
    }

    return months;
  };

  const calendarMonths = generateCalendarMonths();

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleMouseDown = (dateStr: string) => {
    setIsDragging(true);
    draggedDatesRef.current = new Set([dateStr]);

    if (selectedDates.includes(dateStr)) {
      setDragMode('deselect');
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    } else {
      setDragMode('select');
      setSelectedDates(prev => [...prev, dateStr]);
    }
  };

  const handleMouseEnter = (dateStr: string) => {
    if (!isDragging || !dragMode) return;
    if (draggedDatesRef.current.has(dateStr)) return;

    draggedDatesRef.current.add(dateStr);

    if (dragMode === 'select') {
      setSelectedDates(prev => {
        if (!prev.includes(dateStr)) {
          return [...prev, dateStr];
        }
        return prev;
      });
    } else {
      setSelectedDates(prev => prev.filter(d => d !== dateStr));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
    draggedDatesRef.current.clear();
  };

  const removeDate = (date: string) => {
    setSelectedDates(selectedDates.filter(d => d !== date));
  };

  const handleCreateEvent = async () => {
    if (!title || selectedDates.length === 0) {
      alert('Please enter a title and select at least one date');
      return;
    }

    if (startHour >= endHour) {
      alert('End time must be after start time');
      return;
    }

    setIsCreating(true);

    try {
      // Prepare time slots for database
      const timeSlotsData = selectedDates.map(date => ({
        date,
        startHour: startHour,
        endHour: endHour
      }));

      // Create event in Supabase
      const { event, timeSlots } = await eventApi.createEvent(
        title,
        description,
        timeSlotsData
      );

      // Convert database timestamps to frontend format
      const newEvent: Event = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        timeSlots: timeSlots.map((slot): TimeSlot => {
          const startDate = new Date(slot.start_time);
          const endDate = new Date(slot.end_time);

          return {
            id: slot.id,
            date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
            startHour: startDate.getHours(),
            endHour: endDate.getHours()
          };
        })
      };

      onEventCreated(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-event-container" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <button onClick={onBack} className="btn-back mb-6">
        ← Back to Home
      </button>

      <div className="card-lg">
        <h2 className="create-event-title">Create New Event</h2>

        <div className="space-y-6">
          <div>
            <label className="form-label">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Team Meeting"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input textarea"
              placeholder="Optional description..."
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="form-label form-label-spaced">
              Select Dates * (Click and drag to select multiple)
            </label>

            <div className="calendar-container">
              {calendarMonths.map(({ monthKey, monthName, dates }) => (
                <div key={monthKey} className="calendar-month">
                  <h3 className="calendar-month-title">{monthName}</h3>

                  <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}

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
                          onMouseDown={() => !isPast && !isCreating && handleMouseDown(dateStr)}
                          onMouseEnter={() => !isPast && !isCreating && handleMouseEnter(dateStr)}
                          style={{ cursor: isCreating ? 'not-allowed' : undefined }}
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
              <div className="selected-dates-container">
                <p className="selected-dates-label">
                  Selected Dates ({selectedDates.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.sort().map(date => (
                    <span key={date} className="tag">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <button
                        onClick={() => !isCreating && removeDate(date)}
                        className="tag-remove"
                        disabled={isCreating}
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
              <label className="form-label">Start Time</label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="input select"
                disabled={isCreating}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">End Time</label>
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="input select"
                disabled={isCreating}
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
            className="btn btn-primary w-full btn-large-text"
            disabled={isCreating}
            style={{ opacity: isCreating ? 0.6 : 1 }}
          >
            {isCreating ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;