import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from './LoadingScreen';

const AuthLayout = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;