
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import './calendar.css';

// UK Holidays for 2025
const ukHolidays = [
  {
    id: 'uk-1',
    title: 'New Year\'s Day',
    start: '2025-01-01',
    display: 'list-item',
    backgroundColor: '#cce5ff', // Darker blue for UK holidays
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-2',
    title: 'Good Friday',
    start: '2025-04-18',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-3',
    title: 'Easter Monday',
    start: '2025-04-21',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-4',
    title: 'Early May Bank Holiday',
    start: '2025-05-05',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-5',
    title: 'Spring Bank Holiday',
    start: '2025-05-26',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-6',
    title: 'Summer Bank Holiday',
    start: '2025-08-25',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-7',
    title: 'Christmas Day',
    start: '2025-12-25',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  },
  {
    id: 'uk-8',
    title: 'Boxing Day',
    start: '2025-12-26',
    display: 'list-item',
    backgroundColor: '#cce5ff',
    textColor: '#004085',
    extendedProps: { country: 'UK' }
  }
];

// Indian Holidays for 2025
const indianHolidays = [
  {
    id: 'in-1',
    title: 'Republic Day',
    start: '2025-01-26',
    display: 'list-item',
    backgroundColor: '#ffe0cc', // Darker orange for Indian holidays
    textColor: '#803300',
    extendedProps: { country: 'India' }
  },
  {
    id: 'in-2',
    title: 'Holi',
    start: '2025-03-14',
    display: 'list-item',
    backgroundColor: '#ffe0cc',
    textColor: '#803300',
    extendedProps: { country: 'India' }
  },
  {
    id: 'in-3',
    title: 'Independence Day',
    start: '2025-08-15',
    display: 'list-item',
    backgroundColor: '#ffe0cc',
    textColor: '#803300',
    extendedProps: { country: 'India' }
  },
  {
    id: 'in-4',
    title: 'Gandhi Jayanti',
    start: '2025-10-02',
    display: 'list-item',
    backgroundColor: '#ffe0cc',
    textColor: '#803300',
    extendedProps: { country: 'India' }
  },
  {
    id: 'in-5',
    title: 'Diwali',
    start: '2025-11-12',
    display: 'list-item',
    backgroundColor: '#ffe0cc',
    textColor: '#803300',
    extendedProps: { country: 'India' }
  }
];

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
  // Combine all events
  const allEvents = [...initialEvents, ...ukHolidays, ...indianHolidays];

  const renderEventContent = (eventInfo) => {
    const isHoliday = eventInfo.event.extendedProps.country;
    if (isHoliday) {
      return (
        <div className={`fc-event-holiday fc-event-holiday-${eventInfo.event.extendedProps.country.toLowerCase()}`}>
          {eventInfo.event.title}
        </div>
      );
    }
    return (
      <div className="fc-event-main-content">
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <div className="calendar-bg">
      <header className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="calendar-back" onClick={onBack}>Back</button>}
          <span className="calendar-title">Calendar</span>
        </div>
      </header>
      <main className="calendar-main">
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#cce5ff' }}></div>
            <span>UK Holidays</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffe0cc' }}></div>
            <span>Indian Holidays</span>
          </div>
        </div>
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
            events={allEvents}
            eventContent={renderEventContent}
            eventClick={info => {
              if (info.event.display !== 'background') {
                alert(`${info.event.title}\n${info.event.extendedProps.description || ''}`);
              }
            }}
            height="auto"
            aspectRatio={1.5}
            className="calendar-fc"
          />
        </div>
      </main>
    </div>
  );
}
