import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, User, LeadStatus } from '../types';
import { Phone, LogOut, Search, MessageCircle, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import Countdown from './Countdown';
import AddLeadModal from './AddLeadModal';

interface AgentPanelProps {
  user: User;
  onLogout: () => void;
}

export default function AgentPanel({ user, onLogout }: AgentPanelProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'leads'),
      where('assignedTo', '==', user.name)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadList);
    });

    return () => unsubscribe();
  }, [user.name]);

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    setUpdatingId(leadId);
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateMulahaza = async (leadId: string, text: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        mulahaza: text,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update mulahaza error:', error);
    }
  };

  const phoneCounts = leads.reduce((acc, lead) => {
    acc[lead.phone] = (acc[lead.phone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredLeads = leads
    .filter(l => 
      (l.sacrificeOwner && String(l.sacrificeOwner).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.payer && String(l.payer).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.phone && String(l.phone).includes(searchTerm)) ||
      (l.year && String(l.year).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.sacrificeType && String(l.sacrificeType).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.mulahaza && String(l.mulahaza).toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const priority: Record<LeadStatus, number> = {
        'positive': 0,
        'undecided': 1,
        'negative': 2,
        'pending': 3
      };
      const statusDiff = (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
      if (statusDiff !== 0) return statusDiff;
      
      // Tertiary sort by phone to group duplicates together
      if (a.phone !== b.phone) {
        return a.phone.localeCompare(b.phone);
      }

      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Countdown />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wider">
              {user.name} PANELİ
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 font-bold text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni Kayıt</span>
            </button>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors flex items-center space-x-2"
              title="Çıkış Yap"
            >
              <span className="text-sm font-medium">Çıkış</span>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Arama Listesi</h2>
            <p className="text-gray-500">Size atanan toplam {leads.length} kayıt bulunmaktadır.</p>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="İsim, telefon veya mülahaza ara..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {filteredLeads.map((lead, index) => (
            <div 
              key={lead.id}
              className={cn(
                "p-4 rounded-2xl border transition-all shadow-sm relative overflow-hidden",
                lead.status === 'positive' && "bg-green-100 border-green-200",
                lead.status === 'undecided' && "bg-orange-100 border-orange-200",
                lead.status === 'negative' && "bg-red-100 border-red-200",
                lead.status === 'pending' && "bg-white border-gray-100"
              )}
            >
              <div className="absolute top-0 left-0 bg-gray-100 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-br-lg font-mono">
                #{index + 1}
              </div>
              <div className="flex justify-between items-start mb-3 pt-2">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight">{lead.sacrificeOwner}</h3>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    {lead.payer && <span className="text-xs text-gray-500">Ödeyen: {lead.payer}</span>}
                    {lead.year && <span className="text-xs text-gray-500">Yıl: {lead.year}</span>}
                    {lead.sacrificeType && <span className="text-xs text-gray-500">Tür: {lead.sacrificeType}</span>}
                  </div>
                </div>
                <select
                  value={lead.status}
                  onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                  className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500",
                    lead.status === 'positive' && "bg-white border-green-200 text-green-700",
                    lead.status === 'undecided' && "bg-white border-orange-200 text-orange-700",
                    lead.status === 'negative' && "bg-white border-red-200 text-red-700",
                    lead.status === 'pending' && "bg-white border-gray-200 text-gray-700"
                  )}
                  disabled={updatingId === lead.id}
                >
                  <option value="pending">Bekliyor</option>
                  <option value="positive">Olumlu</option>
                  <option value="undecided">Kararsız</option>
                  <option value="negative">Olumsuz</option>
                </select>
              </div>

              <div className="flex items-center justify-between mb-3 bg-white/50 p-2 rounded-xl border border-black/5">
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "text-sm font-bold",
                    phoneCounts[lead.phone] > 1 ? "text-amber-600" : "text-gray-700"
                  )}>
                    +90 {lead.phone}
                  </span>
                  {phoneCounts[lead.phone] > 1 && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">Tekrar</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://wa.me/90${lead.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href={`tel:+90${lead.phone}`}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Ara</span>
                  </a>
                </div>
              </div>

              <textarea
                placeholder="Not ekle..."
                className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm h-16 resize-none"
                value={lead.mulahaza || ''}
                onChange={(e) => updateMulahaza(lead.id!, e.target.value)}
              />
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              Gösterilecek kayıt bulunamadı.
            </div>
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kurban Sahibi</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ödeyen</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Yıl</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kurban Türü</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mülahaza</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className={cn(
                      "transition-colors",
                      lead.status === 'positive' && "bg-green-100 hover:bg-green-200/70",
                      lead.status === 'undecided' && "bg-orange-100 hover:bg-orange-200/70",
                      lead.status === 'negative' && "bg-red-100 hover:bg-red-200/70",
                      lead.status === 'pending' && "hover:bg-gray-50"
                    )}
                  >
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{lead.sacrificeOwner}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lead.payer || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lead.year || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lead.sacrificeType || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "text-gray-600 font-medium",
                          phoneCounts[lead.phone] > 1 && "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100"
                        )}>
                          +90 {lead.phone}
                        </span>
                        <div className="flex items-center gap-1">
                          <a 
                            href={`https://wa.me/90${lead.phone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <a 
                            href={`tel:+90${lead.phone}`}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Ara"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <textarea
                        placeholder="Not ekle..."
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm h-8 resize-y"
                        value={lead.mulahaza || ''}
                        onChange={(e) => updateMulahaza(lead.id!, e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                        className={cn(
                          "text-sm font-medium px-3 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto",
                          lead.status === 'positive' && "bg-green-50 border-green-200 text-green-700",
                          lead.status === 'undecided' && "bg-orange-50 border-orange-200 text-orange-700",
                          lead.status === 'negative' && "bg-red-50 border-red-200 text-red-700",
                          lead.status === 'pending' && "bg-gray-50 border-gray-200 text-gray-700"
                        )}
                        disabled={updatingId === lead.id}
                      >
                        <option value="pending">Bekliyor</option>
                        <option value="positive">Olumlu</option>
                        <option value="undecided">Kararsız</option>
                        <option value="negative">Olumsuz</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Gösterilecek kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <AddLeadModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
}
