import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Hospital, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.fullName || data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'patient',
      };
      const user = await registerUser(payload);
      if (user?.role) {
        navigate(`/${user.role}/dashboard`);
      }
    } catch (error) {
      console.error('Registration submit error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      
      <Card glass className="w-full max-w-4xl grid md:grid-cols-2 overflow-hidden z-10 border-slate-700/50">
        <div className="hidden md:block bg-gradient-to-br from-indigo-900/40 to-cyan-900/40 border-r border-slate-700/50 p-12 relative">
          <div className="h-full flex flex-col justify-center relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">Join MediQueue Today.</h2>
            <p className="text-slate-300 text-lg mb-8">Create an account to start booking appointments and skip the physical waiting room.</p>
          </div>
        </div>
        
        <div className="p-8 md:p-12 flex flex-col justify-center relative bg-slate-900/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Create an Account</h1>
            <p className="text-slate-400">Fill in your details below.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              {...register('fullName', { required: 'Name is required' })}
              error={errors.fullName?.message}
            />
            
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              {...register('email', { required: 'Email is required' })}
              error={errors.email?.message}
            />

            <Input
              label="Phone Number"
              placeholder="+1 234 567 8900"
              {...register('phone', { required: 'Phone is required' })}
              error={errors.phone?.message}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
              error={errors.password?.message}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword', { 
                required: 'Please confirm password',
                validate: val => val === watch('password') || 'Passwords do not match'
              })}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              <UserPlus className="w-5 h-5 mr-2" />
              Register
            </Button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Already have an account? <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Log in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
