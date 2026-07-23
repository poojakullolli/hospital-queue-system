import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Hospital, LogIn, ShieldCheck, Stethoscope, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = ({ portalRole: defaultPortalRole }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect role from route (/admin/login, /doctor/login, /patient/login) if not passed as prop
  let roleFromPath = defaultPortalRole;
  if (!roleFromPath) {
    if (location.pathname.includes('/admin')) roleFromPath = 'admin';
    else if (location.pathname.includes('/doctor')) roleFromPath = 'doctor';
    else if (location.pathname.includes('/patient')) roleFromPath = 'patient';
  }

  const [selectedRole, setSelectedRole] = useState(roleFromPath || 'patient');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: selectedRole === 'admin' ? 'admin@hospital.com' : selectedRole === 'doctor' ? 'doctor1@example.com' : 'patient1@example.com',
      password: selectedRole === 'admin' ? 'Admin@123' : selectedRole === 'doctor' ? 'Doctor@123' : 'Patient@123',
    },
  });

  // Role portal configurations
  const roleConfigs = {
    admin: {
      title: 'Admin Portal',
      subtitle: 'Hospital Administration & System Management',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      buttonBg: 'bg-purple-600 hover:bg-purple-500',
      icon: ShieldCheck,
      demoEmail: 'admin@hospital.com',
      demoPass: 'Admin@123',
    },
    doctor: {
      title: 'Doctor Portal',
      subtitle: 'Medical Staff & Queue Management Console',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-500',
      icon: Stethoscope,
      demoEmail: 'doctor1@example.com',
      demoPass: 'Doctor@123',
    },
    patient: {
      title: 'Patient Portal',
      subtitle: 'Appointment Booking & Live Queue Tracker',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      buttonBg: 'bg-cyan-600 hover:bg-cyan-500',
      icon: User,
      demoEmail: 'patient1@example.com',
      demoPass: 'Patient@123',
    },
  };

  const currentConfig = roleConfigs[selectedRole] || roleConfigs.patient;
  const RoleIcon = currentConfig.icon;

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    const cfg = roleConfigs[role];
    setValue('email', cfg.demoEmail);
    setValue('password', cfg.demoPass);
  };

  const fillDemo = (role) => {
    handleRoleChange(role);
    toast.success(`Loaded ${role.toUpperCase()} demo credentials`);
  };

  const onSubmit = async (data) => {
    try {
      const user = await login({
        email: data.email.trim(),
        password: data.password,
      });

      // Role-based redirection after login
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user?.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (error) {
      console.error('Login submit error:', error);
      // Toast message displayed by AuthContext
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Glow decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <Card glass className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden z-10 border-slate-700/50">
        <div className="p-8 md:p-10 flex flex-col justify-center relative bg-slate-900/50">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="flex items-center gap-2 text-white font-bold">
                <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                  <Hospital className="w-6 h-6 text-cyan-400" />
                </div>
                MediQueue
              </Link>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${currentConfig.badgeColor} flex items-center gap-1.5`}>
                <RoleIcon className="w-3.5 h-3.5" /> {currentConfig.title}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{currentConfig.title} Login</h1>
            <p className="text-slate-400 text-sm">{currentConfig.subtitle}</p>
          </div>

          {/* Role selector tabs */}
          <div className="flex p-1 bg-slate-800/80 rounded-xl mb-6 border border-slate-700/50">
            {['patient', 'doctor', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  selectedRole === role
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              {...register('password', { required: 'Password is required' })}
              error={errors.password?.message}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <span className="text-slate-400">Remember session</span>
              </label>
            </div>

            <Button
              type="submit"
              className={`w-full mt-2 ${currentConfig.buttonBg}`}
              isLoading={isSubmitting}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign In to {currentConfig.title}
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 1-Click Demo Login:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('patient')}
                className="px-2 py-1.5 bg-cyan-950/60 border border-cyan-800/40 hover:bg-cyan-900/50 text-cyan-300 rounded-lg text-xs font-medium transition-colors"
              >
                Patient Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('doctor')}
                className="px-2 py-1.5 bg-indigo-950/60 border border-indigo-800/40 hover:bg-indigo-900/50 text-indigo-300 rounded-lg text-xs font-medium transition-colors"
              >
                Doctor Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-2 py-1.5 bg-purple-950/60 border border-purple-800/40 hover:bg-purple-900/50 text-purple-300 rounded-lg text-xs font-medium transition-colors"
              >
                Admin Demo
              </button>
            </div>
          </div>

          {selectedRole === 'patient' && (
            <p className="mt-5 text-center text-slate-400 text-xs">
              Don't have a patient account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Register here
              </Link>
            </p>
          )}
        </div>

        {/* Right Info Box */}
        <div className="hidden md:block bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-l border-slate-700/50 p-10 relative">
          <div className="h-full flex flex-col justify-between relative z-10">
            <div>
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl w-fit mb-6 text-cyan-400">
                <RoleIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                MediQueue {currentConfig.title}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Access your personalized healthcare dashboard, real-time live queue statuses, and complete appointment records.
              </p>
            </div>

            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Default Admin Email:</span>
                <code className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded">admin@hospital.com</code>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Default Admin Pass:</span>
                <code className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded">Admin@123</code>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
