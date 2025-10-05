import React, { useState } from 'react';
import HomeView from './components/HomeView';
import CreateEvent from './components/CreateEvent';
import EventView from './components/EventView';
import type { Event } from './types';

// Mock data
export const mockEvents: Event[] = [];
export const mockAvailabilities: any[] = [];

function App() {
  const [view, setView] = useState('home');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>(mockEvents);

  const handleCreateClick = () => setView('create');

  const handleEventCreated = (event: Event) => {
    setCurrentEvent(event);
    setView('event');
  };

  const handleEventSelect = (event: Event) => {
    setCurrentEvent(event);
    setView('event');
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentEvent(null);
  };

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
            setEvents={setEvents}
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