import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { LogIn, UserCircle, Lock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Ensure admin exists if not in DB
      if (!userList.some(u => u.name.toLowerCase() === 'admin')) {
        userList.unshift({ name: 'Admin', role: 'admin' });
      }
      
      setUsers(userList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUserClick = (user: User) => {
    if (user.role === 'admin' || user.name.toLowerCase() === 'admin') {
      setShowPasswordModal(user);
      setPassword('');
      setError('');
    } else {
      onLogin(user);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1842') {
      if (showPasswordModal) {
        onLogin(showPasswordModal);
      }
    } else {
      setError('Hatalı şifre!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-4 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Call Center Panel</h1>
          <p className="text-gray-500 mt-2">Lütfen kullanıcı seçiniz</p>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <button
              key={user.id || user.name}
              onClick={() => handleUserClick(user)}
              className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
            >
              <UserCircle className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mr-3" />
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Admin Girişi</h3>
              <p className="text-gray-500 mt-2">Lütfen şifreyi giriniz</p>
              
              <form onSubmit={handlePasswordSubmit} className="mt-6 w-full">
                <input
                  type="password"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-[1em]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && (
                  <div className="flex items-center justify-center mt-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                  </div>
                )}
                <div className="flex gap-3 mt-8 w-full">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(null)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Giriş Yap
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
