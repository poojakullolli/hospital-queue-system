import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-4">
      <h1 className="text-9xl font-black text-slate-800 tracking-tighter">404</h1>
      <h2 className="text-3xl font-bold text-white mt-4 mb-2">Page Not Found</h2>
      <p className="text-slate-400 mb-8 max-w-md">The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/"><Button>Go Home</Button></Link>
    </div>
  );
};

export default NotFound;
