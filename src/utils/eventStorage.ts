const STORAGE_KEY = 'comit_user_events';

export type StoredEvent = {
  id: string;
  title: string;
  lastVisited: string;
};

export const eventStorage = {
  // Get all events from localStorage
  getEvents(): StoredEvent[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Add or update an event
  addEvent(id: string, title: string) {
    try {
      const events = this.getEvents();
      const existing = events.findIndex(e => e.id === id);

      const newEvent: StoredEvent = {
        id,
        title,
        lastVisited: new Date().toISOString()
      };

      if (existing >= 0) {
        events[existing] = newEvent;
      } else {
        events.unshift(newEvent);
      }

      // Keep only last 10 events
      const limited = events.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Failed to save event to localStorage:', error);
    }
  },

  // Remove an event
  removeEvent(id: string) {
    try {
      const events = this.getEvents().filter(e => e.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to remove event from localStorage:', error);
    }
  },

  // Clear all events
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};