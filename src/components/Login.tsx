import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Lead } from '../types';
import { LogIn, UserCircle, Lock, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const qUsers = query(collection(db, 'users'), orderBy('name'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      if (!userList.some(u => u.name.toLowerCase() === 'admin')) {
        userList.unshift({ name: 'Admin', role: 'admin' });
      }
      
      setUsers(userList);
    });

    const qLeads = query(collection(db, 'leads'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      const leadList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadList);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLeads();
    };
  }, []);

  const getUserStats = (userName: string) => {
    const userLeads = leads.filter(l => l.assignedTo === userName);
    const total = userLeads.length;
    const processed = userLeads.filter(l => l.status !== 'pending').length;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    return { total, processed, percentage };
  };

  const handleUserClick = (user: User) => {
    const isAdmin = user.role === 'admin' || user.name.toLowerCase() === 'admin';
    const isAlreadyAuthenticated = localStorage.getItem('admin_authenticated') === 'true';

    if (isAdmin && !isAlreadyAuthenticated) {
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
        localStorage.setItem('admin_authenticated', 'true');
        onLogin(showPasswordModal);
      }
    } else {
      setError('Hatalı şifre!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 md:p-10 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-6"
          >
            <LogIn className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-gray-900 text-center tracking-tight">
            2026 Kurban <span className="text-blue-600">Data Arama</span>
          </h1>
          <p className="text-gray-500 mt-3 font-medium">Devam etmek için bir profil seçin</p>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {users.filter(u => u.name.toLowerCase() !== 'admin').map((user, index) => {
            const stats = getUserStats(user.name);
            return (
              <motion.button
                key={user.id || user.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                onClick={() => handleUserClick(user)}
                className="w-full flex flex-col p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/5 transition-all group text-left"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center mr-4 group-hover:bg-blue-50 transition-colors shadow-sm">
                      <UserCircle className="w-7 h-7 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{user.name}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold",
                    stats.percentage >= 80 ? "bg-green-100 text-green-700" :
                    stats.percentage >= 50 ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    %{stats.percentage}
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500">
                      {stats.processed} / {stats.total} İşlem Tamamlandı
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.percentage}%` }}
                    className={cn(
                      "h-full transition-all duration-500",
                      stats.percentage >= 80 ? "bg-green-500" :
                      stats.percentage >= 50 ? "bg-orange-500" :
                      "bg-blue-500"
                    )}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 flex justify-center z-10"
      >
        {users.filter(u => u.name.toLowerCase() === 'admin').map((admin) => (
          <button
            key="admin-login"
            onClick={() => handleUserClick(admin)}
            className="text-sm text-gray-500 hover:text-blue-600 transition-all flex items-center gap-2 font-medium bg-white/50 px-4 py-2 rounded-full border border-gray-100 hover:border-blue-100 hover:shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" />
            Yönetici Girişi
          </button>
        ))}
      </motion.div>

      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative z-10 border border-gray-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-50 p-5 rounded-3xl mb-6">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900">Yönetici Girişi</h3>
                <p className="text-gray-500 mt-2 font-medium">Lütfen güvenlik şifresini giriniz</p>
                
                <form onSubmit={handlePasswordSubmit} className="mt-8 w-full">
                  <input
                    type="password"
                    autoFocus
                    placeholder="••••"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-center text-3xl tracking-[0.5em] font-bold transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center mt-3 text-red-500 text-sm font-bold"
                    >
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {error}
                    </motion.div>
                  )}
                  <div className="flex gap-3 mt-10 w-full">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(null)}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                    >
                      Giriş
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}} />
    </div>
  );
}
