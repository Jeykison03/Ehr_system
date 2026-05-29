import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, User, ToggleLeft, ToggleRight, Loader, Edit3, Key } from 'lucide-react';
import { API_BASE } from '../lib/config';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ alerts_enabled: true });
  const [profile, setProfile] = useState(null);
  const [doctorCode, setDoctorCode] = useState('');
  const [savingDoctorCode, setSavingDoctorCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const profRes = await fetch(`${API_BASE}/patients/${user.id}`);
      const profData = await profRes.json();
      if (profRes.ok) {
        setProfile(profData);
      }

      if (user.role === 'patient') {
        const setRes = await fetch(`${API_BASE}/patients/${user.id}/settings`);
        const setData = await setRes.json();
        if (setRes.ok) {
          setSettings(setData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const connectToDoctor = async () => {
    const code = doctorCode.trim();
    if (!code) return;
    setSavingDoctorCode(true);
    try {
      const res = await fetch(`${API_BASE}/patients/${user.id}/connect-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_code: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to connect to doctor.');

      alert(data.message);
      const updatedUser = { ...user, doctor_id: data.doctor_id };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setDoctorCode('');
      fetchSettings();
    } catch (e) {
      alert(e.message || 'Failed to connect to doctor');
    } finally {
      setSavingDoctorCode(false);
    }
  };

  const handleToggleAlerts = async () => {
    const newValue = !settings.alerts_enabled;
    setSettings({ ...settings, alerts_enabled: newValue });
    try {
      await fetch(`${API_BASE}/patients/${user.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts_enabled: newValue })
      });
    } catch (e) {
      console.error('Failed to toggle settings preference.');
    }
  };

  if (loading) {
    return (
      <div className="set-loader">
        <Loader size={32} className="set-spin" />
        <p>Loading security preferences...</p>
        <style jsx>{`
          .set-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #94a3b8; gap: 1rem; }
          .set-spin { animation: spin 1s linear infinite; color: #2563eb; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* GLOW BACKGROUND BACKDROP */}
      <div className="settings-glow-bg" />

      <header className="page-header settings-header-glass">
        <h1>Settings</h1>
        <p>Configure notifications, connect to doctors, and secure your EHR profile account.</p>
      </header>

      <div className="settings-grid">
        {/* SECTION 1: PROFILE SUMMARY & EDIT LINK */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <User size={18} color="#2563eb" />
            <h3>👤 Profile & Accounts</h3>
          </div>
          
          <div className="profile-preview">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="avatar-large-img" />
            ) : (
              <div className="avatar-large">{profile?.full_name?.charAt(0) || 'P'}</div>
            )}
            <div className="profile-info">
              <h4>{profile?.full_name}</h4>
              <p className="p-email">{profile?.email}</p>
              <button className="btn-edit-profile" onClick={() => navigate('/profile')}>
                <Edit3 size={12} /> Edit Full Profile
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: CONNECTED DOCTOR */}
        {profile?.role === 'patient' && (
          <div className="settings-section glass-panel">
            <div className="section-header">
              <User size={18} color="#2563eb" />
              <h3>🏥 Primary Provider Connection</h3>
            </div>
            {profile?.doctor_name && profile.doctor_name !== 'No Doctor Assigned' ? (
              <div className="active-doc-connection">
                <span className="adc-label">Primary Care:</span>
                <strong className="adc-name">{profile.doctor_name}</strong>
                <span className="adc-code">{profile.doctor_code}</span>
              </div>
            ) : (
              <p className="doc-desc">Connect with a physician to share symptoms history, receive digital prescriptions, and monitor diagnostic data.</p>
            )}
            <div className="form-group">
              <label className="form-label">Doctor Code</label>
              <div className="doc-connect-row">
                <input
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value)}
                  placeholder="E.g. DOC102"
                />
                <button className="btn-connect" onClick={connectToDoctor} disabled={savingDoctorCode}>
                  {savingDoctorCode ? '...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: NOTIFICATIONS ON/OFF */}
        {profile?.role === 'patient' && (
          <div className="settings-section glass-panel">
            <div className="section-header">
              <Bell size={18} color="#2563eb" />
              <h3>🔔 Notifications Alerts</h3>
            </div>
            
            <div className="toggle-option" onClick={handleToggleAlerts}>
              <div className="option-info">
                <h4>Health Warnings Alerts</h4>
                <p>Notify me if my logged check-in sugar levels or severity spikes require care warnings.</p>
              </div>
              <div className="toggle-icon">
                {settings.alerts_enabled ? 
                  <ToggleRight size={30} color="#2563eb" /> : 
                  <ToggleLeft size={30} color="#94a3b8" />
                }
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ACCOUNT SECURITY */}
        <div className="settings-section glass-panel">
          <div className="section-header">
            <Shield size={18} color="#2563eb" />
            <h3>🔒 Account Security</h3>
          </div>
          <p className="sec-desc">Update passwords or active encryption preferences to secure patient confidentiality.</p>
          <button className="btn-security">
            <Key size={14} /> Change Security Password
          </button>
        </div>
      </div>

      <style jsx>{`
        .settings-page { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; position: relative; }
        
        /* BLURRED BACKGROUND BACKDROP */
        .settings-glow-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/dashboard_bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.88);
          opacity: 0.28;
          pointer-events: none;
          z-index: -1;
        }

        .settings-header-glass {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.25rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .settings-header-glass h1 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; }
        .settings-header-glass p { color: #475569; margin: 0.35rem 0 0; font-size: 0.875rem; line-height: 1.5; }

        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; position: relative; z-index: 1; }
        @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
        
        /* GLASS PANEL */
        .glass-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header { display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 0.75rem; }
        .section-header h3 { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0; }
        
        .profile-preview { display: flex; align-items: center; gap: 1.25rem; }
        .avatar-large { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; }
        .avatar-large-img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        
        .profile-info { display: flex; flex-direction: column; align-items: flex-start; }
        .profile-info h4 { margin: 0; font-size: 0.95rem; color: #0f172a; font-weight: 700; }
        .p-email { margin: 0.15rem 0 0.5rem; color: #64748b; font-size: 0.8rem; }
        
        .btn-edit-profile {
          display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem;
          background: #eff6ff; color: #2563eb; border: 1px solid rgba(37,99,235,0.1);
          border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-edit-profile:hover { background: #dbeafe; }

        .active-doc-connection {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.65rem 0.875rem; background: #ecfdf5; border: 1px solid #a7f3d0;
          border-radius: 0.625rem; font-size: 0.825rem;
        }
        .adc-label { color: #065f46; }
        .adc-name { color: #047857; font-weight: 700; }
        .adc-code { background: white; padding: 0.15rem 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.75rem; font-weight: 600; color: #047857; border: 1px solid #a7f3d0; }
        .doc-desc, .sec-desc { font-size: 0.8rem; color: #64748b; line-height: 1.5; margin: 0; }

        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-label { font-size: 0.78rem; font-weight: 600; color: #475569; }
        
        .doc-connect-row { display: flex; gap: 0.5rem; }
        .doc-connect-row input {
          flex: 1; border: 1.5px solid #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.875rem;
          font-size: 0.875rem; background: white; color: #0f172a; outline: none; transition: border-color 0.15s;
        }
        .doc-connect-row input:focus { border-color: #2563eb; }
        .btn-connect {
          padding: 0.6rem 1.25rem; border-radius: 0.5rem; border: none;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: opacity 0.2s;
        }
        .btn-connect:hover { opacity: 0.95; }

        /* TOGGLE OPTION */
        .toggle-option { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem; border: 1.5px solid rgba(255,255,255,0.8); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.4); }
        .toggle-option:hover { border-color: #2563eb; background: white; }
        .option-info h4 { margin: 0; font-size: 0.875rem; color: #0f172a; font-weight: 700; }
        .option-info p { margin: 0.15rem 0 0; font-size: 0.75rem; color: #64748b; line-height: 1.4; max-width: 240px; }

        /* SECURITY BTN */
        .btn-security {
          display: flex; align-items: center; gap: 0.5rem; justify-content: center;
          width: 100%; padding: 0.65rem; border: 1.5px solid #cbd5e1; background: white;
          color: #475569; font-weight: 600; font-size: 0.85rem; border-radius: 0.625rem;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-security:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }

        .set-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Settings;
