import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ variant = 'primary', size = 'md', isLoading = false, disabled = false, className = '', children, type = 'button', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';
  
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white focus:ring-cyan-500 shadow-lg shadow-cyan-500/30',
    secondary: 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/30',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-lg shadow-rose-500/30',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
    outline: 'bg-transparent border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <button type={type} className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
