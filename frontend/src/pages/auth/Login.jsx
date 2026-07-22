import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Hospital, LogIn } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const user = await login(data);
      navigate(`/${user.role}/dashboard`);
    } catch (error) {
      // Error is handled in context via toast
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      
      <Card glass className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden z-10 border-slate-700/50">
        <div className="p-8 md:p-12 flex flex-col justify-center relative bg-slate-900/50">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Hospital className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">MediQueue</h1>
            </div>
            <p className="text-slate-400 text-lg">Welcome back. Please login to your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900" />
                <span className="text-slate-400">Remember me</span>
              </label>
              <a href="#" className="text-cyan-400 hover:text-cyan-300">Forgot password?</a>
            </div>

            <Button type="submit" className="w-full mt-4" isLoading={isSubmitting}>
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account? <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">Register here</Link>
          </p>
        </div>
        
        <div className="hidden md:block bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 border-l border-slate-700/50 p-12 relative">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="h-full flex flex-col justify-center relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">Smart Healthcare,<br/>Zero Wait.</h2>
            <p className="text-slate-300 text-lg mb-8">Experience seamless appointment booking and live queue tracking. Your time is valuable.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">1</div>
                <div className="text-sm font-medium text-slate-200">Book Appointment Instantly</div>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">2</div>
                <div className="text-sm font-medium text-slate-200">Track Live Queue Position</div>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">3</div>
                <div className="text-sm font-medium text-slate-200">Arrive Just in Time</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
