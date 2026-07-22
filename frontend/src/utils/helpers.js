import { format, parseISO, differenceInYears } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const formatTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'hh:mm a');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy hh:mm a');
};

export const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'available':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'pending':
    case 'waiting':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'in-progress':
    case 'serving':
      return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    case 'cancelled':
    case 'no-show':
    case 'on-break':
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

export const getStatusLabel = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
};

export const calculateAge = (dob) => {
  if (!dob) return 0;
  const birthDate = typeof dob === 'string' ? parseISO(dob) : dob;
  return differenceInYears(new Date(), birthDate);
};

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};
