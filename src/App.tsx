import React, { useState, useEffect } from 'react';
import HomeView from './components/HomeView';
import CreateEvent from './components/CreateEvent';
import EventView from './components/EventView';
import type { Event } from './types';
import { eventApi } from './supabaseClient';
import { eventStorage, type StoredEvent } from './utils/eventStorage';

function App() {
  const [view, setView] = useState('home');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [recentEvents, setRecentEvents] = useState<StoredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    if (eventId) {
      loadEvent(eventId);
    } else {
      // Load from localStorage instead of database
      setRecentEvents(eventStorage.getEvents());
      setIsLoading(false);
    }
  }, []);

  const loadEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      const { event, timeSlots } = await eventApi.getEvent(eventId);

      const loadedEvent: Event = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        timeSlots: timeSlots.map(slot => {
          const startDate = new Date(slot.start_time);
          const endDate = new Date(slot.end_time);

          return {
            id: slot.id,
            date: startDate.toISOString().split('T')[0],
            startHour: startDate.getHours(),
            endHour: endDate.getHours()
          };
        })
      };

      // Save to localStorage
      eventStorage.addEvent(loadedEvent.id, loadedEvent.title);
      setRecentEvents(eventStorage.getEvents());

      setCurrentEvent(loadedEvent);
      setView('event');
    } catch (error) {
      console.error('Error loading event:', error);
      alert('Event not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => setView('create');

  const handleEventCreated = (event: Event) => {
    setCurrentEvent(event);

    // Save to localStorage
    eventStorage.addEvent(event.id, event.title);
    setRecentEvents(eventStorage.getEvents());

    setView('event');
  };

  const handleEventSelect = async (storedEvent: StoredEvent) => {
    await loadEvent(storedEvent.id);
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentEvent(null);
    // Update URL to remove event parameter
    window.history.pushState({}, '', window.location.pathname);
    // Refresh recent events from localStorage
    setRecentEvents(eventStorage.getEvents());
  };

  if (isLoading && view === 'home') {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-content">
            <h1>ComIt</h1>
          </div>
        </header>
        <main className="app-main">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--gray-600)' }}>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-content">
          <h1>ComIt</h1>
        </div>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <HomeView
            recentEvents={recentEvents}
            onCreateClick={handleCreateClick}
            onEventSelect={handleEventSelect}
          />
        )}

        {view === 'create' && (
          <CreateEvent
            onBack={handleBackToHome}
            onEventCreated={handleEventCreated}
          />
        )}

        {view === 'event' && currentEvent && (
          <EventView event={currentEvent} onBack={handleBackToHome} />
        )}
      </main>
    </div>
  );
}

export default App;