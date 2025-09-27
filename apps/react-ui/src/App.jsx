import React from 'react'

function apiBase() {
  // When running dev server on 3000, talk to backend on 8000 at same hostname.
  const host = window.location.hostname
  return `http://${host}:8000`
}

export default function App() {
  const [time, setTime] = React.useState(new Date())
  const [metrics, setMetrics] = React.useState(null)
  const [err, setErr] = React.useState(null)

  React.useEffect(() => {
    const idClock = setInterval(() => setTime(new Date()), 1000)

    async function fetchMetrics() {
      try {
        const res = await fetch(`${apiBase()}/system/metrics?sample_ms=200&top_n=5`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setMetrics(data)
        setErr(null)
      } catch (e) {
        setErr(e.message)
      }
    }
    fetchMetrics()
    const id = setInterval(fetchMetrics, 2000)

    return () => {
      clearInterval(idClock)
      clearInterval(id)
    }
  }, [])

  const temp = metrics?.temperature_c ?? null
  const cpuPerCore = metrics?.cpu?.per_core ?? []
  const cpuAvg = metrics?.cpu?.avg ?? null
  const mem = metrics?.memory
  const disk = metrics?.disk_root
  const load = metrics?.load
  const uptimeH = metrics?.human?.uptime_h

  return (
    <main style={{fontFamily: 'system-ui, sans-serif', padding: 24, lineHeight: 1.5, maxWidth: 720}}>
      <header style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
        <img src="/HobyPi.png" alt="HobyPi logo" width={40} height={40} />
        <h1 style={{margin: 0}}>HobyPi ⚡</h1>
      </header>

      <ul>
        <li>Time now: <b>{time.toLocaleTimeString()}</b></li>
        <li>CPU Temp: <b>{temp !== null ? `${temp.toFixed(1)} °C` : '...'}</b></li>
        <li>CPU Avg: <b>{cpuAvg !== null ? `${cpuAvg.toFixed(1)} %` : '...'}</b></li>
        <li>Uptime: <b>{uptimeH ? `${uptimeH} h` : '...'}</b></li>
      </ul>

      <section style={{marginTop: 12}}>
        <h3 style={{margin: '12px 0 6px'}}>CPU per core</h3>
        <div style={{display: 'grid', gap: 6}}>
          {cpuPerCore.map((v, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <div style={{width: 60, textAlign: 'right'}}>Core {i}:</div>
              <div style={{flex: 1, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden', height: 10}}>
                <div style={{width: `${Math.min(100, Math.max(0, v))}%`, height: 10, background: '#60a5fa'}} />
              </div>
              <div style={{width: 56, textAlign: 'right'}}>{v.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{marginTop: 12}}>
        <h3 style={{margin: '12px 0 6px'}}>Memory / Disk / Load</h3>
        <ul>
          {mem && (
            <li>
              Memory: <b>{metrics.human.mem_used}</b> / {metrics.human.mem_total} ({mem.percent}%)
            </li>
          )}
          {disk && (
            <li>
              Disk /: <b>{metrics.human.disk_used}</b> / {metrics.human.disk_total} ({disk.percent}%)
            </li>
          )}
          {load && (
            <li>
              Load avg: <b>{load["1"].toFixed(2)}</b>, {load["5"].toFixed(2)}, {load["15"].toFixed(2)}
            </li>
          )}
        </ul>
      </section>

      <section style={{marginTop: 12}}>
        <h3 style={{margin: '12px 0 6px'}}>Throttle status</h3>
        {metrics?.throttled?.hex ? (
          <code>{metrics.throttled.hex}</code>
        ) : (
          <span style={{opacity: 0.7}}>n/a</span>
        )}
      </section>

      {err && <p style={{color: 'crimson', marginTop: 12}}>API error: {err}</p>}

      <p style={{opacity: 0.7, marginTop: 12}}>Backend at <code>{apiBase()}</code></p>
    </main>
  )
}
