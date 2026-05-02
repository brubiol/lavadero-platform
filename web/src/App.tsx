import React, { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState<string>('unknown')

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then((j) => setStatus(j.status || 'unknown'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded shadow text-center">
        <h1 className="text-2xl font-bold mb-4">Lavadero Platform — Phase 0</h1>
        <p>Backend status: <strong>{status}</strong></p>
      </div>
    </div>
  )
}
