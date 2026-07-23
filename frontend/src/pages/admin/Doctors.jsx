/**
 * Doctors — Admin view for managing medical staff, specialties, fees, and working hours.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Stethoscope, Search, Star, Clock, DollarSign,
  Edit, RefreshCw, CheckCircle, Coffee, Filter, Plus
} from 'lucide-react';

import { doctorApi } from '../../api/doctorApi';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import { formatCurrency, getInitials } from '../../utils/helpers';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');

  // Edit Modal State
  const [editModal, setEditModal] = useState({ open: false, doctor: null });
  const [editForm, setEditForm] = useState({
    specialty: '',
    experience: 0,
    fee: 0,
    consultationDuration: 15,
    isAvailable: true,
    isOnBreak: false,
    bio: '',
  });
  const [updating, setUpdating] = useState(false);

  const fetchDoctors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await doctorApi.getAllDoctors({ limit: 100 });
      const list = data?.data?.doctors || data?.doctors || [];
      setDoctors(list);
    } catch (err) {
      toast.error('Failed to load doctors list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const specialties = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialty).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSpecialty = specialtyFilter === 'all' || doc.specialty === specialtyFilter;
      const q = search.toLowerCase().trim();
      const docName = doc.userId?.name || doc.name || '';
      const matchesQuery =
        !q || docName.toLowerCase().includes(q) || (doc.specialty && doc.specialty.toLowerCase().includes(q));
      return matchesSpecialty && matchesQuery;
    });
  }, [doctors, specialtyFilter, search]);

  const handleOpenEdit = (doc) => {
    setEditModal({ open: true, doctor: doc });
    setEditForm({
      specialty: doc.specialty || '',
      experience: doc.experience || 0,
      fee: doc.fee || 0,
      consultationDuration: doc.consultationDuration || 15,
      isAvailable: doc.isAvailable !== false,
      isOnBreak: !!doc.isOnBreak,
      bio: doc.bio || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.doctor) return;
    setUpdating(true);
    try {
      await doctorApi.updateDoctor(editModal.doctor._id, editForm);
      toast.success('Doctor details updated successfully.');
      setEditModal({ open: false, doctor: null });
      fetchDoctors(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update doctor profile.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAvailability = async (doc) => {
    try {
      await doctorApi.toggleAvailability(doc._id);
      toast.success(`Availability status updated for Dr. ${doc.userId?.name || 'Doctor'}`);
      fetchDoctors(true);
    } catch (err) {
      toast.error('Failed to toggle availability.');
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-cyan-400" /> Doctor Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage medical staff profiles, schedules, consultation duration, and fees.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchDoctors(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs text-slate-400 font-semibold shrink-0">Specialty:</span>
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSpecialtyFilter(spec)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                specialtyFilter === spec
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search doctor or specialty…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {filteredDoctors.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No doctors found matching your criteria.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => {
            const name = doc.userId?.name || doc.name || 'Doctor';
            return (
              <Card key={doc._id} className="p-6 relative flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-lg text-white">
                        {getInitials(name)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Dr. {name}</h3>
                        <p className="text-xs text-cyan-400 font-medium">{doc.specialty || 'General Practitioner'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleAvailability(doc)}
                      title="Toggle availability"
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border transition-all ${
                        doc.isAvailable !== false
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {doc.isAvailable !== false ? 'Available' : 'Off Duty'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {doc.bio || 'No professional bio provided yet.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <p className="text-slate-500">Experience</p>
                      <p className="text-slate-200 font-semibold mt-0.5">{doc.experience || 0} years</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Consultation Fee</p>
                      <p className="text-cyan-400 font-semibold mt-0.5">{formatCurrency(doc.fee || 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Avg Duration</p>
                      <p className="text-slate-200 font-semibold mt-0.5">{doc.consultationDuration || 15} mins</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Rating</p>
                      <p className="text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {doc.rating ? doc.rating.toFixed(1) : '4.5'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    {doc.isOnBreak ? '☕ Currently on break' : '🟢 Ready for queue'}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(doc)}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Profile
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Edit Doctor Modal ── */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, doctor: null })}
        title={`Edit Profile — Dr. ${editModal.doctor?.userId?.name || 'Doctor'}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Specialty</label>
              <input
                type="text"
                value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Experience (Years)</label>
              <input
                type="number"
                value={editForm.experience}
                min="0"
                onChange={(e) => setEditForm({ ...editForm, experience: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                value={editForm.fee}
                min="0"
                onChange={(e) => setEditForm({ ...editForm, fee: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duration Per Slot (Minutes)</label>
              <select
                value={editForm.consultationDuration}
                onChange={(e) => setEditForm({ ...editForm, consultationDuration: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bio & Experience Summary</label>
            <textarea
              rows={3}
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditModal({ open: false, doctor: null })}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" isLoading={updating} onClick={handleSaveEdit}>
              Save Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DoctorManagement;
