// src/components/Layout/LoadingScreen.jsx
import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#9A8478]">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;