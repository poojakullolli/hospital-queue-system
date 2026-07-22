import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-slate-800 rounded-xl bg-slate-900/50 border-dashed">
      {Icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
