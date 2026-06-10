import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Plus, ScanLine, Bell, FileText, ChevronRight,
  AlertTriangle, HeartPulse, Clock, MessageSquare, Stethoscope
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { API_BASE } from '../lib/config';

const getSeverityColor = (s) => {
  if (s <= 3) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' };
  if (s <= 6) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
  return { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' };
};
const getSeverityLabel = (s) => s <= 3 ? 'Mild' : s <= 6 ? 'Moderate' : 'Severe';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [symptoms,  setSymptoms]  = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  const user       = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName  = user.first_name || user.full_name?.split(' ')[0] || 'Patient';
  const lastName   = user.last_name  || user.full_name?.split(' ').slice(1).join(' ') || '';
  const fullName   = `${firstName} ${lastName}`.trim();
  const initials   = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase();

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const greetIcon = hour < 12 ? '🌤️' : hour < 18 ? '☀️' : '🌙';

  useEffect(() => {
    if (user?.id) {
      fetchSymptoms();
      fetchAlerts();
    }
  }, []);

  const fetchSymptoms = async () => {
    try {
      const res  = await fetch(`${API_BASE}/symptoms/patient/${user.id}`);
      const data = await res.json();
      setSymptoms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res  = await fetch(`${API_BASE}/alerts/patient/${user.id}`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data.filter(a => a.doctor_comment) : []);
    } catch (e) {
      console.error(e);
    }
  };

  const recentSymptoms = symptoms.slice(0, 5);

  const sugarData = symptoms
    .filter(s => s.blood_sugar !== null && s.blood_sugar !== undefined && Number(s.blood_sugar) > 0)
    .map(s => ({
      date: s.occurrence_date ? new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
      sugar: Number(s.blood_sugar),
      description: s.description || 'Check-in'
    }))
    .reverse();

  return (
    <div className="pd-root">

      {/* ── HERO NAME CARD ── */}
      <div className="pd-hero-card">
        <div className="pd-hero-left">
          <div className="pd-greeting-pill">
            <span className="pd-pill-dot" />
            {greetIcon} {greeting}
          </div>
          <h1 className="pd-hero-title">
            Hello, <span className="pd-hero-name">{firstName}</span> 👋
          </h1>
          <p className="pd-hero-sub">
            Your health snapshot for today. Everything looks good — keep it up.
          </p>
        </div>

        <div
          className="pd-hero-badge"
          onClick={() => navigate('/profile')}
          title="View profile"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="pd-badge-img" />
          ) : (
            <div className="pd-badge-initials">{initials}</div>
          )}
          <div className="pd-badge-info">
            <span className="pd-badge-name">{fullName || firstName}</span>
            <span className="pd-badge-role">Patient account</span>
          </div>
          <ChevronRight size={16} className="pd-badge-arrow" />
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="pd-portal-grid">

        {/* SUGAR LEVEL GRAPH */}
        {sugarData.length > 0 ? (
          <div className="sugar-graph-container glass-panel">
            <div className="pd-panel-header">
              <h2>🩸 Blood Sugar Level History</h2>
              <p>Tracking glycemic trends across logged clinical check-ins (mg/dL)</p>
            </div>
            <div style={{ width: '100%', height: 280, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sugarData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="sugarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(99, 102, 241, 0.15)" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    stroke="#94a3b8"
                    style={{ fontSize: '0.75rem', fontWeight: 500 }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    stroke="#94a3b8"
                    style={{ fontSize: '0.75rem', fontWeight: 500 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="custom-chart-tooltip">
                            <p className="ct-date">{payload[0].payload.date}</p>
                            <p className="ct-sugar">
                              <span className="ct-sugar-dot" />
                              Blood Sugar: <strong>{payload[0].value} mg/dL</strong>
                            </p>
                            <p className="ct-desc">{payload[0].payload.description}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sugar" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#sugarGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="sugar-graph-empty glass-panel">
            <div className="pd-panel-header">
              <h2>🩸 Blood Sugar Level History</h2>
              <p>Tracking glycemic trends across logged clinical check-ins</p>
            </div>
            <div className="sge-content">
              <HeartPulse size={36} color="#cbd5e1" style={{ animation: 'pulse 2s infinite' }} />
              <p>No blood sugar level records found in your symptoms data.</p>
            </div>
          </div>
        )}

        {/* LATEST SYMPTOM LOGS */}
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
                      <div className="plr-icon-wrap" style={{ border: `1.5px solid ${sc.text}`, background: sc.bg }}>
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
              <button className="pd-view-all-btn" onClick={() => navigate('/symptoms')}>
                View All Symptoms <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── DOCTOR COMMENTS ── */}
      {alerts.length > 0 && (
        <div className="glass-panel pd-comments-panel">
          <div className="pd-panel-header">
            <h2><Stethoscope size={18} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />Doctor's Comments</h2>
            <p>Responses your doctor has left on your alerts</p>
          </div>
          <div className="pd-comments-list">
            {alerts.map(a => (
              <div key={a.id} className="pd-comment-card">
                <div className="pcc-top">
                  <div className="pcc-icon"><MessageSquare size={15} /></div>
                  <div className="pcc-meta">
                    <span className="pcc-symptom">{a.symptom_description || a.message}</span>
                    {a.replied_at && (
                      <span className="pcc-date">
                        <Clock size={11} />
                        {new Date(a.replied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pcc-comment">
                  <span className="pcc-dr-label">Dr. Reply:</span>
                  {a.doctor_comment}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        /* ── Root ── */
        .pd-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          font-family: 'Inter', sans-serif;
        }

        /* ── Hero Card (glass box with name) ── */
        .pd-hero-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 1.5rem;
          padding: 2rem 2.25rem;
          box-shadow: 0 8px 32px rgba(99, 102, 241, 0.08), 0 2px 8px rgba(0,0,0,0.04);
        }
        @media (max-width: 800px) {
          .pd-hero-card { flex-direction: column; align-items: flex-start; }
        }
        .pd-hero-left { display: flex; flex-direction: column; gap: 0.4rem; }

        .pd-greeting-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.4rem;
        }
        .pd-pill-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
          animation: pillPulse 2.2s ease-in-out infinite;
        }
        @keyframes pillPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
          50%       { box-shadow: 0 0 0 7px rgba(99,102,241,0.05); }
        }

        .pd-hero-title {
          font-size: 2.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.8px;
          line-height: 1.15;
        }
        .pd-hero-name {
          background: linear-gradient(120deg, #6366f1, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pd-hero-sub {
          font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.6;
        }

        /* Profile chip */
        .pd-hero-badge {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.6rem 1rem 0.6rem 0.6rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(99,102,241,0.15);
          cursor: pointer; transition: all 0.22s; flex-shrink: 0;
          backdrop-filter: blur(8px);
        }
        .pd-hero-badge:hover {
          background: white;
          border-color: rgba(99,102,241,0.35);
          box-shadow: 0 4px 20px rgba(99,102,241,0.12);
          transform: translateY(-1px);
        }
        .pd-badge-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid white; }
        .pd-badge-initials {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1rem; flex-shrink: 0;
        }
        .pd-badge-info { display: flex; flex-direction: column; gap: 1px; }
        .pd-badge-name { font-weight: 600; font-size: 0.875rem; color: #1e293b; }
        .pd-badge-role { font-size: 0.72rem; color: #94a3b8; }
        .pd-badge-arrow { color: #94a3b8; transition: transform 0.2s; }
        .pd-hero-badge:hover .pd-badge-arrow { transform: translateX(2px); color: #6366f1; }

        /* ── Portal Grid ── */
        .pd-portal-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 1.25rem;
          position: relative; z-index: 1;
        }
        @media (max-width: 950px) { .pd-portal-grid { grid-template-columns: 1fr; } }

        /* ── Glass Panel ── */
        .glass-panel {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 1.25rem;
          padding: 1.75rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }
        .pd-panel-header { margin-bottom: 1.5rem; }
        .pd-panel-header h2 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
        .pd-panel-header p  { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; }

        /* Navigators */
        .pd-navigator-buttons { display: flex; flex-direction: column; gap: 0.75rem; }
        .nav-btn {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.875rem 1.125rem; border-radius: 1rem;
          border: 1.5px solid rgba(255,255,255,0.8);
          cursor: pointer; text-align: left; transition: all 0.2s;
          background: rgba(255,255,255,0.5);
          width: 100%; box-sizing: border-box;
        }
        .nav-btn:hover {
          transform: translateX(4px);
          background: rgba(255,255,255,0.9);
          border-color: rgba(99,102,241,0.25);
          box-shadow: 0 4px 14px rgba(99,102,241,0.08);
        }
        .nav-btn-icon {
          width: 44px; height: 44px; border-radius: 0.75rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
        }
        .nav-btn-content { flex: 1; display: flex; flex-direction: column; }
        .nav-btn-title { font-weight: 700; font-size: 0.9rem; color: #0f172a; }
        .nav-btn-desc  { font-size: 0.76rem; color: #64748b; margin-top: 0.1rem; }
        .nav-btn-arrow { color: #94a3b8; transition: transform 0.2s; }
        .nav-btn:hover .nav-btn-arrow { transform: translateX(2px); color: #6366f1; }

        .log-symptom      .nav-btn-icon { background: #eff6ff; color: #2563eb; }
        .scan-prescription .nav-btn-icon { background: #f3e8ff; color: #9333ea; }
        .view-reports      .nav-btn-icon { background: #ecfdf5; color: #059669; }
        .reminders         .nav-btn-icon { background: #fff7ed; color: #ea580c; }

        /* Logs */
        .pd-logs-list { display: flex; flex-direction: column; gap: 0.65rem; }
        .pd-log-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.75rem 0.875rem; border-radius: 0.875rem;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.7);
          gap: 0.875rem; transition: background 0.15s;
        }
        .pd-log-row:hover { background: rgba(255,255,255,0.85); }
        .plr-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
        .plr-icon-wrap { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .plr-title { font-weight: 600; color: #1e293b; font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
        .plr-meta  { display: flex; gap: 0.65rem; color: #64748b; font-size: 0.72rem; margin-top: 0.1rem; flex-wrap: wrap; }
        .plr-badge { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }

        .pd-view-all-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.3rem;
          padding: 0.6rem; border-radius: 0.75rem;
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.12);
          color: #6366f1; font-weight: 600; font-size: 0.8rem;
          cursor: pointer; transition: all 0.18s; font-family: inherit;
          margin-top: 0.25rem;
        }
        .pd-view-all-btn:hover { background: rgba(99,102,241,0.12); }

        /* Doctor Comments */
        .pd-comments-panel { position: relative; z-index: 1; }
        .pd-comments-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pd-comment-card {
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 1rem;
          padding: 1rem 1.125rem;
          transition: background 0.15s;
        }
        .pd-comment-card:hover { background: rgba(255,255,255,0.8); }
        .pcc-top { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 0.625rem; }
        .pcc-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(99,102,241,0.1); color: #6366f1;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pcc-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .pcc-symptom { font-weight: 600; font-size: 0.875rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pcc-date { display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: #94a3b8; }
        .pcc-comment {
          font-size: 0.85rem; color: #374151;
          background: rgba(99,102,241,0.05);
          border-radius: 0.625rem;
          padding: 0.65rem 0.875rem;
          border-left: 3px solid #6366f1;
          line-height: 1.55;
        }
        .pcc-dr-label { font-weight: 700; color: #6366f1; margin-right: 0.4rem; font-size: 0.8rem; }

        /* Loader / Empty */
        .pd-loader, .pd-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3.5rem 1rem; gap: 1rem;
          color: #94a3b8; text-align: center; font-size: 0.875rem;
        }
        .pd-spinner {
          width: 24px; height: 24px;
          border: 3px solid rgba(99,102,241,0.1);
          border-top-color: #6366f1; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Sugar level chart styling */
        .sugar-graph-container {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .sugar-graph-empty {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          min-height: 382px;
        }
        .sge-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 0.75rem;
          color: #94a3b8;
          text-align: center;
          font-size: 0.85rem;
          padding: 2rem 0;
        }
        .sge-content p { margin: 0; }

        .custom-chart-tooltip {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          color: white;
          font-size: 0.78rem;
          font-family: 'Inter', sans-serif;
        }
        .ct-date {
          margin: 0 0 0.35rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .ct-sugar {
          margin: 0 0 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
        }
        .ct-sugar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6366f1;
          display: inline-block;
        }
        .ct-sugar strong {
          color: #38bdf8;
        }
        .ct-desc {
          margin: 0;
          color: #cbd5e1;
          font-style: italic;
          font-size: 0.72rem;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
