import React from 'react';
import './menu.css';

export default function NavigationMenu({ page, setPage, onLogout }) {
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'bills', label: 'Bills Analytics' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'cameras', label: 'Camera System' },
    { key: 'home', label: 'Home Control' },
    { key: 'todos', label: 'Todo List' },
  ];
  return (
    <nav className="nav-menu">
      <ul className="nav-list">
        {menuItems.map(item => (
          <li key={item.key}>
            <button
              className={`nav-btn${page === item.key ? ' active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </button>
          </li>
        ))}
        <li>
          <button className="nav-btn logout" onClick={onLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
}
