import React from 'react';
import { getInitials } from '../../utils/helpers';

const Avatar = ({ src, name, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const getGradient = (name) => {
    const gradients = [
      'from-cyan-500 to-blue-500',
      'from-indigo-500 to-purple-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
    ];
    const index = name ? name.charCodeAt(0) % gradients.length : 0;
    return gradients[index];
  };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${sizes[size]} ${!src ? `bg-gradient-to-br ${getGradient(name)}` : 'bg-slate-800'} ${className}`}>
      {src ? (
        <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-white select-none">{getInitials(name)}</span>
      )}
    </div>
  );
};

export default Avatar;
