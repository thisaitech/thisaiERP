import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Plus, MagnifyingGlass, Trash, PencilSimple } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import MobilePageScaffold from '../components/mobile/MobilePageScaffold';
import useIsMobileViewport from '../hooks/useIsMobileViewport';
import { toast } from 'sonner';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  enquiredFor?: string;
  enquiredForPhone?: string;
  courseEnquiry: string;
  source: string;
  status: string;
  date: string;
}

const Settings = () => {
  const { t } = useLanguage();
  const isMobileViewport = useIsMobileViewport();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    enquiredFor: '',
    enquiredForPhone: '',
    courseEnquiry: '',
    source: 'Walk-in',
    status: 'New',
  });

  useEffect(() => {
    const stored = localStorage.getItem('erp_visitors');
    if (stored) {
      try {
        setVisitors(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse visitors', e);
      }
    }
  }, []);

  const saveVisitors = (newVisitors: Visitor[]) => {
    setVisitors(newVisitors);
    localStorage.setItem('erp_visitors', JSON.stringify(newVisitors));
  };

  const handleAddVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    const newVisitor: Visitor = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      enquiredFor: formData.enquiredFor,
      enquiredForPhone: formData.enquiredForPhone,
      courseEnquiry: formData.courseEnquiry,
      source: formData.source,
      status: formData.status,
      date: new Date().toISOString(),
    };

    saveVisitors([newVisitor, ...visitors]);
    toast.success('Visitor added successfully');
    setShowAddModal(false);
    setFormData({
      name: '',
      phone: '',
      enquiredFor: '',
      enquiredForPhone: '',
      courseEnquiry: '',
      source: 'Walk-in',
      status: 'New',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this visitor?')) {
      saveVisitors(visitors.filter(v => v.id !== id));
      toast.success('Visitor deleted');
    }
  };

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.phone.includes(searchTerm) ||
    v.courseEnquiry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="erp-module-page overflow-x-hidden flex flex-col max-w-[100vw] w-full px-4 py-3 min-h-screen">
      {isMobileViewport ? (
        <MobilePageScaffold title="Visitor Management" subtitle="Track visitor and lead enquiries">
          <div className="p-4" />
        </MobilePageScaffold>
      ) : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users size={28} className="text-blue-500" />
            Visitor Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track visitor and lead enquiries</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="erp-module-primary-btn flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} weight="bold" />
          Add Visitor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative p-4 rounded-2xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
              <Users size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Visitors</h3>
            <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-200">{visitors.length}</p>
          </div>
        </div>
        <div className="relative p-4 rounded-2xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-900/20">
              <Users size={22} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">New Enquiries</h3>
            <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-200">{visitors.filter(v => v.status === 'New').length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or course..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Visitors List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Enquired For</th>
                <th className="px-4 py-3 font-semibold">Course Enquiry</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.length > 0 ? (
                filteredVisitors.map(visitor => (
                  <tr key={visitor.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {new Date(visitor.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {visitor.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {visitor.phone}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {visitor.enquiredFor || '-'}
                      {visitor.enquiredForPhone && <span className="block text-xs text-slate-400 mt-0.5">{visitor.enquiredForPhone}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {visitor.courseEnquiry || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {visitor.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium",
                        visitor.status === 'New' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        visitor.status === 'Followed Up' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        visitor.status === 'Converted' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {visitor.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(visitor.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {searchTerm ? 'No visitors match your search.' : 'No visitors recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Visitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Visitor</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="add-visitor-form" onSubmit={handleAddVisitor} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Enquired For (Name)</label>
                    <input
                      type="text"
                      value={formData.enquiredFor}
                      onChange={e => setFormData({...formData, enquiredFor: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Student name (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Enquired For (Phone)</label>
                    <input
                      type="tel"
                      value={formData.enquiredForPhone}
                      onChange={e => setFormData({...formData, enquiredForPhone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Student phone (optional)"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Course Enquiry</label>
                  <input
                    type="text"
                    value={formData.courseEnquiry}
                    onChange={e => setFormData({...formData, courseEnquiry: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Full Stack Developer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
                    <select
                      value={formData.source}
                      onChange={e => setFormData({...formData, source: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Justdial">Justdial</option>
                      <option value="Google">Google</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Reference">Reference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="New">New</option>
                      <option value="Followed Up">Followed Up</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-visitor-form"
                className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Save Visitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
