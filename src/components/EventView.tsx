import { useState } from 'react';
import type { Event, Availability } from '../types';
import { mockAvailabilities } from '../mockData';

type EventViewProps = {
  event: Event;
  onBack: () => void;
};

export function EventView({ event, onBack }: EventViewProps) {
  const [userName, setUserName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [availabilities, setAvailabilities] = useState<Availability[]>(mockAvailabilities);
  const [showingUser, setShowingUser] = useState<string | null>(null);

  const toggleSlot = (slotId: string) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    setSelectedSlots(newSelected);
  };

  const handleSubmitAvailability = () => {
    if (!userName) {
      alert('Please enter your name');
      return;
    }

    // Remove old availabilities for this user
    const filtered = mockAvailabilities.filter(a => a.userName !== userName);

    // Add new availabilities
    selectedSlots.forEach(slotId => {
      filtered.push({ userName, timeSlotId: slotId });
    });

    mockAvailabilities.length = 0;
    mockAvailabilities.push(...filtered);
    setAvailabilities([...mockAvailabilities]);
    alert('Availability saved!');
  };

  const getAvailabilityCount = (slotId: string) => {
    return availabilities.filter(a => a.timeSlotId === slotId).length;
  };

  const getUsersForSlot = (slotId: string) => {
    return availabilities
      .filter(a => a.timeSlotId === slotId)
      .map(a => a.userName);
  };

  const shareableLink = `${window.location.origin}?event=${event.id}`;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
      >
        ← Back to Home
      </button>

      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h2 className="text-3xl font-bold mb-2">{event.title}</h2>
        {event.description && (
          <p className="text-gray-600 mb-4">{event.description}</p>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Share this event:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareableLink)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Your Availability</h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2 mb-6">
          {event.timeSlots.map(slot => {
            const count = getAvailabilityCount(slot.id);
            const users = getUsersForSlot(slot.id);
            const isSelected = selectedSlots.has(slot.id);

            return (
              <div key={slot.id} className="relative">
                <button
                  onClick={() => toggleSlot(slot.id)}
                  className={`w-full p-4 rounded-lg border-2 transition text-left ${isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {new Date(slot.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.startHour.toString().padStart(2, '0')}:00 - {slot.endHour.toString().padStart(2, '0')}:00
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {count}
                      </div>
                      <div className="text-xs text-gray-500">
                        {count === 1 ? 'person' : 'people'}
                      </div>
                    </div>
                  </div>
                  {count > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowingUser(showingUser === slot.id ? null : slot.id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {showingUser === slot.id ? 'Hide' : 'Show'} names
                      </button>
                      {showingUser === slot.id && (
                        <div className="mt-2 text-xs">
                          {users.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmitAvailability}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Submit Availability
        </button>
      </div>
    </div>
  );
}