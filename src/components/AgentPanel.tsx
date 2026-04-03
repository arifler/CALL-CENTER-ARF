import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, User, LeadStatus } from '../types';
import { Phone, LogOut, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface AgentPanelProps {
  user: User;
  onLogout: () => void;
}

export default function AgentPanel({ user, onLogout }: AgentPanelProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      (l.name && String(l.name).toLowerCase().includes(searchTerm.toLowerCase())) ||
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

        {/* Lead Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">İsim</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Yıl</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kurban Türü</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mülahaza</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
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
                        <a 
                          href={`tel:+90${lead.phone}`}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Ara"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Gösterilecek kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
