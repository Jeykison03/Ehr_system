import React, { useState, useEffect } from 'react';
import { Bell, Shield, User, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';

const Settings = () => {
  const [settings, setSettings] = useState({ alerts_enabled: true });
  const [profile, setProfile] = useState(null);
  const [doctorCode, setDoctorCode] = useState('');
  const [savingDoctorCode, setSavingDoctorCode] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const [localRole, setLocalRole] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      setLocalProfile(parsed);
      setLocalRole(parsed?.role || null);
    } catch {
      setLocalRole(null);
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const user = getStoredUser();
    if (!user?.id) return;

    const { data: doctorRow } = await supabase.from('doctors').select('*').eq('id', user.id).maybeSingle();
    const { data: patientRow } = await supabase.from('patients').select('*').eq('id', user.id).maybeSingle();
    // Prefer DB data, but fall back to local profile if needed (especially for doctors)
    if (doctorRow) {
      setProfile({
        id: doctorRow.id || localProfile?.id,
        role: 'doctor',
        email: doctorRow.email || localProfile?.email,
        full_name: doctorRow.full_name || localProfile?.full_name,
        doctor_code: doctorRow.doctor_code || localProfile?.doctor_code,
      });
    } else if (patientRow) {
      setProfile({
        id: patientRow.id || localProfile?.id,
        role: 'patient',
        email: patientRow.email || localProfile?.email,
        full_name: patientRow.full_name || localProfile?.full_name,
        doctor_id: patientRow.doctor_id || localProfile?.doctor_id,
      });
    } else {
      setProfile(localProfile);
    }

    // Only patients need notification preferences
    if (patientRow && localRole !== 'doctor') {
      const { data: settingsData } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      if (settingsData) setSettings(settingsData);
      else {
        // Create default settings if not exists
        await supabase.from('user_settings').insert([{ user_id: user.id, alerts_enabled: true }]);
      }
    }
  };

  const connectToDoctor = async () => {
    const code = doctorCode.trim().toUpperCase();
    if (!code) return;
    setSavingDoctorCode(true);
    try {
      const { data: doctorProfile, error: doctorLookupError } = await supabase
        .from('doctors')
        .select('id, doctor_code, full_name')
        .eq('doctor_code', code)
        .maybeSingle();

      if (doctorLookupError) throw doctorLookupError;
      if (!doctorProfile?.id) throw new Error('Invalid Doctor ID / code.');

      const user = getStoredUser();
      if (!user?.id) throw new Error('No authenticated patient found.');
      const { error: assignErr } = await supabase
        .from('patients')
        .update({ doctor_id: doctorProfile.id })
        .eq('id', user.id);

      if (assignErr) throw assignErr;
      alert(`Connected to Dr. ${doctorProfile.full_name}`);
      await fetchSettings();
    } catch (e) {
      alert(e.message || 'Failed to connect to doctor');
    } finally {
      setSavingDoctorCode(false);
    }
  };

  const handleToggleAlerts = async () => {
    const newValue = !settings.alerts_enabled;
    setSettings({ ...settings, alerts_enabled: newValue });
    
    const user = getStoredUser();
    if (!user?.id) return;
    await supabase.from('user_settings').update({ alerts_enabled: newValue }).eq('user_id', user.id);
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and notifications.</p>
      </header>

      <div className="settings-grid">
        <div className="settings-section glass-card">
          <div className="section-header">
            <User size={20} color="var(--primary)" />
            <h3>Profile Information</h3>
          </div>
          <div className="profile-preview">
            <div className="avatar-large">{profile?.full_name?.charAt(0)}</div>
            <div className="profile-info">
              <h4>{profile?.full_name}</h4>
              <p>{profile?.role} Account</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input value={profile?.email || 'user@example.com'} disabled />
          </div>
          {profile?.role === 'doctor' && (
            <div className="form-group">
              <label className="form-label">Doctor ID</label>
              <input value={profile?.doctor_code || ''} disabled />
            </div>
          )}
        </div>

        {profile?.role === 'patient' && (
          <div className="settings-section glass-card">
            <div className="section-header">
              <User size={20} color="var(--primary)" />
              <h3>My Doctor</h3>
            </div>
            <p style={{ marginTop: 0, color: 'var(--secondary)', fontSize: '0.9rem' }}>
              Enter your doctor’s ID to connect your account.
            </p>
            <div className="form-group">
              <label className="form-label">Doctor ID</label>
              <input
                value={doctorCode}
                onChange={(e) => setDoctorCode(e.target.value)}
                placeholder="e.g. DOC102AB"
              />
            </div>
            <button className="btn btn-primary w-full" onClick={connectToDoctor} disabled={savingDoctorCode}>
              {savingDoctorCode ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        )}

        {profile?.role === 'doctor' && (
          <div className="settings-section glass-card">
            <div className="section-header">
              <User size={20} color="var(--primary)" />
              <h3>Doctor ID</h3>
            </div>
            <p style={{ marginTop: 0, color: 'var(--secondary)', fontSize: '0.9rem' }}>
              Share this with patients so they can connect to you.
            </p>
            <div className="form-group">
              <label className="form-label">Your Doctor ID</label>
              <input value={profile?.doctor_code || 'Not set'} disabled />
            </div>
          </div>
        )}

        {profile?.role === 'patient' && localRole !== 'doctor' && (
          <div className="settings-section glass-card">
            <div className="section-header">
              <Bell size={20} color="var(--primary)" />
              <h3>Notification Preferences</h3>
            </div>
            <div className="toggle-option" onClick={handleToggleAlerts}>
              <div className="option-info">
                <h4>Health Alerts</h4>
                <p>Receive automated alerts when persistent symptoms or risks are detected.</p>
              </div>
              <div className="toggle-icon">
                {settings.alerts_enabled ? 
                  <ToggleRight size={32} color="var(--primary)" /> : 
                  <ToggleLeft size={32} color="var(--secondary)" />
                }
              </div>
            </div>
            
            <div className="toggle-option">
              <div className="option-info">
                <h4>Prescription Reminders</h4>
                <p>Get notified when a new prescription is issued.</p>
              </div>
              <div className="toggle-icon">
                <ToggleRight size={32} color="var(--primary)" />
              </div>
            </div>
          </div>
        )}

        <div className="settings-section glass-card">
          <div className="section-header">
            <Shield size={20} color="var(--primary)" />
            <h3>Security</h3>
          </div>
          <button className="btn btn-outline w-full">Change Password</button>
          <button className="btn btn-outline w-full mt-2">Two-Factor Authentication</button>
        </div>
      </div>

      <style jsx>{`
        .settings-page { display: flex; flex-direction: column; gap: 2rem; }
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .settings-section { padding: 1.5rem; }
        
        .profile-preview { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
        .avatar-large { width: 64px; height: 64px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; }
        .profile-info h4 { margin: 0; font-size: 1.1rem; }
        .profile-info p { margin: 0; color: var(--secondary); font-size: 0.85rem; text-transform: capitalize; }
        
        .toggle-option { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; }
        .toggle-option:hover { border-color: var(--primary); background: var(--background); }
        .option-info h4 { margin: 0; font-size: 0.95rem; }
        .option-info p { margin: 0; font-size: 0.8rem; color: var(--secondary); max-width: 240px; }
        
        .mt-2 { margin-top: 0.75rem; }
        .w-full { width: 100%; }
      `}</style>
    </div>
  );
};

export default Settings;
