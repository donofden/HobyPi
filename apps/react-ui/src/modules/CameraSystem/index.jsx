import React, { useState } from 'react';
import './camera.css';

const initialCameras = [
  {
    id: 'cam-001',
    name: 'Front Door Camera',
    location: 'Main Entrance',
    status: 'online',
    resolution: '1920x1080',
    fps: 30,
    isRecording: true,
    hasAudio: true,
    audioEnabled: true,
    nightVision: true,
    motionDetection: true,
    lastSeen: '2024-12-27 19:39:45',
    storageUsed: 15.2,
    streamUrl: '/front-door-security-camera-view.jpg',
  },
  {
    id: 'cam-002',
    name: 'Living Room Camera',
    location: 'Living Room',
    status: 'online',
    resolution: '1920x1080',
    fps: 24,
    isRecording: false,
    hasAudio: true,
    audioEnabled: false,
    nightVision: false,
    motionDetection: true,
    lastSeen: '2024-12-27 19:39:42',
    storageUsed: 8.7,
    streamUrl: '/living-room-interior-camera-view.jpg',
  },
  {
    id: 'cam-003',
    name: 'Backyard Camera',
    location: 'Garden',
    status: 'recording',
    resolution: '1280x720',
    fps: 30,
    isRecording: true,
    hasAudio: false,
    audioEnabled: false,
    nightVision: true,
    motionDetection: true,
    lastSeen: '2024-12-27 19:39:40',
    storageUsed: 12.4,
    streamUrl: '/backyard-garden-security-camera-view.jpg',
  },
  {
    id: 'cam-004',
    name: 'Garage Camera',
    location: 'Garage',
    status: 'offline',
    resolution: '1920x1080',
    fps: 30,
    isRecording: false,
    hasAudio: false,
    audioEnabled: false,
    nightVision: true,
    motionDetection: false,
    lastSeen: '2024-12-27 18:45:12',
    storageUsed: 5.1,
    streamUrl: '/garage-security-camera-offline.jpg',
  },
];

export default function CameraSystem({ onBack }) {
  const [cameras, setCameras] = useState(initialCameras);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const onlineCameras = cameras.filter((cam) => cam.status !== 'offline').length;
  const recordingCameras = cameras.filter((cam) => cam.isRecording).length;
  const totalStorage = cameras.reduce((sum, cam) => sum + cam.storageUsed, 0);

  return (
    <div className="camera-bg">
      <header className="camera-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="camera-back" onClick={onBack}>Back</button>}
          <span className="camera-title">Camera System</span>
        </div>
      </header>
      <main className="camera-main">
        <div className="camera-stats">
          <div className="camera-stat">Total Cameras: {cameras.length}</div>
          <div className="camera-stat">Online: {onlineCameras}</div>
          <div className="camera-stat">Recording: {recordingCameras}</div>
          <div className="camera-stat">Storage Used: {totalStorage.toFixed(1)}GB</div>
        </div>
        <div className="camera-viewmode">
          <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>Grid View</button>
          <button onClick={() => setViewMode('single')} className={viewMode === 'single' ? 'active' : ''}>Single View</button>
        </div>
        {viewMode === 'grid' ? (
          <div className="camera-grid">
            {cameras.map((camera) => (
              <div key={camera.id} className="camera-card" onClick={() => setSelectedCamera(camera.id)}>
                <img src={camera.streamUrl} alt={camera.name} className="camera-img" />
                <div className="camera-name">{camera.name}</div>
                <div className="camera-location">{camera.location}</div>
                <div className="camera-status">Status: {camera.status}</div>
                <div className="camera-info">Res: {camera.resolution} | FPS: {camera.fps}</div>
                <div className="camera-controls">
                  <button disabled={camera.status === 'offline'}>{camera.isRecording ? 'Stop' : 'Record'}</button>
                  {camera.hasAudio && <button disabled={camera.status === 'offline'}>{camera.audioEnabled ? 'Mute' : 'Audio'}</button>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="camera-single">
            {selectedCamera ? (
              (() => {
                const camera = cameras.find((c) => c.id === selectedCamera);
                if (!camera) return null;
                return (
                  <div className="camera-card camera-card-single">
                    <img src={camera.streamUrl} alt={camera.name} className="camera-img" />
                    <div className="camera-name">{camera.name}</div>
                    <div className="camera-location">{camera.location}</div>
                    <div className="camera-status">Status: {camera.status}</div>
                    <div className="camera-info">Res: {camera.resolution} | FPS: {camera.fps}</div>
                    <div className="camera-controls">
                      <button disabled={camera.status === 'offline'}>{camera.isRecording ? 'Stop' : 'Record'}</button>
                      {camera.hasAudio && <button disabled={camera.status === 'offline'}>{camera.audioEnabled ? 'Mute' : 'Audio'}</button>}
                    </div>
                  </div>
                );
              })()
            ) : <div>Select a camera from grid</div>}
          </div>
        )}
      </main>
    </div>
  );
}
