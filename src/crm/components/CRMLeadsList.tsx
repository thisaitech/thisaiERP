// CRM Leads List Component
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  Funnel,
  Plus,
  Phone,
  Chat,
  Calendar,
  User,
  Building,
  MapPin,
  CurrencyDollar,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  DotsThree,
  Eye,
  Pencil,
  Trash
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useCRM } from '../contexts/CRMContext';
import { CRMLead, CRMFilters, CRMListResponse } from '../types';
import { CRM_STAGES, CRM_PRIORITIES } from '../constants';
import { getLeads } from '../services/crmService';

// Filter Component
interface LeadsFiltersProps {
  filters: CRMFilters;
  onFiltersChange: (filters: CRMFilters) => void;
  onClearFilters: () => void;
}

const LeadsFilters: React.FC<LeadsFiltersProps> = ({ filters, onFiltersChange, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Funnel size={16} />
        Filters
        {(filters.stage?.length || filters.status?.length || filters.priority?.length) && (
          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
            {(filters.stage?.length || 0) + (filters.status?.length || 0) + (filters.priority?.length || 0)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50"
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Stage
                </label>
                <div className="space-y-2">
                  {Object.entries(CRM_STAGES).map(([key, stage]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.stage?.includes(key as any) || false}
                        onChange={(e) => {
                          const newStages = e.target.checked
                            ? [...(filters.stage || []), key]
                            : (filters.stage || []).filter(s => s !== key);
                          onFiltersChange({ ...filters, stage: newStages });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {stage.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Priority
                </label>
                <div className="space-y-2">
                  {Object.entries(CRM_PRIORITIES).map(([key, priority]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(key as any) || false}
                        onChange={(e) => {
                          const newPriorities = e.target.checked
                            ? [...(filters.priority || []), key]
                            : (filters.priority || []).filter(p => p !== key);
                          onFiltersChange({ ...filters, priority: newPriorities });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {priority.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={onClearFilters}
                  className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Lead Card Component
interface LeadCardProps {
  lead: CRMLead;
  onView: (lead: CRMLead) => void;
  onEdit: (lead: CRMLead) => void;
  onDelete: (lead: CRMLead) => void;
  onQuickAction: (action: string, lead: CRMLead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onView, onEdit, onDelete, onQuickAction }) => {
  const [showActions, setShowActions] = useState(false);

  const stageInfo = CRM_STAGES[lead.stage] || { label: lead.stage || 'Unknown', color: 'bg-gray-100 text-gray-800', category: 'active' };
  const priorityInfo = CRM_PRIORITIES[lead.priority] || { label: lead.priority || 'medium', color: 'bg-gray-100 text-gray-800' };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {lead.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {lead.projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
            {priorityInfo.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <DotsThree size={16} />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 w-48">
                <button
                  onClick={() => { onView(lead); setShowActions(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Eye size={16} />
                  View Details
                </button>
                <button
                  onClick={() => { onEdit(lead); setShowActions(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Pencil size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(lead);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">{lead.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">{lead.city}</span>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollar size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {lead.expectedValue ? `₹${lead.expectedValue.toLocaleString()}` : 'Not set'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {lead.sqft ? `${lead.sqft} sqft` : 'Not set'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
            {stageInfo.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
            {lead.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQuickAction('call', lead)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
            title="Call"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => onQuickAction('whatsapp', lead)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
            title="WhatsApp"
          >
            <Chat size={16} />
          </button>
          <button
            onClick={() => onQuickAction('schedule_visit', lead)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
            title="Schedule Visit"
          >
            <Calendar size={16} />
          </button>
        </div>
      </div>

      {lead.nextFollowUpAt && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock size={12} />
            Next follow-up: {format(lead.nextFollowUpAt, 'MMM dd, hh:mm a')}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Main Leads List Component
interface CRMLeadsListProps {
  onCreateLead: () => void;
  onViewLead: (lead: CRMLead) => void;
  onEditLead: (lead: CRMLead) => void;
  onDeleteLead: (lead: CRMLead) => void;
  onQuickAction: (action: string, lead: CRMLead) => void;
}

const CRMLeadsList: React.FC<CRMLeadsListProps> = ({
  onCreateLead,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onQuickAction
}) => {
  const { filters, setFilters, leads: contextLeads, refreshLeads } = useCRM();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Use leads from context and apply filters
  useEffect(() => {
    let filteredLeads = [...contextLeads];

    // Apply filters
    if (filters.stage && filters.stage.length > 0) {
      filteredLeads = filteredLeads.filter(lead => filters.stage!.includes(lead.stage));
    }

    if (filters.status && filters.status.length > 0) {
      filteredLeads = filteredLeads.filter(lead => filters.status!.includes(lead.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      filteredLeads = filteredLeads.filter(lead => filters.priority!.includes(lead.priority));
    }

    setLeads(filteredLeads);
    setTotalPages(Math.ceil(filteredLeads.length / 20));
  }, [contextLeads, filters]);

  // Filter leads based on search term
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;

    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search leads by name, phone, email, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <LeadsFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Leads Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredLeads.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onView={onViewLead}
                onEdit={onEditLead}
                onDelete={onDeleteLead}
                onQuickAction={onQuickAction}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Previous
              </button>

              <span className="px-3 py-2 text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <User size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No leads found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {searchTerm || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first lead'}
          </p>
          <button
            onClick={onCreateLead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Lead
          </button>
        </div>
      )}
    </div>
  );
};

export default CRMLeadsList;
