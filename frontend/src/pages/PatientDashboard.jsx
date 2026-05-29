import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Plus, ScanLine, Bell, FileText, ChevronRight, AlertTriangle, HeartPulse, User, Clock
} from 'lucide-react';
import { API_BASE } from '../lib/config';

const getSeverityColor = (s) => {
  if (s <= 3) return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
  if (s <= 6) return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
  return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
};

const getSeverityLabel = (s) => {
  if (s <= 3) return 'Mild';
  if (s <= 6) return 'Moderate';
  return 'Severe';
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = user.first_name || user.full_name?.split(' ')[0] || 'Patient';

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/symptoms/patient/${user.id}`);
      const data = await res.json();
      setSymptoms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const recentSymptoms = symptoms.slice(0, 5);
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="pd-root">
      {/* HERO GLOW BACKDROP */}
      <div className="pd-glow-bg" />

      {/* HERO HEADER */}
      <div className="pd-hero-container">
        <div className="pd-hero-glass">
          <div className="pd-hero-left">
            <span className="pd-welcome-pill">{greeting} ☀️</span>
            <h1 className="pd-greeting-text">Hello, {firstName}</h1>
            <p className="pd-subtitle-text">Welcome back to your personalized health portal. Here is your recent activity and navigators.</p>
          </div>
          
          <div className="pd-user-badge" onClick={() => navigate('/profile')}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="pd-badge-img" />
            ) : (
              <div className="pd-badge-avatar"><User size={24} /></div>
            )}
            <div className="pd-badge-info">
              <span className="pd-badge-name">{user.full_name || 'My Profile'}</span>
              <span className="pd-badge-role">Patient account</span>
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM CARDS PORTAL */}
      <div className="pd-portal-grid">
        
        {/* NAVIGATORS FEED */}
        <div className="pd-nav-card glass-panel">
          <div className="pd-panel-header">
            <h2>✨ Quick Navigators</h2>
            <p>Access your medical features and clinical AI analyzers instantly</p>
          </div>

          <div className="pd-navigator-buttons">
            <button className="nav-btn log-symptom" onClick={() => navigate('/symptoms')}>
              <div className="nav-btn-icon"><Plus size={20} /></div>
              <div className="nav-btn-content">
                <span className="nav-btn-title">Log Symptoms</span>
                <span className="nav-btn-desc">Record sugar levels, meals, and check-ins</span>
              </div>
              <ChevronRight size={18} className="nav-btn-arrow" />
            </button>

            <button className="nav-btn scan-prescription" onClick={() => navigate('/prescription-scan')}>
              <div className="nav-btn-icon"><ScanLine size={20} /></div>
              <div className="nav-btn-content">
                <span className="nav-btn-title">AI Prescription Scan</span>
                <span className="nav-btn-desc">Identify drugs & side effects instantly</span>
              </div>
              <ChevronRight size={18} className="nav-btn-arrow" />
            </button>

            <button className="nav-btn view-reports" onClick={() => navigate('/reports')}>
              <div className="nav-btn-icon"><FileText size={20} /></div>
              <div className="nav-btn-content">
                <span className="nav-btn-title">Medical Reports</span>
                <span className="nav-btn-desc">Upload, organize and view diagnostic scans</span>
              </div>
              <ChevronRight size={18} className="nav-btn-arrow" />
            </button>

            <button className="nav-btn reminders" onClick={() => navigate('/reminders')}>
              <div className="nav-btn-icon"><Bell size={20} /></div>
              <div className="nav-btn-content">
                <span className="nav-btn-title">Meds Reminders</span>
                <span className="nav-btn-desc">Configure active alarms and alerts</span>
              </div>
              <ChevronRight size={18} className="nav-btn-arrow" />
            </button>
          </div>
        </div>

        {/* LATEST LOGS FEED */}
        <div className="pd-feed-card glass-panel">
          <div className="pd-panel-header">
            <h2>📋 Latest Symptom Logs</h2>
            <p>Review the timeline of your registered clinical check-ins</p>
          </div>

          {loading ? (
            <div className="pd-loader">
              <div className="pd-spinner" />
              <p>Fetching clinical records...</p>
            </div>
          ) : recentSymptoms.length === 0 ? (
            <div className="pd-empty">
              <AlertTriangle size={36} color="#94a3b8" />
              <p>No logged symptoms. Click <strong>Log Symptoms</strong> to keep records up to date.</p>
            </div>
          ) : (
            <div className="pd-logs-list">
              {recentSymptoms.map((s, i) => {
                const sc = getSeverityColor(s.severity || 5);
                return (
                  <div key={s.id || i} className="pd-log-row">
                    <div className="plr-left">
                      <div className="plr-icon-wrap" style={{ border: `1.5px solid ${sc.text}` }}>
                        <Activity size={16} style={{ color: sc.text }} />
                      </div>
                      <div>
                        <div className="plr-title">{s.description}</div>
                        <div className="plr-meta">
                          {s.occurrence_date && <span>📅 {new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          {s.blood_sugar && <span>🩸 {s.blood_sugar} mg/dL</span>}
                          {s.duration && <span>⏱ {s.duration}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="plr-badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {getSeverityLabel(s.severity || 5)} · {s.severity}/10
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .pd-root {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          padding-bottom: 2rem;
          font-family: 'Inter', sans-serif;
          position: relative;
        }

        /* BLURRED IMAGE BACKDROP */
        .pd-glow-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/dashboard_bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.85);
          opacity: 0.28;
          pointer-events: none;
          z-index: -1;
        }

        /* HERO PANEL */
        .pd-hero-container {
          position: relative;
          z-index: 1;
        }
        .pd-hero-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.25rem;
          padding: 2.25rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.08);
        }
        @media (max-width: 800px) {
          .pd-hero-glass { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .pd-user-badge { width: 100%; box-sizing: border-box; }
        }

        .pd-welcome-pill {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e3a8a;
          background: rgba(30, 58, 138, 0.08);
          padding: 0.3rem 0.875rem;
          border-radius: 999px;
          margin-bottom: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .pd-greeting-text {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.5px;
        }
        .pd-subtitle-text {
          font-size: 0.875rem;
          color: #475569;
          margin: 0.5rem 0 0;
          max-width: 480px;
          line-height: 1.5;
        }

        .pd-user-badge {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.8);
          padding: 0.875rem 1.25rem;
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .pd-user-badge:hover {
          transform: translateY(-1px);
          background: white;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }
        .pd-badge-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .pd-badge-avatar {
          width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb;
          display: flex; align-items: center; justify-content: center;
        }
        .pd-badge-info { display: flex; flex-direction: column; }
        .pd-badge-name { font-weight: 700; font-size: 0.9rem; color: #1f2937; }
        .pd-badge-role { font-size: 0.75rem; color: #94a3b8; }

        /* PORTAL GRID */
        .pd-portal-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 950px) {
          .pd-portal-grid { grid-template-columns: 1fr; }
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 1.25rem;
          padding: 1.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .pd-panel-header { margin-bottom: 1.5rem; }
        .pd-panel-header h2 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0; }
        .pd-panel-header p { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; }

        /* NAVIGATORS */
        .pd-navigator-buttons { display: flex; flex-direction: column; gap: 0.875rem; }
        .nav-btn {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.25rem; border-radius: 1rem; border: 1.5px solid rgba(255,255,255,0.8);
          cursor: pointer; text-align: left; transition: all 0.2s; background: rgba(255,255,255,0.6);
          width: 100%; box-sizing: border-box; position: relative;
        }
        .nav-btn:hover {
          transform: translateX(3px);
          background: white;
          border-color: var(--primary-hover, #2563eb);
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.08);
        }
        .nav-btn-icon {
          width: 44px; height: 44px; border-radius: 0.75rem; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .nav-btn-content { flex: 1; display: flex; flex-direction: column; }
        .nav-btn-title { font-weight: 700; font-size: 0.95rem; color: #0f172a; }
        .nav-btn-desc { font-size: 0.78rem; color: #64748b; margin-top: 0.15rem; }
        .nav-btn-arrow { color: #94a3b8; transition: transform 0.2s; }
        .nav-btn:hover .nav-btn-arrow { transform: translateX(2px); color: #2563eb; }

        /* COLORS FOR BUTTONS */
        .log-symptom .nav-btn-icon { background: #eff6ff; color: #2563eb; }
        .scan-prescription .nav-btn-icon { background: #f3e8ff; color: #9333ea; }
        .view-reports .nav-btn-icon { background: #ecfdf5; color: #059669; }
        .reminders .nav-btn-icon { background: #fff7ed; color: #ea580c; }

        /* LATEST LOGS ROW */
        .pd-logs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pd-log-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.875rem 1rem; border-radius: 0.875rem;
          background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);
          gap: 1rem; transition: background 0.15s;
        }
        .pd-log-row:hover { background: rgba(255,255,255,0.8); }
        .plr-left { display: flex; align-items: center; gap: 0.875rem; min-width: 0; }
        .plr-icon-wrap { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .plr-title { font-weight: 600; color: #1e293b; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .plr-meta { display: flex; gap: 0.75rem; color: #64748b; font-size: 0.75rem; margin-top: 0.15rem; }
        .plr-badge { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }

        .pd-loader, .pd-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 4rem 1rem; gap: 1rem; color: #94a3b8; text-align: center; font-size: 0.9rem;
        }
        .pd-spinner {
          width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.05);
          border-top-color: #2563eb; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
