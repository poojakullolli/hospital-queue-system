import React from 'react';

const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-4 py-2 bg-slate-900 border ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-cyan-500 focus:border-cyan-500'} rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
