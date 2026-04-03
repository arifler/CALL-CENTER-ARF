import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { LogIn, UserCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
              onClick={() => onLogin(user)}
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
    </div>
  );
}
