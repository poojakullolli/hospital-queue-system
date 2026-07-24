import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Hospital, LogIn, ShieldCheck, Stethoscope, User, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

  const { user: currentUser, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect if user is already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser?.role) {
      const target =
        currentUser.role === 'admin'
          ? '/admin/dashboard'
          : currentUser.role === 'doctor'
          ? '/doctor/dashboard'
          : '/patient/dashboard';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  // Detect portal role from path if not provided as prop
  let roleFromPath = defaultPortalRole;
  if (!roleFromPath) {
    if (location.pathname.includes('/admin')) roleFromPath = 'admin';
    else if (location.pathname.includes('/doctor')) roleFromPath = 'doctor';
    else if (location.pathname.includes('/patient')) roleFromPath = 'patient';
  }

  const [selectedRole, setSelectedRole] = useState(roleFromPath || 'patient');
  const [rememberMe, setRememberMe] = useState(true);
  const [backendError, setBackendError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting, touchedFields },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: selectedRole === 'admin' ? 'admin@hospital.com' : selectedRole === 'doctor' ? 'doctor1@example.com' : 'patient1@example.com',
      password: selectedRole === 'admin' ? 'Admin@123' : selectedRole === 'doctor' ? 'Doctor@123' : 'Patient@123',
    },
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

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
      subtitle: 'Medical Staff & Live Queue Manager',
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
    setBackendError('');
    const cfg = roleConfigs[role];
    setValue('email', cfg.demoEmail, { shouldValidate: true, shouldTouch: true });
    setValue('password', cfg.demoPass, { shouldValidate: true, shouldTouch: true });
  };

  const fillDemo = (role) => {
    handleRoleChange(role);
    toast.success(`Loaded ${role.toUpperCase()} demo credentials`);
  };

  const onSubmit = async (data) => {
    setBackendError('');
    try {
      const loggedUser = await login({
        email: data.email.trim(),
        password: data.password,
      });

      toast.success(`Welcome back, ${loggedUser?.name || 'User'}! Login successful.`);

      const targetPath =
        loggedUser?.role === 'admin'
          ? '/admin/dashboard'
          : loggedUser?.role === 'doctor'
          ? '/doctor/dashboard'
          : '/patient/dashboard';

      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 50);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setBackendError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <Card glass className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden z-10 border-slate-700/50">
        <div className="p-8 md:p-10 flex flex-col justify-center relative bg-slate-900/50">
          
          {/* Top Brand & Role */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="flex items-center gap-2 text-white font-bold">
                <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                  <Hospital className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xl">MediQueue</span>
              </Link>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${currentConfig.badgeColor} flex items-center gap-1.5`}>
                <RoleIcon className="w-3.5 h-3.5" /> {currentConfig.title}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{currentConfig.title} Sign In</h1>
            <p className="text-slate-400 text-xs">{currentConfig.subtitle}</p>
          </div>

          {/* Role selector tabs */}
          <div className="flex p-1 bg-slate-800/80 rounded-xl mb-6 border border-slate-700/50">
            {['patient', 'doctor', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  selectedRole === r
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Backend error banner */}
          {backendError && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {backendError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="example@gmail.com"
              {...register('email', {
                required: 'Email is required.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address.',
                },
              })}
              error={errors.email?.message}
              isValid={touchedFields.email && !errors.email && !!emailValue}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required.',
              })}
              error={errors.password?.message}
              isValid={touchedFields.password && !errors.password && !!passwordValue}
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                Remember Me
              </label>
              <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              className={`w-full mt-3 py-2.5 font-semibold text-sm rounded-xl transition-all ${
                !isValid || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : currentConfig.buttonBg
              }`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to {currentConfig.title}
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Demo Credentials:
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
                Access your personalized dashboard, real-time live queue statuses, and complete appointment records securely.
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
