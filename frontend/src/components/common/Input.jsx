import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

const Input = React.forwardRef(({
  label,
  error,
  isValid,
  type = 'text',
  className = '',
  onChange,
  onKeyDown,
  onKeyUp,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const isPasswordType = type === 'password';
  const inputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  const handleKeyEvent = (e) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="w-full relative">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-slate-300">{label}</label>
          {capsLockOn && isPasswordType && (
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> Caps Lock is ON
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          ref={ref}
          type={inputType}
          onKeyDown={(e) => {
            handleKeyEvent(e);
            if (onKeyDown) onKeyDown(e);
          }}
          onKeyUp={(e) => {
            handleKeyEvent(e);
            if (onKeyUp) onKeyUp(e);
          }}
          onChange={onChange}
          className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-950/10'
              : isValid
              ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-950/10'
              : 'border-slate-700/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 hover:border-slate-600'
          } ${isPasswordType || isValid || error ? 'pr-11' : ''} ${className}`}
          {...props}
        />

        <div className="absolute right-3 flex items-center gap-2 pointer-events-auto">
          {/* Green Checkmark when Valid */}
          {isValid && !error && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}

          {/* Red Alert Circle when Error */}
          {error && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}

          {/* Show / Hide Password Toggle */}
          {isPasswordType && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-200 focus:outline-none transition-colors p-0.5"
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-rose-400 font-medium flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
