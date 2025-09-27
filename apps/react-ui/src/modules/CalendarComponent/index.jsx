import React, { useState } from 'react';
import './calendar.css';

const initialEvents = [
  {
    id: "1",
    title: "System Backup",
    description: "Weekly backup of all system configurations and data",
    date: "2024-12-29",
    time: "02:00",
    duration: 60,
    category: "maintenance",
    reminder: true,
  },
  {
    id: "2",
    title: "Temperature Sensor Check",
    description: "Monthly inspection of all temperature sensors",
    date: "2024-12-30",
    time: "10:00",
    duration: 30,
    category: "maintenance",
    location: "All Rooms",
    reminder: true,
  },
  {
    id: "3",
    title: "Smart Switch Installation",
    description: "Install new smart switches in bedroom",
    date: "2025-01-02",
    time: "14:00",
    duration: 120,
    category: "home",
    location: "Bedroom",
    reminder: true,
  },
  {
    id: "4",
    title: "Monthly Bills Review",
    description: "Review and analyze monthly utility bills",
    date: "2025-01-05",
    time: "09:00",
    duration: 45,
    category: "personal",
    reminder: false,
  },
  {
    id: "5",
    title: "Camera System Update",
    description: "Update camera firmware and check recordings",
    date: "2025-01-07",
    time: "16:00",
    duration: 90,
    category: "maintenance",
    location: "Security Room",
    reminder: true,
  },
];

const months = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarComponent({ onBack }) {
  const [events, setEvents] = useState(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "09:00",
    duration: 60,
    category: "personal",
    location: "",
    reminder: true,
  });

  const handleAddEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    const event = {
      id: Date.now().toString(),
      ...newEvent,
    };
    setEvents([...events, event]);
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "09:00",
      duration: 60,
      category: "personal",
      location: "",
      reminder: true,
    });
    setIsAddDialogOpen(false);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setNewEvent({ ...event });
  };

  const handleUpdateEvent = () => {
    if (!editingEvent || !newEvent.title.trim() || !newEvent.date) return;
    setEvents(events.map((event) => event.id === editingEvent.id ? { ...event, ...newEvent } : event));
    setEditingEvent(null);
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "09:00",
      duration: 60,
      category: "personal",
      location: "",
      reminder: true,
    });
  };

  const handleDeleteEvent = (id) => {
    setEvents(events.filter((event) => event.id !== id));
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getEventsForDate = (date) => events.filter((event) => event.date === date);

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === "next" ? 1 : -1), 1));
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = getEventsForDate(dateString);
      const isToday = dateString === new Date().toISOString().split("T")[0];
      const isSelected = dateString === selectedDate;
      days.push(
        <div
          key={day}
          className={`calendar-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDate(dateString)}
        >
          <div className="calendar-day">{day}</div>
          <div className="calendar-events">
            {dayEvents.slice(0, 2).map((event) => (
              <div key={event.id} className={`calendar-event ${event.category}`}>{event.title}</div>
            ))}
            {dayEvents.length > 2 && <div className="calendar-event more">+{dayEvents.length - 2} more</div>}
          </div>
        </div>
      );
    }
    return days;
  };

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time))
    .slice(0, 5);

  return (
    <div className="calendar-bg">
      <header className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="calendar-back" onClick={onBack}>Back</button>}
          <span className="calendar-title">Calendar</span>
        </div>
      </header>
      <main className="calendar-main">
        <div className="calendar-controls">
          <button onClick={() => navigateMonth('prev')}>Prev</button>
          <span>{months[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={() => navigateMonth('next')}>Next</button>
          <button onClick={() => setIsAddDialogOpen(true)}>Add Event</button>
        </div>
        <div className="calendar-grid">
          {daysOfWeek.map((day) => (
            <div key={day} className="calendar-cell calendar-header-cell">{day}</div>
          ))}
          {renderCalendarGrid()}
        </div>
        <div className="calendar-sidebar">
          <h3>Upcoming Events</h3>
          {upcomingEvents.length === 0 ? (
            <p>No upcoming events</p>
          ) : (
            upcomingEvents.map((event) => (
              <div key={event.id} className="calendar-upcoming-event">
                <span className={`calendar-event-badge ${event.category}`}>{event.title}</span>
                <span>{event.date} {event.time}</span>
                <button onClick={() => handleEditEvent(event)}>Edit</button>
                <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
        {isAddDialogOpen && (
          <div className="calendar-dialog-bg">
            <div className="calendar-dialog">
              <h3>{editingEvent ? "Edit Event" : "Add New Event"}</h3>
              <input
                type="text"
                placeholder="Title"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
              />
              <input
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
              />
              <input
                type="time"
                value={newEvent.time}
                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
              />
              <input
                type="number"
                min="15"
                step="15"
                placeholder="Duration (minutes)"
                value={newEvent.duration}
                onChange={e => setNewEvent({ ...newEvent, duration: Number.parseInt(e.target.value) || 60 })}
              />
              <select
                value={newEvent.category}
                onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
              >
                <option value="personal">Personal</option>
                <option value="home">Home</option>
                <option value="maintenance">Maintenance</option>
                <option value="work">Work</option>
              </select>
              <input
                type="text"
                placeholder="Location (optional)"
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
              />
              <div className="calendar-dialog-actions">
                <button onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingEvent(null);
                  setNewEvent({
                    title: "",
                    description: "",
                    date: "",
                    time: "09:00",
                    duration: 60,
                    category: "personal",
                    location: "",
                    reminder: true,
                  });
                }}>Cancel</button>
                <button onClick={editingEvent ? handleUpdateEvent : handleAddEvent}>{editingEvent ? "Update" : "Add"} Event</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
