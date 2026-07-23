/**
 * Departments — Admin page for managing hospital medical departments.
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Building, Plus, Edit, Trash2, Activity,
  RefreshCw, Stethoscope, CheckCircle, XCircle
} from 'lucide-react';

import { adminApi } from '../../api/adminApi';
import { doctorApi } from '../../api/doctorApi';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

const DEPT_ICONS = ['🩺', '❤️', '🧠', '🦴', '🧴', '🧒', '👁️', '👂', '🏥'];

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Modal State
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', icon: '🩺', headDoctorId: '' });
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editModal, setEditModal] = useState({ open: false, dept: null });
  const [editForm, setEditForm] = useState({ name: '', description: '', icon: '🩺', headDoctorId: '' });
  const [updating, setUpdating] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ open: false, dept: null });
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [deptRes, docRes] = await Promise.allSettled([
        adminApi.getDepartments(),
        doctorApi.getAllDoctors({ limit: 100 }),
      ]);

      if (deptRes.status === 'fulfilled') {
        const list = deptRes.value.data?.data || deptRes.value.data || [];
        setDepartments(list);
      }
      if (docRes.status === 'fulfilled') {
        const docs = docRes.value.data?.data?.doctors || docRes.value.data?.doctors || [];
        setDoctors(docs);
      }
    } catch (err) {
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreate = async () => {
    if (!addForm.name) {
      toast.error('Department name is required.');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createDepartment(addForm);
      toast.success('Department created successfully!');
      setAddModal(false);
      setAddForm({ name: '', description: '', icon: '🩺', headDoctorId: '' });
      fetchDepartments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (dept) => {
    setEditModal({ open: true, dept });
    setEditForm({
      name: dept.name || '',
      description: dept.description || '',
      icon: dept.icon || '🩺',
      headDoctorId: dept.headDoctorId?._id || dept.headDoctorId || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.dept) return;
    setUpdating(true);
    try {
      await adminApi.updateDepartment(editModal.dept._id, editForm);
      toast.success('Department updated successfully.');
      setEditModal({ open: false, dept: null });
      fetchDepartments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update department.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.dept) return;
    setDeleting(true);
    try {
      await adminApi.deleteDepartment(deleteModal.dept._id);
      toast.success('Department deactivated.');
      setDeleteModal({ open: false, dept: null });
      fetchDepartments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate department.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-emerald-400" /> Hospital Departments
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage clinical departments, assigned head doctors, and descriptions.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchDepartments(true)}
            disabled={refreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Department
          </Button>
        </div>
      </div>

      {/* Department Cards Grid */}
      {departments.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No departments configured yet. Click "Add Department" to create one.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const headDocName = dept.headDoctorId?.userId?.name || dept.headDoctorId?.name || null;
            return (
              <Card key={dept._id} className="p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                      {dept.icon || '🩺'}
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      dept.isActive !== false
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {dept.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{dept.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {dept.description || 'No department description provided.'}
                  </p>

                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Head Doctor:</span>
                      <span className="text-cyan-400 font-semibold">{headDocName ? `Dr. ${headDocName}` : 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEdit(dept)}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => setDeleteModal({ open: true, dept })}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Deactivate
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add Department Modal ── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New Department" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Department Name *</label>
            <input
              type="text"
              placeholder="e.g. Cardiology"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Icon</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DEPT_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setAddForm({ ...addForm, icon })}
                  className={`text-xl p-2 rounded-xl border ${
                    addForm.icon === icon
                      ? 'bg-cyan-500/20 border-cyan-500'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Head Doctor</label>
            <select
              value={addForm.headDoctorId}
              onChange={(e) => setAddForm({ ...addForm, headDoctorId: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Select Head Doctor (Optional)</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.userId?.name || d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of department services..."
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" isLoading={creating} onClick={handleCreate}>
              Create Department
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Department Modal ── */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, dept: null })}
        title="Edit Department"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Department Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Icon</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DEPT_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setEditForm({ ...editForm, icon })}
                  className={`text-xl p-2 rounded-xl border ${
                    editForm.icon === icon
                      ? 'bg-cyan-500/20 border-cyan-500'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Head Doctor</label>
            <select
              value={editForm.headDoctorId}
              onChange={(e) => setEditForm({ ...editForm, headDoctorId: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Select Head Doctor (Optional)</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.userId?.name || d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditModal({ open: false, dept: null })}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" isLoading={updating} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, dept: null })}
        title="Deactivate Department"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to deactivate <strong className="text-white">{deleteModal.dept?.name}</strong>?
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteModal({ open: false, dept: null })}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" isLoading={deleting} onClick={handleDeleteConfirm}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Departments;
