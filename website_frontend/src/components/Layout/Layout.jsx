import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from './LoadingScreen';
import Navbar from './Navbar';
import SearchBar from './SearchBar';

const Layout = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Navbar />
      <SearchBar />
      <main className="pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;