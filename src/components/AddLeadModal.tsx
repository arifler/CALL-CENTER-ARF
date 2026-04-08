import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, LeadStatus } from '../types';
import { X, UserPlus, Phone, User as UserIcon, Calendar, Tag, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users?: User[]; // Only for admin to assign to others
}

export default function AddLeadModal({ isOpen, onClose, currentUser, users = [] }: AddLeadModalProps) {
  const [formData, setFormData] = useState({
    sacrificeOwner: '',
    payer: '',
    year: new Date().getFullYear().toString(),
    sacrificeType: '',
    phone: '',
    assignedTo: currentUser.role === 'admin' ? 'Admin' : currentUser.name,
    status: 'pending' as LeadStatus,
    mulahaza: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sacrificeOwner || !formData.phone) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        phone: formData.phone.replace(/\s/g, ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
      setFormData({
        sacrificeOwner: '',
        payer: '',
        year: new Date().getFullYear().toString(),
        sacrificeType: '',
        phone: '',
        assignedTo: currentUser.role === 'admin' ? 'Admin' : currentUser.name,
        status: 'pending',
        mulahaza: ''
      });
    } catch (error) {
      console.error('Error adding lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden border border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Yeni Kayıt Ekle</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                    <UserIcon className="w-3 h-3" /> Kurban Sahibi
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    placeholder="Ad Soyad"
                    value={formData.sacrificeOwner}
                    onChange={(e) => setFormData({ ...formData, sacrificeOwner: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                    <Phone className="w-3 h-3" /> Telefon
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+90</span>
                    <input
                      required
                      type="tel"
                      className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      placeholder="5xx xxx xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                    <UserIcon className="w-3 h-3" /> Ödeyen (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    placeholder="Ad Soyad"
                    value={formData.payer}
                    onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                    <Calendar className="w-3 h-3" /> Yıl
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    placeholder="2024"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                    <Tag className="w-3 h-3" /> Kurban Türü
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    placeholder="Hisse / Küçükbaş"
                    value={formData.sacrificeType}
                    onChange={(e) => setFormData({ ...formData, sacrificeType: e.target.value })}
                  />
                </div>

                {currentUser.role === 'admin' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                      <UserIcon className="w-3 h-3" /> Atanan Kişi
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    >
                      <option value="Admin">Admin</option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                  <MessageSquare className="w-3 h-3" /> Mülahaza
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none h-24"
                  placeholder="Notlar..."
                  value={formData.mulahaza}
                  onChange={(e) => setFormData({ ...formData, mulahaza: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
