import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from './PageWrapper';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const storedToken = token || localStorage.getItem('mediqueue_token');
  let activeUser = user;
  if (!activeUser) {
    try {
      const storedRaw = localStorage.getItem('mediqueue_user');
      if (storedRaw) activeUser = JSON.parse(storedRaw);
    } catch (e) {}
  }

  const isAuth = isAuthenticated || (!!storedToken && !!activeUser);

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  const userRole = activeUser?.role;
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <PageWrapper>
      <Outlet />
    </PageWrapper>
  );
};

export default ProtectedRoute;
