/**
 * Reports — Admin page for generating, viewing, printing, and exporting hospital reports.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, Download, Printer, Filter, Calendar,
  RefreshCw, DollarSign, CheckCircle, Clock, Users, Building
} from 'lucide-react';

import { adminApi } from '../../api/adminApi';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import { formatDate, formatCurrency } from '../../utils/helpers';

const REPORT_TYPES = [
  { key: 'appointments', label: 'Appointments Summary', icon: Calendar },
  { key: 'revenue', label: 'Revenue & Billing Report', icon: DollarSign },
  { key: 'department', label: 'Department Utilization', icon: Building },
  { key: 'attendance', label: 'Patient Attendance & No-Shows', icon: CheckCircle },
];

const Reports = () => {
  const [reportType, setReportType] = useState('appointments');
  const [dateRange, setDateRange] = useState('30d'); // 'today' | '7d' | '30d' | 'this_month'
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [aptRes, deptRes] = await Promise.allSettled([
        adminApi.getAllAppointments({ limit: 200 }),
        adminApi.getDepartments(),
      ]);

      if (aptRes.status === 'fulfilled') {
        const apts = aptRes.value.data?.data?.appointments || aptRes.value.data?.appointments || [];
        setAppointments(apts);
      }
      if (deptRes.status === 'fulfilled') {
        const depts = deptRes.value.data?.data || deptRes.value.data || [];
        setDepartments(depts);
      }
    } catch (err) {
      toast.error('Failed to fetch report data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter appointments by selected dateRange
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      const d = new Date(a.date);
      if (dateRange === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (dateRange === '7d') {
        const past = new Date();
        past.setDate(past.getDate() - 7);
        return d >= past;
      }
      if (dateRange === '30d') {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        return d >= past;
      }
      if (dateRange === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [appointments, dateRange]);

  // ── CSV Export ──
  const exportCSV = () => {
    let headers = [];
    let rows = [];

    if (reportType === 'appointments') {
      headers = ['Appointment ID', 'Date', 'Time', 'Patient Name', 'Doctor Name', 'Specialty', 'Status', 'Fee (INR)'];
      rows = filteredAppointments.map((a) => [
        a._id,
        formatDate(a.date),
        `${a.timeSlot?.start || ''} - ${a.timeSlot?.end || ''}`,
        `"${a.patientId?.name || 'Patient'}"`,
        `"${a.doctorId?.userId?.name || a.doctorId?.name || 'Doctor'}"`,
        `"${a.doctorId?.specialty || 'General'}"`,
        a.status,
        a.consultationFee || a.doctorId?.fee || 0,
      ]);
    } else if (reportType === 'revenue') {
      const completed = filteredAppointments.filter((a) => a.status === 'completed');
      headers = ['Transaction ID', 'Date', 'Patient Name', 'Doctor', 'Fee (INR)', 'Payment Status'];
      rows = completed.map((a) => [
        a._id,
        formatDate(a.date),
        `"${a.patientId?.name || 'Patient'}"`,
        `"${a.doctorId?.userId?.name || a.doctorId?.name || 'Doctor'}"`,
        a.consultationFee || a.doctorId?.fee || 0,
        a.paymentStatus || 'completed',
      ]);
    } else if (reportType === 'department') {
      headers = ['Department Name', 'Total Bookings', 'Completed Visits', 'Total Revenue (INR)'];
      const deptMap = {};
      filteredAppointments.forEach((a) => {
        const spec = a.doctorId?.specialty || 'General';
        deptMap[spec] = deptMap[spec] || { count: 0, completed: 0, revenue: 0 };
        deptMap[spec].count++;
        if (a.status === 'completed') {
          deptMap[spec].completed++;
          deptMap[spec].revenue += a.consultationFee || a.doctorId?.fee || 0;
        }
      });
      rows = Object.entries(deptMap).map(([name, d]) => [
        `"${name}"`,
        d.count,
        d.completed,
        d.revenue,
      ]);
    } else if (reportType === 'attendance') {
      headers = ['Patient Name', 'Doctor', 'Date', 'Status', 'Cancellation Reason'];
      rows = filteredAppointments.map((a) => [
        `"${a.patientId?.name || 'Patient'}"`,
        `"${a.doctorId?.userId?.name || a.doctorId?.name || 'Doctor'}"`,
        formatDate(a.date),
        a.status,
        `"${a.cancellationReason || ''}"`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hospital_Report_${reportType}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully!');
  };

  // ── Print Report ──
  const printReport = () => {
    const title = REPORT_TYPES.find((r) => r.key === reportType)?.label || 'Hospital Report';
    const printContent = `
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        .header { border-bottom: 3px solid #0891b2; padding-bottom: 16px; margin-bottom: 24px; }
        h1 { margin: 0; color: #0891b2; font-size: 24px; }
        p { margin: 4px 0; font-size: 13px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; color: #0f172a; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; }
      </style></head><body>
      <div class="header">
        <h1>🏥 MediQueue Hospital — ${title}</h1>
        <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
        <p>Filter: Date Range (${dateRange.toUpperCase()}) | Total Records: ${filteredAppointments.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Patient</th><th>Doctor / Specialty</th><th>Status</th><th>Fee</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAppointments.map((a) => `
            <tr>
              <td>${formatDate(a.date)}</td>
              <td>${a.patientId?.name || 'Patient'}</td>
              <td>Dr. ${a.doctorId?.userId?.name || a.doctorId?.name || 'Doctor'} (${a.doctorId?.specialty || 'General'})</td>
              <td>${a.status.toUpperCase()}</td>
              <td>₹${a.consultationFee || a.doctorId?.fee || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer"><p>Official MediQueue System Report. Confidential.</p></div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.print();
  };

  if (loading) return <Spinner size="lg" className="mt-24" />;

  const completedCount = filteredAppointments.filter((a) => a.status === 'completed').length;
  const totalRev = filteredAppointments
    .filter((a) => a.status === 'completed')
    .reduce((s, a) => s + (a.consultationFee || a.doctorId?.fee || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" /> Hospital Reports & Export
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Generate printable reports and export CSV datasets for accounting and administration.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={printReport}>
            <Printer className="w-4 h-4 mr-2" /> Print Report
          </Button>
          <Button variant="primary" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REPORT_TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setReportType(key)}
            className={`p-4 rounded-xl border flex flex-col items-start gap-2 transition-all ${
              reportType === key
                ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
            }`}
          >
            <Icon className={`w-5 h-5 ${reportType === key ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {/* Date Range Selector & Summary */}
      <Card className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-400 font-semibold">Time Horizon:</span>
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: 'Last 7 Days' },
            { key: '30d', label: 'Last 30 Days' },
            { key: 'this_month', label: 'This Month' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                dateRange === key
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-6 text-xs">
          <div>
            <span className="text-slate-500">Total Bookings:</span>{' '}
            <strong className="text-white text-sm">{filteredAppointments.length}</strong>
          </div>
          <div>
            <span className="text-slate-500">Completed:</span>{' '}
            <strong className="text-emerald-400 text-sm">{completedCount}</strong>
          </div>
          <div>
            <span className="text-slate-500">Revenue:</span>{' '}
            <strong className="text-cyan-400 text-sm">{formatCurrency(totalRev)}</strong>
          </div>
        </div>
      </Card>

      {/* Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Doctor & Specialty</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Fee (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No records found for the selected time horizon.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 text-slate-300 text-xs">{formatDate(a.date)}</td>
                    <td className="px-6 py-4 text-white font-semibold">{a.patientId?.name || 'Patient'}</td>
                    <td className="px-6 py-4 text-slate-300 text-xs">
                      Dr. {a.doctorId?.userId?.name || a.doctorId?.name || 'Doctor'}
                      <span className="text-slate-500 block">{a.doctorId?.specialty || 'General'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        a.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : a.status === 'cancelled'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-cyan-400">
                      {formatCurrency(a.consultationFee || a.doctorId?.fee || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
