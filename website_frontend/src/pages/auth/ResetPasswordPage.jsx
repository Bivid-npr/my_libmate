import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaLock, FaCheckCircle } from 'react-icons/fa';
import { authAPI } from '../../services/api';
import logoMain from '../../assets/logo_main.svg';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F3EDE3] p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-500 text-2xl" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Password Reset!</h2>
          <p className="text-[#9A8478] mb-6">Your password has been changed successfully.</p>
          <Link to="/login" className="text-[#C4895A] hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F3EDE3] p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src={logoMain} alt="LibMate" className="h-16 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Reset Password</h2>
          <p className="text-[#9A8478] text-sm mt-2">Enter your new password</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4A3728] mb-1">New Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#EAE0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                placeholder="Min 6 characters"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4A3728] mb-1">Confirm Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8478]" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#EAE0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
                placeholder="Repeat password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2C1F14] text-white rounded-xl hover:bg-[#4A3728] transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;