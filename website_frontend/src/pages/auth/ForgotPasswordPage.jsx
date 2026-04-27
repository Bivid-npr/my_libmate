import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { authAPI } from '../../services/api';
import logoMain from '../../assets/logo_main.svg';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F3EDE3] p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaEnvelope className="text-green-500 text-2xl" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14] mb-2">Check Your Email</h2>
          <p className="text-[#9A8478] mb-6">
            If an account exists for {email}, we've sent a password reset link.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 text-[#C4895A] hover:underline">
            <FaArrowLeft size={12} /> Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#F3EDE3] p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src={logoMain} alt="LibMate" className="h-16 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-[#2C1F14]">Forgot Password?</h2>
          <p className="text-[#9A8478] text-sm mt-2">Enter your email and we'll send you a reset link.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4A3728] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#EAE0D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4895A]"
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2C1F14] text-white rounded-xl hover:bg-[#4A3728] transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-[#C4895A] hover:underline flex items-center justify-center gap-1">
            <FaArrowLeft size={12} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;