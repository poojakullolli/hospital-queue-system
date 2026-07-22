import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { Lock } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-4">
      <Lock className="w-24 h-24 text-rose-500 mb-6 opacity-80" />
      <h2 className="text-3xl font-bold text-white mb-2">Access Denied</h2>
      <p className="text-slate-400 mb-8 max-w-md">You do not have permission to access this page.</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );
};

export default Unauthorized;
