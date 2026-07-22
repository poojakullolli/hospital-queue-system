import React from 'react';

const Card = ({ className = '', children, glass = false, hover = false }) => {
  const baseClass = glass 
    ? 'glass-panel rounded-xl' 
    : 'bg-slate-800 border border-slate-700 rounded-xl shadow-xl';
  
  const hoverClass = hover ? 'transition-transform duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10' : '';

  return (
    <div className={`${baseClass} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
