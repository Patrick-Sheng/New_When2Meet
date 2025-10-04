import { useState } from 'react';
import type { Event } from './types';
import { mockEvents } from './mockData';
import { HomeView } from './components/HomeView';
import { CreateEvent } from './components/CreateEvent';
import { EventView } from './components/EventView';

function App() {
  const [view, setView] = useState<'home' | 'create' | 'event'>('home');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>(mockEvents);

  const handleCreateClick = () => {
    setView('create');
  };

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">When2Meet Clone</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
          <EventView
            event={currentEvent}
            onBack={handleBackToHome}
          />
        )}
      </main>
    </div>
  );
}

export default App;