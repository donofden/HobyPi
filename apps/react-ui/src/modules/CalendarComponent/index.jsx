
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import './calendar.css';

const initialEvents = [
  {
    id: '1',
    title: 'System Backup',
    start: '2024-12-29T02:00:00',
    description: 'Weekly backup of all system configurations and data',
    category: 'maintenance',
  },
  {
    id: '2',
    title: 'Temperature Sensor Check',
    start: '2024-12-30T10:00:00',
    description: 'Monthly inspection of all temperature sensors',
    category: 'maintenance',
  },
  {
    id: '3',
    title: 'Smart Switch Installation',
    start: '2025-01-02T14:00:00',
    description: 'Install new smart switches in bedroom',
    category: 'home',
  },
  {
    id: '4',
    title: 'Monthly Bills Review',
    start: '2025-01-05T09:00:00',
    description: 'Review and analyze monthly utility bills',
    category: 'personal',
  },
  {
    id: '5',
    title: 'Camera System Update',
    start: '2025-01-07T16:00:00',
    description: 'Update camera firmware and check recordings',
    category: 'maintenance',
  },
];

export default function CalendarComponent({ onBack }) {
  return (
    <div className="calendar-bg">
      <header className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="calendar-back" onClick={onBack}>Back</button>}
          <span className="calendar-title">Calendar</span>
        </div>
      </header>
      <main className="calendar-main">
        <div className="calendar-fc-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth,listYear'
            }}
            views={{
              dayGridMonth: { buttonText: 'Month' },
              timeGridWeek: { buttonText: 'Week' },
              timeGridDay: { buttonText: 'Day' },
              listMonth: { buttonText: 'List Month' },
              listYear: { buttonText: 'List Year' },
            }}
            events={initialEvents}
            eventClick={info => {
              alert(`${info.event.title}\n${info.event.extendedProps.description || ''}`);
            }}
            height={700}
            contentHeight={700}
            className="calendar-fc"
          />
        </div>
      </main>
    </div>
  );
}
