import React, { useState } from 'react';
import './todo.css';

const initialTodos = [
  {
    id: "1",
    title: "Check Raspberry Pi temperature sensors",
    description: "Verify all temperature sensors are working correctly in each room",
    priority: "high",
    category: "maintenance",
    completed: false,
    dueDate: "2024-12-30",
    createdAt: "2024-12-27",
  },
  {
    id: "2",
    title: "Update home automation scripts",
    description: "Review and update the automation scripts for better efficiency",
    priority: "medium",
    category: "home",
    completed: false,
    dueDate: "2025-01-05",
    createdAt: "2024-12-26",
  },
  {
    id: "3",
    title: "Install new smart switches",
    description: "Replace old switches in the kitchen and living room",
    priority: "medium",
    category: "home",
    completed: true,
    createdAt: "2024-12-25",
  },
  {
    id: "4",
    title: "Backup system configuration",
    description: "Create a backup of all system configurations and settings",
    priority: "high",
    category: "maintenance",
    completed: false,
    dueDate: "2024-12-28",
    createdAt: "2024-12-24",
  },
  {
    id: "5",
    title: "Review monthly utility bills",
    description: "Analyze this month's electricity and gas usage patterns",
    priority: "low",
    category: "personal",
    completed: false,
    dueDate: "2024-12-31",
    createdAt: "2024-12-23",
  },
];

export default function TodoListModule({ onBack }) {
  const [todos, setTodos] = useState(initialTodos);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'personal',
    dueDate: '',
  });

  const handleAddTodo = () => {
    if (!newTodo.title.trim()) return;
    const todo = {
      id: Date.now().toString(),
      ...newTodo,
      completed: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTodos([todo, ...todos]);
    setNewTodo({ title: '', description: '', priority: 'medium', category: 'personal', dueDate: '' });
    setIsAddDialogOpen(false);
  };

  const handleToggleComplete = (id) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setNewTodo({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      category: todo.category,
      dueDate: todo.dueDate || '',
    });
  };

  const handleUpdateTodo = () => {
    if (!editingTodo || !newTodo.title.trim()) return;
    setTodos(
      todos.map((todo) =>
        todo.id === editingTodo.id
          ? { ...todo, ...newTodo }
          : todo,
      ),
    );
    setEditingTodo(null);
    setNewTodo({ title: '', description: '', priority: 'medium', category: 'personal', dueDate: '' });
  };

  const filteredTodos = todos.filter((todo) => {
    const statusMatch =
      filter === 'all' || (filter === 'pending' && !todo.completed) || (filter === 'completed' && todo.completed);
    const categoryMatch = categoryFilter === 'all' || todo.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'todo-priority-high';
      case 'medium': return 'todo-priority-medium';
      case 'low': return 'todo-priority-low';
      default: return 'todo-priority-default';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    pending: todos.filter((t) => !t.completed).length,
    overdue: todos.filter((t) => !t.completed && isOverdue(t.dueDate)).length,
  };

  return (
    <div className="todo-bg">
      <header className="todo-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="todo-back" onClick={onBack}>Back</button>}
          <span className="todo-title">Todo List</span>
        </div>
      </header>
      <main className="todo-main">
        <div className="todo-stats">
          <div className="todo-stat">Total Tasks: {stats.total}</div>
          <div className="todo-stat">Pending: {stats.pending}</div>
          <div className="todo-stat">Completed: {stats.completed}</div>
          <div className="todo-stat">Overdue: {stats.overdue}</div>
        </div>
        <div className="todo-controls">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button onClick={() => setIsAddDialogOpen(true)}>Add Task</button>
        </div>
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="todo-empty">No tasks found matching your filters</div>
          ) : (
            filteredTodos.map((todo) => (
              <div key={todo.id} className={`todo-card ${todo.completed ? 'completed' : ''}`}>
                <input type="checkbox" checked={todo.completed} onChange={() => handleToggleComplete(todo.id)} />
                <div className="todo-info">
                  <span className={`todo-title-text ${todo.completed ? 'completed' : ''}`}>{todo.title}</span>
                  <span className={`todo-priority ${getPriorityColor(todo.priority)}`}>{todo.priority}</span>
                  <span className="todo-category">{todo.category}</span>
                  {todo.dueDate && isOverdue(todo.dueDate) && !todo.completed && (
                    <span className="todo-overdue">Overdue</span>
                  )}
                  {todo.description && (
                    <span className="todo-desc">{todo.description}</span>
                  )}
                  <span className="todo-created">Created: {todo.createdAt}</span>
                  {todo.dueDate && (
                    <span className={isOverdue(todo.dueDate) && !todo.completed ? 'todo-due-overdue' : 'todo-due'}>
                      Due: {todo.dueDate}
                    </span>
                  )}
                </div>
                <div className="todo-actions">
                  <button onClick={() => { handleEditTodo(todo); setIsAddDialogOpen(true); }}>Edit</button>
                  <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
        {isAddDialogOpen && (
          <div className="todo-dialog-bg">
            <div className="todo-dialog">
              <h3>{editingTodo ? 'Edit Task' : 'Add New Task'}</h3>
              <input
                type="text"
                placeholder="Title"
                value={newTodo.title}
                onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newTodo.description}
                onChange={e => setNewTodo({ ...newTodo, description: e.target.value })}
              />
              <select
                value={newTodo.priority}
                onChange={e => setNewTodo({ ...newTodo, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <select
                value={newTodo.category}
                onChange={e => setNewTodo({ ...newTodo, category: e.target.value })}
              >
                <option value="personal">Personal</option>
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input
                type="date"
                value={newTodo.dueDate}
                onChange={e => setNewTodo({ ...newTodo, dueDate: e.target.value })}
              />
              <div className="todo-dialog-actions">
                <button onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingTodo(null);
                  setNewTodo({ title: '', description: '', priority: 'medium', category: 'personal', dueDate: '' });
                }}>Cancel</button>
                <button onClick={editingTodo ? handleUpdateTodo : handleAddTodo}>{editingTodo ? 'Update' : 'Add'} Task</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
