import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const Select = React.forwardRef(({ label, error, isValid, options = [], className = '', ...props }, ref) => {
  return (
    <div className="w-full relative">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <div className="relative flex items-center">
        <select
          ref={ref}
          className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm appearance-none ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-950/10'
              : isValid
              ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-950/10'
              : 'border-slate-700/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 hover:border-slate-600'
          } ${isValid || error ? 'pr-11' : ''} ${className}`}
          {...props}
        >
          <option value="" disabled hidden>Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 flex items-center gap-2 pointer-events-none">
          {isValid && !error && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {error && <AlertCircle className="w-4 h-4 text-rose-400" />}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
