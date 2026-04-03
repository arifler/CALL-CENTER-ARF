import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import AgentPanel from './components/AgentPanel';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('call_center_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('call_center_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('call_center_user');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminPanel user={currentUser} onLogout={handleLogout} />;
  }

  return <AgentPanel user={currentUser} onLogout={handleLogout} />;
}
