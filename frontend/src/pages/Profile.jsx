import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Calendar, Heart, Shield, Camera, Mail, Loader, CheckCircle, AlertCircle, Edit, Stethoscope, Sparkles } from 'lucide-react';
import { API_BASE } from '../lib/config';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // New Assigned Doctor update state
  const [newDoctorCode, setNewDoctorCode] = useState('');
  const [updatingDoctor, setUpdatingDoctor] = useState(false);
  const [doctorSuccess, setDoctorSuccess] = useState('');
  const [doctorError, setDoctorError] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    age: '',
    address: '',
    avatar_url: '',
  });

  const sessionUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (sessionUser?.id) {
      fetchProfile();
    }
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/patients/${sessionUser.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not load profile');
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone_number: data.phone_number || '',
        age: data.age || '',
        address: data.address || '',
        avatar_url: data.avatar_url || '',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, avatar_url: reader.result }));
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/patients/${sessionUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone_number: form.phone_number,
          age: parseInt(form.age) || 0,
          address: form.address,
          avatar_url: form.avatar_url,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update profile');

      setSuccess(true);
      const updatedUser = {
        ...sessionUser,
        first_name: data.data.first_name,
        last_name: data.data.last_name,
        full_name: data.data.full_name,
        phone_number: data.data.phone_number,
        age: data.data.age,
        address: data.data.address,
        avatar_url: data.data.avatar_url,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfile({
        ...profile,
        ...data.data,
      });
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Connect / change assigned doctor
  const handleChangeDoctor = async (e) => {
    e.preventDefault();
    const code = newDoctorCode.trim();
    if (!code) return;
    setUpdatingDoctor(true);
    setDoctorError('');
    setDoctorSuccess('');
    try {
      const res = await fetch(`${API_BASE}/patients/${sessionUser.id}/connect-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_code: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to connect to doctor.');

      setDoctorSuccess(data.message);
      // Sync local storage assigned doctor ID
      const updatedUser = { ...sessionUser, doctor_id: data.doctor_id };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setNewDoctorCode('');
      // Reload profile
      await fetchProfile();
      setTimeout(() => setDoctorSuccess(''), 3000);
    } catch (err) {
      setDoctorError(err.message || 'Could not change doctor.');
    } finally {
      setUpdatingDoctor(false);
    }
  };

  if (loading) {
    return (
      <div className="prof-loading">
        <Loader size={32} className="prof-spin" />
        <p>Loading your clinical profile...</p>
        <style jsx>{`
          .prof-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #94a3b8; gap: 1rem; }
          .prof-spin { animation: spin 1s linear infinite; color: #2563eb; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const initials = `${form.first_name.charAt(0)}${form.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="prof-root">
      {/* DECORATIVE BLURRED IMAGE BACKDROP */}
      <div className="prof-glow-bg" />

      {/* HEADER SECTION */}
      <header className="page-header prof-header-glass animate-fade-in">
        <div className="prof-header-title">
          <Sparkles size={24} className="sparkle-icon" />
          <h1>My Health Profile</h1>
        </div>
        <p>Manage your personal credentials, contact details, home address, and connect with your assigned doctor.</p>
      </header>

      <div className="prof-grid">
        {/* LEFT PROFILE CARD */}
        <div className="prof-left">
          <form onSubmit={handleSubmit} className="glass-panel prof-form-card">
            {error && <div className="prof-alert error"><AlertCircle size={16} /> {error}</div>}
            {success && <div className="prof-alert success"><CheckCircle size={16} /> Profile updated successfully!</div>}

            {/* AVATAR TRIGGER */}
            <div className="avatar-section">
              <div className="avatar-container" onClick={() => document.getElementById('avatar-input').click()}>
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="avatar-img" />
                ) : (
                  <div className="avatar-fallback">{initials || 'P'}</div>
                )}
                <div className="avatar-hover">
                  <Camera size={18} />
                  <span>Update Photo</span>
                </div>
                {uploadingPhoto && <div className="avatar-spinner"><Loader size={16} className="prof-spin" /></div>}
              </div>
              <input id="avatar-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <h3>{profile?.full_name || 'Patient Profile'}</h3>
              <span className="profile-role-badge">Patient Account</span>
            </div>

            {/* FORM FIELDS */}
            <div className="form-fields-grid">
              <div className="form-group">
                <label><User size={14} /> First Name</label>
                <input
                  type="text" required
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label><User size={14} /> Last Name</label>
                <input
                  type="text" required
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label><Mail size={14} /> Email Address</label>
                <input type="email" value={profile?.email || ''} disabled className="disabled-input" />
              </div>

              <div className="form-group">
                <label><Phone size={14} /> Phone Number</label>
                <input
                  type="tel" required
                  value={form.phone_number}
                  onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label><Calendar size={14} /> Age (Years)</label>
                <input
                  type="number" required min="0"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                />
              </div>

              <div className="form-group full-width">
                <label><MapPin size={14} /> Home Address</label>
                <input
                  type="text"
                  placeholder="Street, Apt, City, Zip Code..."
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? <><Loader size={16} className="prof-spin" /> Saving...</> : '✓ Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT CLINICAL CARD */}
        <div className="prof-right">
          <div className="glass-panel doctor-info-card">
            <div className="dic-header">
              <Heart size={22} color="#ec4899" />
              <h3>Assigned Doctor</h3>
            </div>
            
            <div className="doctor-badge-section">
              <div className="doctor-avatar">
                {profile?.doctor_name?.replace('Dr. ', '').charAt(0) || 'D'}
              </div>
              <div>
                <h4 className="doctor-name">{profile?.doctor_name || 'No Doctor Assigned'}</h4>
                <p className="doctor-specialty">Primary Care Physician</p>
              </div>
            </div>

            <div className="doctor-details-list">
              <div className="doc-detail-row">
                <span className="dd-label">Doctor ID / Code</span>
                <span className="dd-value code">{profile?.doctor_code || '—'}</span>
              </div>
              <div className="doc-detail-row">
                <span className="dd-label">Contact Email</span>
                <span className="dd-value">{profile?.doctor_email || '—'}</span>
              </div>
            </div>

            {/* ASSIGNED DOCTOR EDIT OPTION */}
            <div className="change-doctor-section">
              <div className="cds-header">
                <Stethoscope size={16} color="#2563eb" />
                <h4>Change Assigned Doctor</h4>
              </div>
              {doctorError && <div className="prof-alert error mini"><AlertCircle size={12} /> {doctorError}</div>}
              {doctorSuccess && <div className="prof-alert success mini"><CheckCircle size={12} /> {doctorSuccess}</div>}

              <form onSubmit={handleChangeDoctor} className="doctor-change-form">
                <input
                  type="text"
                  required
                  placeholder="Enter new Doctor Code..."
                  value={newDoctorCode}
                  onChange={e => setNewDoctorCode(e.target.value)}
                />
                <button type="submit" className="btn-change-doctor" disabled={updatingDoctor}>
                  {updatingDoctor ? '...' : 'Change'}
                </button>
              </form>
            </div>

            <div className="dic-footer">
              <Shield size={16} color="#10b981" />
              <span>Your medical records are fully encrypted and only visible to you and your assigned provider.</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .prof-root { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; position: relative; }
        
        /* BLURRED BACKGROUND BACKDROP */
        .prof-glow-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/dashboard_bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.85);
          opacity: 0.35;
          pointer-events: none;
          z-index: -1;
        }

        .prof-header-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.25rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.05);
        }
        .prof-header-title { display: flex; align-items: center; gap: 0.5rem; }
        .sparkle-icon { color: #f59e0b; animation: float 3s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .prof-header-glass h1 { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; }
        .prof-header-glass p { color: #475569; margin: 0.35rem 0 0; font-size: 0.875rem; line-height: 1.5; }

        .prof-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.5rem; position: relative; z-index: 1; }
        @media (max-width: 950px) { .prof-grid { grid-template-columns: 1fr; } }

        /* GLASS PANELS */
        .glass-panel {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 1.25rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
        }

        /* PROFILE FORM CARD */
        .prof-form-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        
        .avatar-section { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 1.5rem; }
        .avatar-container {
          width: 96px; height: 96px; border-radius: 50%; overflow: hidden;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.2); border: 3px solid white;
        }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-fallback { font-size: 2.25rem; font-weight: 800; letter-spacing: -1px; }
        .avatar-hover {
          position: absolute; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s; color: white; gap: 0.25rem; font-size: 0.75rem; font-weight: 600;
        }
        .avatar-container:hover .avatar-hover { opacity: 1; }
        .avatar-spinner { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }

        .profile-role-badge { font-size: 0.75rem; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 0.25rem 0.75rem; border-radius: 999px; }

        /* FORM INPUTS */
        .form-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
        @media (max-width: 600px) { .form-fields-grid { grid-template-columns: 1fr; } }
        
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 0.35rem; }
        .form-group input {
          border: 1.5px solid #e2e8f0; border-radius: 0.625rem; padding: 0.7rem 0.875rem;
          font-size: 0.9rem; color: #0f172a; background: white; transition: all 0.15s;
          font-family: inherit; box-sizing: border-box; width: 100%;
        }
        .form-group input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .disabled-input { background: rgba(241, 245, 249, 0.5) !important; color: #64748b !important; border-color: #e2e8f0 !important; cursor: not-allowed; }

        .form-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
        .btn-save {
          padding: 0.75rem 1.75rem; border-radius: 0.625rem; border: none;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          transition: opacity 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }
        .btn-save:hover { opacity: 0.95; }

        /* ALERTS */
        .prof-alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 0.625rem; font-size: 0.85rem; font-weight: 500; }
        .prof-alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .prof-alert.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
        .prof-alert.mini { padding: 0.4rem 0.75rem; font-size: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; }

        /* RIGHT CLINICAL CARD */
        .doctor-info-card { padding: 1.75rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .dic-header { display: flex; align-items: center; gap: 0.625rem; }
        .dic-header h3 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
        
        .doctor-badge-section { display: flex; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .doctor-avatar {
          width: 52px; height: 52px; border-radius: 50%; background: #fce7f3; color: #db2777;
          font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; justify-content: center;
        }
        .doctor-name { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .doctor-specialty { font-size: 0.8rem; color: #94a3b8; margin: 0.2rem 0 0; }

        .doctor-details-list { display: flex; flex-direction: column; gap: 0.875rem; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 1.25rem; }
        .doc-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
        .dd-label { color: #64748b; }
        .dd-value { color: #1e293b; font-weight: 600; }
        .dd-value.code { background: rgba(255,255,255,0.8); padding: 0.2rem 0.6rem; border-radius: 6px; font-family: monospace; font-size: 0.8rem; font-weight: 600; color: #2563eb; border: 1px solid #e2e8f0; }

        /* CHANGE DOCTOR FORM */
        .change-doctor-section { display: flex; flex-direction: column; gap: 0.5rem; }
        .cds-header { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
        .cds-header h4 { font-size: 0.825rem; font-weight: 700; color: #475569; margin: 0; }
        .doctor-change-form { display: flex; gap: 0.5rem; }
        .doctor-change-form input {
          flex: 1; border: 1.5px solid #e2e8f0; border-radius: 0.5rem; padding: 0.55rem 0.75rem;
          font-size: 0.85rem; background: white; color: #0f172a; outline: none; transition: all 0.15s;
        }
        .doctor-change-form input:focus { border-color: #2563eb; }
        .btn-change-doctor {
          padding: 0.55rem 1rem; border-radius: 0.5rem; border: none;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: opacity 0.2s;
        }
        .btn-change-doctor:hover { opacity: 0.95; }

        .dic-footer { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.75rem; color: #64748b; line-height: 1.4; background: rgba(255,255,255,0.4); padding: 0.75rem; border-radius: 0.625rem; border: 1px solid rgba(255,255,255,0.5); }
        .prof-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Profile;
