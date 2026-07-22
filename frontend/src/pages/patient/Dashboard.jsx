import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/common/StatCard';
import { Calendar, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import Button from '../../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { appointmentApi } from '../../api/appointmentApi';
import Spinner from '../../components/common/Spinner';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await appointmentApi.getMyAppointments();
        const appointments = data.appointments || [];
        setStats({
          total: appointments.length,
          upcoming: appointments.filter(a => a.status === 'pending').length,
          completed: appointments.filter(a => a.status === 'completed').length,
          cancelled: appointments.filter(a => a.status === 'cancelled').length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {user?.fullName}!</h1>
          <p className="text-slate-400 mt-1">Here is a summary of your appointments.</p>
        </div>
        <Button onClick={() => navigate('/patient/book')}>
          <Calendar className="w-5 h-5 mr-2" />
          Book Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Appointments" value={stats.total} icon={Calendar} color="cyan" />
        <StatCard title="Upcoming" value={stats.upcoming} icon={Clock} color="amber" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="emerald" />
        <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="rose" />
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/patient/appointments')}>
            View All <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        <div className="text-center text-slate-500 py-10">
          No recent activity found.
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
