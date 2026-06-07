import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, AlertCircle, Loader, KeyRound, Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '../lib/config';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);

  // Get token from URL
  const query = new URLSearchParams(window.location.search);
  const token = query.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. No token found. Please check your email or request a new reset link.');
    }
  }, [token]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate('/login');
    }
  }, [success, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Cannot submit: missing password reset token.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reset password.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      {/* Background Orbs */}
      <div className="orb orb-blue" />
      <div className="orb orb-cyan" />
      
      <div className="reset-card glass-card">
        <div className="logo-header">
          <div className="logo-icon">
            <KeyRound size={28} color="#0ea5e9" />
          </div>
          <h2>Reset Password</h2>
          <p>Create a secure new password for your EHR account</p>
        </div>

        {error && (
          <div className="alert-box error-glass">
            <AlertCircle size={18} className="alert-icon" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="success-wizard-box">
            <div className="success-glowing-border">
              <ShieldCheck size={40} className="success-icon-pulse" />
              <h3>Password Reset Successful!</h3>
              <p>Your password has been updated.</p>
              <div className="redirect-badge">
                Redirecting to login in {countdown}s...
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reset-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  disabled={loading || !token}
                />
                <button 
                  type="button" 
                  className="eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  disabled={!token}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={loading || !token}
                />
                <button 
                  type="button" 
                  className="eye-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  disabled={!token}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading || !token}>
              {loading ? (
                <>
                  <Loader size={18} className="spin-icon" /> Saving New Password...
                </>
              ) : (
                "Save Password"
              )}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .reset-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #0b0f19;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          padding: 1.5rem;
        }

        /* Ambient Glowing Background Orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }
        .orb-blue {
          width: 350px;
          height: 350px;
          background: #2563eb;
          top: 15%;
          left: 10%;
        }
        .orb-cyan {
          width: 300px;
          height: 300px;
          background: #0ea5e9;
          bottom: 15%;
          right: 10%;
        }

        .glass-card {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 2.5rem;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          z-index: 10;
        }

        .logo-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }
        .logo-header h2 {
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          margin: 0;
        }
        .logo-header p {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0.35rem 0 0;
        }

        .alert-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1.1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .error-glass {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        }
        .alert-icon {
          flex-shrink: 0;
        }
        .alert-box p {
          margin: 0;
        }

        /* Success Blinking border box */
        .success-wizard-box {
          text-align: center;
          padding: 0.5rem;
        }
        .success-glowing-border {
          border: 2px solid rgba(16, 185, 129, 0.4);
          background: rgba(16, 185, 129, 0.05);
          border-radius: 1rem;
          padding: 2rem 1.5rem;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
          animation: blink-border 1.5s infinite alternate;
        }
        @keyframes blink-border {
          0% {
            border-color: rgba(16, 185, 129, 0.2);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.05);
          }
          100% {
            border-color: #10b981;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
          }
        }
        .success-icon-pulse {
          color: #10b981;
          margin-bottom: 1rem;
          animation: scale-up 0.5s ease-out;
        }
        @keyframes scale-up {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-glowing-border h3 {
          color: #ffffff;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
        }
        .success-glowing-border p {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0 0 1.5rem;
        }
        .redirect-badge {
          display: inline-block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #10b981;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 0.4rem 1rem;
          border-radius: 2rem;
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          color: #cbd5e1;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          color: #64748b;
          pointer-events: none;
        }
        .input-wrapper input {
          width: 100%;
          padding: 0.75rem 2.8rem 0.75rem 2.5rem;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: #ffffff;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-wrapper input:focus {
          border-color: #0ea5e9;
          background: rgba(15, 23, 42, 0.75);
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
        }
        .eye-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          transition: color 0.15s;
        }
        .eye-btn:hover {
          color: #ffffff;
        }

        .submit-btn {
          margin-top: 0.5rem;
          width: 100%;
          padding: 0.8rem;
          border-radius: 0.75rem;
          border: none;
          background: linear-gradient(135deg, #1952e3, #0ea5e9);
          color: white;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: opacity 0.2s, transform 0.1s;
        }
        .submit-btn:hover {
          opacity: 0.95;
        }
        .submit-btn:active {
          transform: scale(0.98);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
