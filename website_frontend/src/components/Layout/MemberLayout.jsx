import React from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Navbar from './Navbar';

const MemberLayout = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAF7F2]">
        <Navbar />
        <main className="pt-16 pb-16">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default MemberLayout;