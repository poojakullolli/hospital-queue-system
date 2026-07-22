import React from 'react';

const Select = React.forwardRef(({ label, error, options = [], className = '', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <select
        ref={ref}
        className={`w-full px-4 py-2 bg-slate-900 border ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-cyan-500 focus:border-cyan-500'} rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${className}`}
        {...props}
      >
        <option value="" disabled hidden>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
