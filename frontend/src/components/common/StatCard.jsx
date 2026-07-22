import React from 'react';
import Card from './Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendUp = true, color = 'cyan' }) => {
  const colors = {
    cyan: 'text-cyan-500 bg-cyan-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    amber: 'text-amber-500 bg-amber-500/10'
  };

  return (
    <Card className="p-6 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-${color}-500`}></div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <h4 className="text-3xl font-bold text-white">{value}</h4>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          {trendUp ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-500 mr-1" />
          )}
          <span className={trendUp ? 'text-emerald-500' : 'text-rose-500'}>{trend}</span>
          <span className="text-slate-500 ml-2">vs last month</span>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
