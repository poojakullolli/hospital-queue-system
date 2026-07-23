/**
 * Patients — Admin page for viewing and managing patient accounts.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  UserCheck, Search, Calendar, Phone, Mail,
  Eye, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';

import { adminApi } from '../../api/adminApi';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { formatDate, getInitials } from '../../utils/helpers';

const PatientManagement = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState({ open: false, patient: null });

  const fetchPatients = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await adminApi.getAllUsers({ role: 'patient', limit: 200 });
      const list = data?.data || data?.users || [];
      setPatients(list);
    } catch (err) {
      toast.error('Failed to load patients list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [patients, search]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const paginatedPatients = filteredPatients.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleToggleStatus = async (patient) => {
    try {
      await adminApi.updateUser(patient._id, { isActive: !patient.isActive });
      toast.success(`Patient account ${!patient.isActive ? 'activated' : 'deactivated'}.`);
      fetchPatients(true);
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-400" /> Patient Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Registered patients and consultation records overview.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchPatients(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-between items-center gap-4">
        <div className="text-sm text-slate-400 font-medium">
          Total Registered Patients: <span className="text-white font-bold">{patients.length}</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search patient by name or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient Name</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Registration Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No patients match your search.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{p.name}</p>
                          <p className="text-slate-400 text-xs">{p.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-xs">
                      {p.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {p.phone}
                        </div>
                      ) : (
                        <span className="text-slate-600">Not provided</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                          p.isActive !== false
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {p.isActive !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formatDate(p.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailModal({ open: true, patient: p })}
                      >
                        <Eye className="w-4 h-4 text-cyan-400 mr-1" /> Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
          <p>Showing {paginatedPatients.length} of {filteredPatients.length} patients</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((pg) => pg - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 font-semibold text-white">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((pg) => pg + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, patient: null })}
        title="Patient Details"
        size="md"
      >
        {detailModal.patient && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                {getInitials(detailModal.patient.name)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{detailModal.patient.name}</h3>
                <p className="text-xs text-slate-400">{detailModal.patient.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-medium text-white">{detailModal.patient.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-semibold text-emerald-400">
                  {detailModal.patient.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Member Since:</span>
                <span className="font-medium text-white">{formatDate(detailModal.patient.createdAt)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailModal({ open: false, patient: null })}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientManagement;
