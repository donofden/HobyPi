import React from 'react'

function apiBase() {
  // When running dev server on 3000, talk to backend on 8000 at same hostname.
  const host = window.location.hostname
  return `http://${host}:8000`
}

export default function App() {
  const [time, setTime] = React.useState(new Date())
  const [temp, setTemp] = React.useState(null)
  const [err, setErr] = React.useState(null)

  React.useEffect(() => {
    const idClock = setInterval(() => setTime(new Date()), 1000)

    async function fetchTemp() {
      try {
        const res = await fetch(`${apiBase()}/api/temp`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setTemp(data.temp_c)
        setErr(null)
      } catch (e) {
        setErr(e.message)
      }
    }
    fetchTemp()
    const idTemp = setInterval(fetchTemp, 2000)

    return () => {
      clearInterval(idClock)
      clearInterval(idTemp)
    }
  }, [])

  return (
    <main style={{fontFamily: 'system-ui, sans-serif', padding: 24, lineHeight: 1.5}}>
      <header style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <img src="HobyPi.png" alt="HobyPi logo" width={80} height={80} />
        <h1 style={{margin: 0}}>HobyPi ⚡</h1>
      </header>

      <ul>
        <li>Time now: <b>{time.toLocaleTimeString()}</b></li>
        <li>CPU Temp: <b>{temp !== null ? `${temp.toFixed(1)} °C` : '...'}</b></li>
      </ul>
      {err && <p style={{color: 'crimson'}}>API error: {err}</p>}
      <p style={{opacity: 0.7}}>Backend at <code>{apiBase()}</code></p>
    </main>
  )
}
