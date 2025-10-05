import React, { useState, useEffect } from 'react';
import HomeView from './components/HomeView';
import CreateEvent from './components/CreateEvent';
import EventView from './components/EventView';
import type { Event } from './types';
import { eventApi } from './supabaseClient';

function App() {
  const [view, setView] = useState('home');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    if (eventId) {
      loadEvent(eventId);
    } else {
      loadRecentEvents();
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

      setCurrentEvent(loadedEvent);
      setView('event');
    } catch (error) {
      console.error('Error loading event:', error);
      alert('Event not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    try {
      setIsLoading(true);
      const data = await eventApi.getAllEvents(10);

      const loadedEvents: Event[] = data.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        timeSlots: (item.time_slots || []).map((slot: any) => {
          const startDate = new Date(slot.start_time);
          const endDate = new Date(slot.end_time);

          return {
            id: slot.id,
            date: startDate.toISOString().split('T')[0],
            startHour: startDate.getHours(),
            endHour: endDate.getHours()
          };
        })
      }));

      setEvents(loadedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => setView('create');

  const handleEventCreated = (event: Event) => {
    setCurrentEvent(event);
    setEvents(prev => [event, ...prev]);
    setView('event');
  };

  const handleEventSelect = (event: Event) => {
    setCurrentEvent(event);
    setView('event');
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentEvent(null);
    // Update URL to remove event parameter
    window.history.pushState({}, '', window.location.pathname);
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
            events={events}
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