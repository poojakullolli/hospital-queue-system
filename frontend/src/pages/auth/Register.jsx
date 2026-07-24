import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Hospital, UserPlus, Check, X, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [backendError, setBackendError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting, touchedFields },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password') || '';
  const confirmPasswordValue = watch('confirmPassword') || '';

  // Password Requirement Checks
  const passChecks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue),
  };

  const passScore = Object.values(passChecks).filter(Boolean).length;

  const getStrengthLabel = (score) => {
    if (score === 0) return { label: 'None', color: 'bg-slate-700', text: 'text-slate-400', width: 'w-0' };
    if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400', width: 'w-1/4' };
    if (score === 3) return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-400', width: 'w-2/4' };
    if (score === 4) return { label: 'Strong', color: 'bg-cyan-500', text: 'text-cyan-400', width: 'w-3/4' };
    return { label: 'Very Strong', color: 'bg-emerald-500', text: 'text-emerald-400', width: 'w-full' };
  };

  const strength = getStrengthLabel(passScore);

  // Age validation helper (Must be >= 18)
  const validateAge = (dobString) => {
    if (!dobString) return 'Date of birth is required.';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return 'You must be at least 18 years old.';
    }
    return true;
  };

  const onSubmit = async (data) => {
    setBackendError('');

    if (!acceptedTerms) {
      setTermsError('You must accept Terms and Conditions.');
      return;
    }
    setTermsError('');

    try {
      const payload = {
        name: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        password: data.password,
        role: 'patient',
      };

      await registerUser(payload);

      toast.success('Registration successful.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check your inputs.';
      setBackendError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden my-8">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <Card glass className="w-full max-w-5xl grid md:grid-cols-12 overflow-hidden z-10 border-slate-700/50">
        
        {/* Left Side Banner */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-cyan-950/60 via-slate-900 to-indigo-950/60 border-r border-slate-700/50 p-10 flex-col justify-between relative">
          <div>
            <div className="flex items-center gap-3 text-white font-bold mb-8">
              <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                <Hospital className="w-7 h-7 text-cyan-400" />
              </div>
              <span className="text-2xl">MediQueue</span>
            </div>

            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              Create Your Patient Account.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Join thousands of patients experiencing zero-wait doctor appointments and real-time live queue tracking.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white block">Encrypted Records</span>
                  Your medical history & personal details remain 100% private.
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white block">Live Queue Notifications</span>
                  Receive automated alerts on your turn and estimated wait time.
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-800/80 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>

        {/* Right Form */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-center bg-slate-900/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Patient Registration</h1>
            <p className="text-slate-400 text-xs">Fill in your details below to create your account.</p>
          </div>

          {backendError && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {backendError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Full Name */}
            <Input
              label="Full Name *"
              placeholder="John Doe"
              {...register('fullName', {
                required: 'Full name is required.',
                minLength: { value: 3, message: 'Name must contain at least 3 letters.' },
                pattern: {
                  value: /^[a-zA-Z\s]+$/,
                  message: 'Name must contain only alphabets and spaces.',
                },
              })}
              error={errors.fullName?.message}
              isValid={touchedFields.fullName && !errors.fullName}
            />

            {/* Grid: Email & Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Email Address *"
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
                isValid={touchedFields.email && !errors.email}
              />

              <Input
                label="Phone Number *"
                placeholder="9876543210"
                {...register('phone', {
                  required: 'Phone number is required.',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone number must contain exactly 10 digits.',
                  },
                })}
                error={errors.phone?.message}
                isValid={touchedFields.phone && !errors.phone}
              />
            </div>

            {/* Grid: Date of Birth & Gender */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth *"
                type="date"
                {...register('dateOfBirth', {
                  required: 'Date of birth is required.',
                  validate: validateAge,
                })}
                error={errors.dateOfBirth?.message}
                isValid={touchedFields.dateOfBirth && !errors.dateOfBirth}
              />

              <Select
                label="Gender *"
                {...register('gender', { required: 'Gender is required.' })}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                error={errors.gender?.message}
                isValid={touchedFields.gender && !errors.gender}
              />
            </div>

            {/* Password */}
            <Input
              label="Password *"
              type="password"
              placeholder="e.g. Hospital@123"
              {...register('password', {
                required: 'Password is required.',
                minLength: { value: 8, message: 'Minimum 8 characters required.' },
                validate: () =>
                  passScore === 5 ||
                  'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.',
              })}
              error={errors.password?.message}
              isValid={touchedFields.password && !errors.password && passScore === 5}
            />

            {/* Password Strength Bar & Checklist */}
            {passwordValue && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Password Strength:</span>
                  <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all duration-300 ${strength.width}`} />
                </div>

                {/* Live Requirements Checklist */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passChecks.length ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passChecks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Min 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.uppercase ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passChecks.uppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.lowercase ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passChecks.lowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passChecks.number ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passChecks.number ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} One number
                  </div>
                  <div className={`flex items-center gap-1.5 col-span-2 ${passChecks.special ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passChecks.special ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} One special character (!@#$%^&*)
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <Input
              label="Confirm Password *"
              type="password"
              placeholder="Re-enter password"
              {...register('confirmPassword', {
                required: 'Please confirm your password.',
                validate: (val) => val === watch('password') || 'Passwords do not match.',
              })}
              error={errors.confirmPassword?.message}
              isValid={touchedFields.confirmPassword && !errors.confirmPassword && !!confirmPasswordValue}
            />

            {/* Terms & Privacy Policy Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked) setTermsError('');
                  }}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <span>
                  I accept the <a href="#" className="text-cyan-400 underline hover:text-cyan-300">Terms of Service</a> and <a href="#" className="text-cyan-400 underline hover:text-cyan-300">Privacy Policy</a>.
                </span>
              </label>
              {termsError && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{termsError}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isValid || !acceptedTerms || isSubmitting}
              isLoading={isSubmitting}
              className={`w-full mt-4 py-3 font-bold text-sm rounded-xl transition-all shadow-lg ${
                !isValid || !acceptedTerms || isSubmitting
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
              }`}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Complete Patient Registration
            </Button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-xs md:hidden">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Log in here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
