import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, serverTimestamp, writeBatch, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, User, LeadStatus } from '../types';
import * as XLSX from 'xlsx';
import { Upload, Users, CheckCircle, XCircle, Clock, Search, LogOut, Download, Trash2, AlertCircle, Phone, UserCircle, Pencil, Check, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import Countdown from './Countdown';

interface AdminPanelProps {
  user: User;
  onLogout: () => void;
}

export default function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingMulahazaId, setEditingMulahazaId] = useState<string | null>(null);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    const qLeads = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[]);
    });

    const qUsers = query(collection(db, 'users'), orderBy('name'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeUsers();
    };
  }, []);

  const downloadData = () => {
    const dataToExport = filteredLeads.map(lead => ({
      'Kurban Sahibi': lead.sacrificeOwner,
      'Ödeyen': lead.payer || '',
      'Yıl': lead.year || '',
      'Kurban Türü': lead.sacrificeType || '',
      'Telefon': lead.phone,
      'Atanan': lead.assignedTo,
      'Mülahaza': lead.mulahaza || '',
      'Durum': lead.status === 'positive' ? 'Olumlu' : 
               lead.status === 'negative' ? 'Olumsuz' : 
               lead.status === 'undecided' ? 'Kararsız' : 'Bekliyor'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Veriler");
    XLSX.writeFile(wb, "call_center_veriler.xlsx");
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Kurban Sahibi': '', 'Ödeyen': '', 'Yıl': '', 'Kurban Türü': '', 'Telefon': '', 'Kullanıcı': '', 'Mülahaza': '' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Şablon");
    XLSX.writeFile(wb, "call_center_sablon.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const batch = writeBatch(db);
        const userSet = new Set(users.map(u => u.name));

        for (const row of data) {
          const sacrificeOwner = String(row['Kurban Sahibi'] || row['İsim'] || row['Name'] || '');
          const payer = String(row['Ödeyen'] || row['Payer'] || '');
          const year = String(row['Yıl'] || row['Year'] || '');
          const sacrificeType = String(row['Kurban Türü'] || row['Sacrifice Type'] || row['Type'] || '');
          const phone = String(row['Telefon'] || row['Phone'] || '');
          const assignedTo = String(row['Kullanıcı'] || row['User'] || 'Admin');
          const mulahaza = String(row['Mülahaza'] || row['Mulahaza'] || row['Note'] || '');

          if (sacrificeOwner && phone) {
            const leadRef = doc(collection(db, 'leads'));
            batch.set(leadRef, {
              sacrificeOwner,
              payer,
              year,
              sacrificeType,
              phone: String(phone),
              assignedTo,
              mulahaza,
              status: 'pending',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            if (!userSet.has(assignedTo) && assignedTo !== 'Admin') {
              const userRef = doc(collection(db, 'users'));
              batch.set(userRef, {
                name: assignedTo,
                role: 'agent'
              });
              userSet.add(assignedTo);
            }
          }
        }

        await batch.commit();
        alert('Data başarıyla yüklendi!');
      } catch (error) {
        console.error('Upload error:', error);
        alert('Yükleme sırasında hata oluştu.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const deleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'leads', id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme işlemi sırasında hata oluştu.');
    }
  };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update status error:', error);
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

  const updateAssignedTo = async (leadId: string, userName: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        assignedTo: userName,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update assignedTo error:', error);
    }
  };

  const updatePhone = async (leadId: string, phone: string) => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        phone: phone.replace(/\s/g, ''),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update phone error:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUserToDelete(null);
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Kullanıcı silinirken hata oluştu.');
    }
  };

  const clearAllLeads = async () => {
    try {
      const batch = writeBatch(db);
      leads.forEach(lead => {
        if (lead.id) {
          batch.delete(doc(db, 'leads', lead.id));
        }
      });
      await batch.commit();
      setShowBulkDeleteConfirm(false);
      alert('Tüm veriler başarıyla silindi.');
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Toplu silme sırasında hata oluştu.');
    }
  };

  const phoneCounts = leads.reduce((acc, lead) => {
    acc[lead.phone] = (acc[lead.phone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredLeads = leads
    .filter(l => {
      const matchesSearch = 
        (l.sacrificeOwner && String(l.sacrificeOwner).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.payer && String(l.payer).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.phone && String(l.phone).includes(searchTerm)) ||
        (l.assignedTo && String(l.assignedTo).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.year && String(l.year).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.sacrificeType && String(l.sacrificeType).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.mulahaza && String(l.mulahaza).toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesUser = userFilter === 'all' || l.assignedTo === userFilter;
      const matchesYear = yearFilter === 'all' || l.year === yearFilter;

      return matchesSearch && matchesStatus && matchesUser && matchesYear;
    })
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

      // Final sort by updatedAt (newest first)
      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const uniqueYears = Array.from(new Set(leads.map(l => l.year).filter(Boolean))).sort((a, b) => String(b).localeCompare(String(a)));

  const userStats = users.map(u => {
    const userLeads = leads.filter(l => l.assignedTo === u.name);
    const total = userLeads.length;
    const processed = userLeads.filter(l => l.status !== 'pending').length;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    return { name: u.name, total, processed, percentage };
  }).sort((a, b) => b.percentage - a.percentage);

  const adminLeads = leads.filter(l => l.assignedTo === 'Admin');
  const adminTotal = adminLeads.length;
  const adminProcessed = adminLeads.filter(l => l.status !== 'pending').length;
  const adminPercentage = adminTotal > 0 ? Math.round((adminProcessed / adminTotal) * 100) : 0;
  
  const allUserStats = [{ name: 'Admin', total: adminTotal, processed: adminProcessed, percentage: adminPercentage }, ...userStats];

  const stats = {
    total: leads.length,
    positive: leads.filter(l => l.status === 'positive').length,
    negative: leads.filter(l => l.status === 'negative').length,
    undecided: leads.filter(l => l.status === 'undecided').length,
    pending: leads.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Countdown />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Paneli</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">Hoş geldin, {user.name}</span>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Toplam Data</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1 font-medium">Bekliyor</p>
            <p className="text-2xl font-bold text-gray-700">{stats.pending}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-2xl shadow-sm border border-green-100">
            <p className="text-sm text-green-600 mb-1 font-medium">Olumlu</p>
            <p className="text-2xl font-bold text-green-700">{stats.positive}</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-2xl shadow-sm border border-orange-100">
            <p className="text-sm text-orange-600 mb-1 font-medium">Kararsız</p>
            <p className="text-2xl font-bold text-orange-700">{stats.undecided}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100">
            <p className="text-sm text-red-600 mb-1 font-medium">Olumsuz</p>
            <p className="text-2xl font-bold text-red-700">{stats.negative}</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Kullanıcı Performansı
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allUserStats.map((u) => (
              <div key={u.name} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      {u.processed} / {u.total} İşlem
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-lg text-xs font-bold",
                    u.percentage >= 80 ? "bg-green-100 text-green-700" :
                    u.percentage >= 50 ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    %{u.percentage}
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      u.percentage >= 80 ? "bg-green-500" :
                      u.percentage >= 50 ? "bg-orange-500" :
                      "bg-blue-500"
                    )}
                    style={{ width: `${u.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-4xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Kurban sahibi, ödeyen, telefon veya kullanıcı ara..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="positive">Olumlu</option>
              <option value="undecided">Kararsız</option>
              <option value="negative">Olumsuz</option>
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            >
              <option value="all">Tüm Kullanıcılar</option>
              <option value="Admin">Admin</option>
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            >
              <option value="all">Tüm Yıllar</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={downloadData}
              className="flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 rounded-xl font-semibold hover:bg-green-100 transition-colors cursor-pointer whitespace-nowrap text-sm"
              title="Excel İndir"
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Excel İndir</span>
            </button>

            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap text-sm"
              title="Şablon İndir"
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Şablon İndir</span>
            </button>

            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap text-sm"
              title="Tümünü Sil"
            >
              <Trash2 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Tümünü Sil</span>
            </button>

            <label className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-lg shadow-blue-200 whitespace-nowrap text-sm">
              <Upload className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{isUploading ? 'Yükleniyor...' : 'Excel Yükle'}</span>
              <span className="md:hidden">{isUploading ? '...' : 'Yükle'}</span>
              <input 
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            <button
              onClick={() => setShowUserManagement(true)}
              className="flex items-center justify-center px-3 py-2 bg-purple-50 text-purple-600 rounded-xl font-semibold hover:bg-purple-100 transition-colors cursor-pointer whitespace-nowrap text-sm"
              title="Kullanıcılar"
            >
              <Users className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Kullanıcılar</span>
            </button>
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {filteredLeads.map((lead, index) => (
            <div 
              key={lead.id}
              className={cn(
                "p-4 rounded-2xl border transition-all shadow-sm relative overflow-hidden",
                lead.status === 'positive' && "bg-green-50 border-green-100",
                lead.status === 'undecided' && "bg-orange-50 border-orange-100",
                lead.status === 'negative' && "bg-red-50 border-red-100",
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
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-lg border outline-none",
                      lead.status === 'positive' && "bg-white border-green-200 text-green-700",
                      lead.status === 'undecided' && "bg-white border-orange-200 text-orange-700",
                      lead.status === 'negative' && "bg-white border-red-200 text-red-700",
                      lead.status === 'pending' && "bg-white border-gray-200 text-gray-700"
                    )}
                  >
                    <option value="pending">Bekliyor</option>
                    <option value="positive">Olumlu</option>
                    <option value="undecided">Kararsız</option>
                    <option value="negative">Olumsuz</option>
                  </select>
                  <select
                    value={lead.assignedTo}
                    onChange={(e) => updateAssignedTo(lead.id!, e.target.value)}
                    className="text-[10px] font-medium px-2 py-1 bg-white text-gray-600 rounded-lg border border-gray-200 outline-none"
                  >
                    <option value="Admin">Admin</option>
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 bg-white/50 p-2 rounded-xl border border-black/5">
                <div className="flex items-center space-x-2 flex-1">
                  {editingPhoneId === lead.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <span className="text-xs text-gray-400">+90</span>
                      <input
                        autoFocus
                        type="text"
                        className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                        value={lead.phone}
                        onChange={(e) => updatePhone(lead.id!, e.target.value)}
                        onBlur={() => setEditingPhoneId(null)}
                      />
                      <button 
                        onClick={() => setEditingPhoneId(null)}
                        className="p-1 bg-green-50 text-green-600 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => setEditingPhoneId(lead.id!)}>
                      <span className={cn(
                        "text-sm font-bold",
                        phoneCounts[lead.phone] > 1 ? "text-amber-600" : "text-gray-700"
                      )}>
                        +90 {lead.phone}
                      </span>
                      {phoneCounts[lead.phone] > 1 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">Tekrar</span>
                      )}
                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
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
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  {deleteConfirmId === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => deleteLead(lead.id!)}
                        className="text-[10px] bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 font-bold"
                      >
                        Sil
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirmId(lead.id!)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                {editingMulahazaId === lead.id ? (
                  <div className="flex items-center gap-2">
                    <textarea
                      autoFocus
                      placeholder="Not ekle..."
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20 resize-none"
                      value={lead.mulahaza || ''}
                      onChange={(e) => updateMulahaza(lead.id!, e.target.value)}
                      onBlur={() => setEditingMulahazaId(null)}
                    />
                    <button 
                      onClick={() => setEditingMulahazaId(null)}
                      className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => setEditingMulahazaId(lead.id!)}
                    className="flex items-start justify-between bg-white/80 p-3 rounded-xl border border-gray-100 min-h-[3rem] cursor-pointer"
                  >
                    <span className="text-sm text-gray-600 italic">
                      {lead.mulahaza || 'Not eklemek için tıklayın...'}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-gray-400 mt-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
              Kayıt bulunamadı.
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Atanan</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mülahaza</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    className={cn(
                      "transition-colors",
                      lead.status === 'positive' && "bg-green-50 hover:bg-green-100",
                      lead.status === 'undecided' && "bg-orange-50 hover:bg-orange-100",
                      lead.status === 'negative' && "bg-red-50 hover:bg-red-100",
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
                        {editingPhoneId === lead.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">+90</span>
                            <input
                              autoFocus
                              type="text"
                              className="w-32 px-2 py-1 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                              value={lead.phone}
                              onChange={(e) => updatePhone(lead.id!, e.target.value)}
                              onBlur={() => setEditingPhoneId(null)}
                            />
                            <button 
                              onClick={() => setEditingPhoneId(null)}
                              className="p-1 bg-green-50 text-green-600 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => setEditingPhoneId(lead.id!)}>
                            <span className={cn(
                              "text-gray-600 font-medium",
                              phoneCounts[lead.phone] > 1 && "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100"
                            )}>
                              +90 {lead.phone}
                            </span>
                            <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
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
                    <td className="px-6 py-4">
                      <select
                        value={lead.assignedTo}
                        onChange={(e) => updateAssignedTo(lead.id!, e.target.value)}
                        className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full border-none outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Admin">Admin</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-2">
                      {editingMulahazaId === lead.id ? (
                        <div className="flex items-center gap-2">
                          <textarea
                            autoFocus
                            placeholder="Not ekle..."
                            className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm h-12 resize-y"
                            value={lead.mulahaza || ''}
                            onChange={(e) => updateMulahaza(lead.id!, e.target.value)}
                            onBlur={() => setEditingMulahazaId(null)}
                          />
                          <button 
                            onClick={() => setEditingMulahazaId(null)}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group min-h-[2.5rem]">
                          <span className="text-sm text-gray-600 max-w-[200px] truncate">
                            {lead.mulahaza || '-'}
                          </span>
                          <button 
                            onClick={() => setEditingMulahazaId(lead.id!)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Düzenle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                        className={cn(
                          "text-sm font-medium px-3 py-1 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500",
                          lead.status === 'positive' && "bg-green-50 border-green-200 text-green-700",
                          lead.status === 'undecided' && "bg-orange-50 border-orange-200 text-orange-700",
                          lead.status === 'negative' && "bg-red-50 border-red-200 text-red-700",
                          lead.status === 'pending' && "bg-gray-50 border-gray-200 text-gray-700"
                        )}
                      >
                        <option value="pending">Bekliyor</option>
                        <option value="positive">Olumlu</option>
                        <option value="undecided">Kararsız</option>
                        <option value="negative">Olumsuz</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirmId === lead.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => deleteLead(lead.id!)}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          >
                            Evet
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(lead.id!)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Emin misiniz?</h3>
              <p className="text-gray-500 mt-2">
                Tüm kayıtlar kalıcı olarak silinecektir. Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3 mt-8 w-full">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={clearAllLeads}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Hepsini Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h3>
              <button 
                onClick={() => setShowUserManagement(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {users.filter(u => u.role === 'agent').map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <UserCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{u.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setUserToDelete(u)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {users.filter(u => u.role === 'agent').length === 0 && (
                <p className="text-center text-gray-500 py-8">Kayıtlı kullanıcı bulunamadı.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Kullanıcıyı Sil?</h3>
              <p className="text-gray-500 mt-2">
                <span className="font-bold text-gray-900">{userToDelete.name}</span> isimli kullanıcıyı silmek istediğinize emin misiniz?
              </p>
              <div className="flex gap-3 mt-8 w-full">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => deleteUser(userToDelete.id!)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
