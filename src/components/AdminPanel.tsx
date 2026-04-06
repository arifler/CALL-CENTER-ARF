import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, serverTimestamp, writeBatch, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, User, LeadStatus } from '../types';
import * as XLSX from 'xlsx';
import { Upload, Users, CheckCircle, XCircle, Clock, Search, LogOut, Download, Trash2, AlertCircle, Phone, UserCircle, Pencil, Check } from 'lucide-react';
import { cn } from '../lib/utils';

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
    .filter(l => 
      (l.sacrificeOwner && String(l.sacrificeOwner).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.payer && String(l.payer).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.phone && String(l.phone).includes(searchTerm)) ||
      (l.assignedTo && String(l.assignedTo).toLowerCase().includes(searchTerm.toLowerCase())) ||
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

      // Final sort by updatedAt (newest first)
      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const stats = {
    total: leads.length,
    positive: leads.filter(l => l.status === 'positive').length,
    negative: leads.filter(l => l.status === 'negative').length,
    undecided: leads.filter(l => l.status === 'undecided').length,
    pending: leads.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Kurban sahibi, ödeyen, telefon veya kullanıcı ara..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadData}
              className="flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-xl font-semibold hover:bg-green-100 transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5 mr-2" />
              Excel İndir
            </button>

            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5 mr-2" />
              Şablon İndir
            </button>

            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Tümünü Sil
            </button>

            <label className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-lg shadow-blue-200">
              <Upload className="w-5 h-5 mr-2" />
              {isUploading ? 'Yükleniyor...' : 'Excel Yükle'}
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
              className="flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-semibold hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <Users className="w-5 h-5 mr-2" />
              Kullanıcılar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                {filteredLeads.map((lead) => (
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
                        <a 
                          href={`tel:+90${lead.phone}`}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Ara"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
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
