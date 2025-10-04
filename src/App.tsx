import { useState } from 'react'

function App() {
  const [view, setView] = useState<'home' | 'create' | 'event'>('home')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">When2Meet Clone</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'home' && (
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Welcome!</h2>
            <p className="text-gray-600 mb-8">
              Find the best time for your group to meet
            </p>
            <div className="space-x-4">
              <button
                onClick={() => setView('create')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Create New Event
              </button>
              <button className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition">
                Join Existing Event
              </button>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-6">Create New Event</h2>
            <p className="text-gray-600">Event creation form coming soon...</p>
            <button
              onClick={() => setView('home')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </button>
          </div>
        )}

        {view === 'event' && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-6">Event View</h2>
            <p className="text-gray-600">Event details coming soon...</p>
            <button
              onClick={() => setView('home')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to Home
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App