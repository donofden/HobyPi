import React, { useState } from 'react';
import './home.css';

const initialRooms = [
  {
    id: "living-room",
    name: "Living Room",
    temperature: 22.5,
    humidity: 45,
    lights: { main: true, brightness: 75 },
    fan: false,
    status: "online",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    temperature: 20.8,
    humidity: 42,
    lights: { main: false, brightness: 50 },
    fan: true,
    status: "online",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    temperature: 24.2,
    humidity: 55,
    lights: { main: true, brightness: 90 },
    fan: false,
    status: "online",
  },
  {
    id: "office",
    name: "Office",
    temperature: 21.5,
    humidity: 40,
    lights: { main: true, brightness: 85 },
    fan: false,
    status: "offline",
  },
];

export default function HomeControlPanel({ onBack }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [tab, setTab] = useState('rooms');

  const handleLightToggle = (roomId) => {
    setRooms(
      rooms.map((room) =>
        room.id === roomId ? { ...room, lights: { ...room.lights, main: !room.lights.main } } : room,
      ),
    );
  };

  const handleBrightnessChange = (roomId, brightness) => {
    setRooms(
      rooms.map((room) =>
        room.id === roomId ? { ...room, lights: { ...room.lights, brightness } } : room,
      ),
    );
  };

  const handleFanToggle = (roomId) => {
    setRooms(rooms.map((room) => (room.id === roomId ? { ...room, fan: !room.fan } : room)));
  };

  return (
    <div className="home-bg">
      <header className="home-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="home-back" onClick={onBack}>Back</button>}
          <span className="home-title">Home Control Panel</span>
        </div>
      </header>
      <main className="home-main">
        <div className="home-tabs">
          <button className={tab === 'rooms' ? 'active' : ''} onClick={() => setTab('rooms')}>Room Control</button>
          <button className={tab === 'scenes' ? 'active' : ''} onClick={() => setTab('scenes')}>Scenes</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
        </div>
        {tab === 'rooms' && (
          <div className="home-rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className={`home-room-card ${room.status}`}> 
                <div className="home-room-header">
                  <span className="home-room-title">{room.name}</span>
                  <span className={`home-room-status ${room.status}`}>{room.status}</span>
                </div>
                <div className="home-room-env">
                  <span>Temp: {room.temperature}°C</span>
                  <span>Humidity: {room.humidity}%</span>
                </div>
                <div className="home-room-controls">
                  <div className="home-light-control">
                    <span>Main Light</span>
                    <input type="checkbox" checked={room.lights.main} onChange={() => handleLightToggle(room.id)} disabled={room.status === 'offline'} />
                  </div>
                  {room.lights.main && (
                    <div className="home-brightness-control">
                      <span>Brightness</span>
                      <input type="range" min="0" max="100" value={room.lights.brightness} onChange={e => handleBrightnessChange(room.id, Number(e.target.value))} disabled={room.status === 'offline'} />
                      <span>{room.lights.brightness}%</span>
                    </div>
                  )}
                  <div className="home-fan-control">
                    <span>Fan</span>
                    <input type="checkbox" checked={room.fan} onChange={() => handleFanToggle(room.id)} disabled={room.status === 'offline'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'scenes' && (
          <div className="home-scenes-grid">
            {[
              { name: "Good Morning", description: "Turn on all lights at 70% brightness" },
              { name: "Movie Time", description: "Dim living room lights to 20%" },
              { name: "Sleep Mode", description: "Turn off all lights and fans" },
              { name: "Away Mode", description: "Turn off all devices" },
              { name: "Work Mode", description: "Optimize office lighting" },
              { name: "Party Mode", description: "Full brightness in common areas" },
            ].map((scene, idx) => (
              <div key={idx} className="home-scene-card">
                <span className="home-scene-title">{scene.name}</span>
                <span className="home-scene-desc">{scene.description}</span>
                <button className="home-scene-btn">Activate Scene</button>
              </div>
            ))}
          </div>
        )}
        {tab === 'settings' && (
          <div className="home-settings-grid">
            <div className="home-setting-card">
              <span className="home-setting-title">Auto-brightness</span>
              <span className="home-setting-desc">Adjust lights based on time of day</span>
              <input type="checkbox" />
            </div>
            <div className="home-setting-card">
              <span className="home-setting-title">Motion detection</span>
              <span className="home-setting-desc">Turn on lights when motion detected</span>
              <input type="checkbox" />
            </div>
            <div className="home-setting-card">
              <span className="home-setting-title">Energy saving mode</span>
              <span className="home-setting-desc">Automatically turn off unused devices</span>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="home-setting-card">
              <span className="home-setting-title">Temperature alerts</span>
              <span className="home-setting-desc">Get notified of temperature changes</span>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
