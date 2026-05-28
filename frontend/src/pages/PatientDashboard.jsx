import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, TrendingUp, Calendar, Plus,
  ScanLine, Bell, ChevronRight, AlertTriangle,
  HeartPulse, BrainCircuit, Droplets, Clock
} from 'lucide-react';
import { API_BASE } from '../lib/config';

const getSeverityColor = (s) => {
  if (s <= 3) return { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' };
  if (s <= 6) return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
  return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
};

const getSeverityLabel = (s) => {
  if (s <= 3) return 'Mild';
  if (s <= 6) return 'Moderate';
  return 'Severe';
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = user.first_name || user.full_name?.split(' ')[0] || 'Patient';

  useEffect(() => { fetchSymptoms(); }, []);

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

  const generateAiSummary = async () => {
    if (!user?.id) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`${API_BASE}/ai/summarize-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: user.id })
      });
      const d = await res.json();
      setAiSummary(d.summary || 'No summary generated.');
    } catch (e) {
      setAiSummary('Could not connect to AI service.');
    } finally {
      setLoadingAi(false);
    }
  };

  const avgSeverity = symptoms.length
    ? (symptoms.reduce((a, s) => a + (s.severity || 0), 0) / symptoms.length).toFixed(1)
    : '—';

  const lastCheckin = symptoms[0]?.occurrence_date || symptoms[0]?.created_at;
  const recentSymptoms = symptoms.slice(0, 6);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="pd-root">
      {/* HERO HEADER */}
      <div className="pd-hero">
        <div className="pd-hero-glow" />
        <div className="pd-hero-content">
          <div>
            <p className="pd-greeting">{greeting} 👋</p>
            <h1 className="pd-name">{firstName}</h1>
            <p className="pd-subtitle">Here's your health overview for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="pd-health-score">
            <HeartPulse size={28} className="hs-icon" />
            <div>
              <div className="hs-label">Health Logs</div>
              <div className="hs-value">{symptoms.length} entries</div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="pd-quick-actions">
          <button className="qa-btn qa-primary" onClick={() => navigate('/symptoms')}>
            <Plus size={18} />
            <span>Log Symptom</span>
            <ChevronRight size={16} className="qa-arrow" />
          </button>
          <button className="qa-btn qa-purple" onClick={() => navigate('/prescription-scan')}>
            <ScanLine size={18} />
            <span>Scan Prescription</span>
            <ChevronRight size={16} className="qa-arrow" />
          </button>
          <button className="qa-btn qa-orange" onClick={() => navigate('/reminders')}>
            <Bell size={18} />
            <span>Set Reminder</span>
            <ChevronRight size={16} className="qa-arrow" />
          </button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="pd-stats">
        <div className="pd-stat-card" style={{ '--accent-h': '217', '--accent-s': '91%', '--accent-l': '60%' }}>
          <div className="psc-icon-wrap">
            <Activity size={22} />
          </div>
          <div>
            <div className="psc-label">Total Logs</div>
            <div className="psc-value">{symptoms.length}</div>
          </div>
        </div>
        <div className="pd-stat-card" style={{ '--accent-h': '158', '--accent-s': '64%', '--accent-l': '52%' }}>
          <div className="psc-icon-wrap">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="psc-label">Avg Severity</div>
            <div className="psc-value">{avgSeverity}<span className="psc-unit">/10</span></div>
          </div>
        </div>
        <div className="pd-stat-card" style={{ '--accent-h': '38', '--accent-s': '92%', '--accent-l': '50%' }}>
          <div className="psc-icon-wrap">
            <Droplets size={22} />
          </div>
          <div>
            <div className="psc-label">Blood Sugar Logs</div>
            <div className="psc-value">{symptoms.filter(s => s.blood_sugar).length}</div>
          </div>
        </div>
        <div className="pd-stat-card" style={{ '--accent-h': '271', '--accent-s': '81%', '--accent-l': '66%' }}>
          <div className="psc-icon-wrap">
            <Clock size={22} />
          </div>
          <div>
            <div className="psc-label">Last Check-in</div>
            <div className="psc-value psc-date">{lastCheckin ? new Date(lastCheckin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="pd-main-grid">

        {/* RECENT SYMPTOMS FEED */}
        <div className="pd-card pd-feed">
          <div className="pdc-header">
            <h3><Activity size={18} /> Recent Symptoms</h3>
            <button className="pdc-link" onClick={() => navigate('/symptoms')}>View all →</button>
          </div>

          {loading ? (
            <div className="pd-loading">
              <div className="pd-spinner" />
              <p>Loading your health data...</p>
            </div>
          ) : recentSymptoms.length === 0 ? (
            <div className="pd-empty">
              <AlertTriangle size={32} />
              <p>No symptoms logged yet. <br /><strong>Tap "Log Symptom" above to get started.</strong></p>
            </div>
          ) : (
            <div className="pd-symptom-list">
              {recentSymptoms.map((s, i) => {
                const sc = getSeverityColor(s.severity || 5);
                return (
                  <div key={s.id || i} className="pd-symptom-row">
                    <div className="psr-left">
                      <div className="psr-dot" style={{ background: sc.text }} />
                      <div>
                        <div className="psr-name">{s.description}</div>
                        <div className="psr-meta">
                          {s.location && <span>📍 {s.location}</span>}
                          {s.duration && <span>⏱ {s.duration}</span>}
                          {s.blood_sugar && <span>🩸 {s.blood_sugar} mg/dL</span>}
                        </div>
                      </div>
                    </div>
                    <div className="psr-right">
                      <span className="psr-badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {getSeverityLabel(s.severity || 5)} {s.severity}/10
                      </span>
                      <span className="psr-date">
                        {s.occurrence_date ? new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="pd-right-col">
          {/* AI HEALTH SUMMARY */}
          <div className="pd-card pd-ai">
            <div className="pdc-header">
              <h3><BrainCircuit size={18} /> AI Health Summary</h3>
            </div>
            <div className="pd-ai-body">
              {aiSummary ? (
                <p className="pd-ai-text">{aiSummary}</p>
              ) : (
                <p className="pd-ai-placeholder">Get a 3-sentence clinical summary of your recent health based on all logged symptoms and prescriptions.</p>
              )}
            </div>
            <button className="pd-ai-btn" onClick={generateAiSummary} disabled={loadingAi || symptoms.length === 0}>
              {loadingAi ? <><span className="btn-spinner" /> Analyzing...</> : '✦ Generate AI Summary'}
            </button>
          </div>

          {/* SEVERITY BREAKDOWN */}
          <div className="pd-card pd-breakdown">
            <div className="pdc-header">
              <h3><TrendingUp size={18} /> Severity Breakdown</h3>
            </div>
            <div className="pd-bars">
              {['Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)'].map((label, i) => {
                const ranges = [[1,3],[4,6],[7,10]];
                const [lo, hi] = ranges[i];
                const count = symptoms.filter(s => s.severity >= lo && s.severity <= hi).length;
                const pct = symptoms.length ? Math.round((count / symptoms.length) * 100) : 0;
                const colors = ['#10b981', '#f59e0b', '#ef4444'];
                return (
                  <div key={label} className="pd-bar-row">
                    <span className="pd-bar-label">{label}</span>
                    <div className="pd-bar-track">
                      <div className="pd-bar-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                    <span className="pd-bar-pct">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pd-root {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          padding-bottom: 2rem;
          font-family: 'Inter', sans-serif;
        }

        /* HERO */
        .pd-hero {
          background: linear-gradient(135deg, #1e3a5f 0%, #1a2742 50%, #0f1729 100%);
          border-radius: 1.25rem;
          padding: 2rem 2rem 1.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(30, 58, 95, 0.35);
        }
        .pd-hero-glow {
          position: absolute; top: -80px; right: -80px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15), transparent 70%);
          pointer-events: none;
        }
        .pd-hero-content {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 1rem; margin-bottom: 1.5rem; position: relative; z-index: 1;
        }
        .pd-greeting { color: #94a3b8; font-size: 0.9rem; margin: 0 0 0.25rem; }
        .pd-name { color: white; font-size: 2rem; font-weight: 700; margin: 0 0 0.25rem; font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; }
        .pd-subtitle { color: #64748b; font-size: 0.85rem; margin: 0; }
        .pd-health-score {
          display: flex; align-items: center; gap: 0.75rem;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem; padding: 0.875rem 1.25rem; flex-shrink: 0;
        }
        .hs-icon { color: #f472b6; }
        .hs-label { color: #94a3b8; font-size: 0.75rem; }
        .hs-value { color: white; font-weight: 700; font-size: 1rem; }

        /* QUICK ACTIONS */
        .pd-quick-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; position: relative; z-index: 1; }
        .qa-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.625rem 1.1rem; border-radius: 0.625rem; border: none;
          font-weight: 600; font-size: 0.875rem; cursor: pointer;
          transition: all 0.2s; color: white;
        }
        .qa-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
        .qa-primary { background: linear-gradient(135deg, #2563eb, #0ea5e9); }
        .qa-purple { background: linear-gradient(135deg, #7c3aed, #a855f7); }
        .qa-orange { background: linear-gradient(135deg, #d97706, #f59e0b); }
        .qa-arrow { opacity: 0.7; }

        /* STATS */
        .pd-stats {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
        }
        @media (max-width: 1100px) { .pd-stats { grid-template-columns: repeat(2, 1fr); } }
        .pd-stat-card {
          background: white; border-radius: 1rem; padding: 1.25rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          display: flex; align-items: center; gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .pd-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .psc-icon-wrap {
          width: 48px; height: 48px; border-radius: 0.875rem; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--accent-h), var(--accent-s), 95%);
          color: hsl(var(--accent-h), var(--accent-s), 40%);
        }
        .psc-label { color: #64748b; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.2rem; }
        .psc-value { color: #0f172a; font-size: 1.6rem; font-weight: 800; line-height: 1; }
        .psc-unit { font-size: 0.9rem; color: #94a3b8; font-weight: 500; }
        .psc-date { font-size: 1.1rem; }

        /* MAIN GRID */
        .pd-main-grid {
          display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.5rem;
        }
        @media (max-width: 1000px) { .pd-main-grid { grid-template-columns: 1fr; } }

        .pd-right-col { display: flex; flex-direction: column; gap: 1.25rem; }

        /* CARDS */
        .pd-card {
          background: white; border-radius: 1rem;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .pdc-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #f8fafc;
        }
        .pdc-header h3 {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0;
        }
        .pdc-link { color: #2563eb; font-size: 0.85rem; font-weight: 600; background: none; border: none; cursor: pointer; }
        .pdc-link:hover { text-decoration: underline; }

        /* SYMPTOM FEED */
        .pd-symptom-list { padding: 0.5rem 0; }
        .pd-symptom-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.875rem 1.5rem; gap: 1rem;
          transition: background 0.15s; cursor: default;
        }
        .pd-symptom-row:hover { background: #f8fafc; }
        .pd-symptom-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
        .psr-left { display: flex; align-items: center; gap: 0.875rem; }
        .psr-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .psr-name { font-weight: 600; color: #0f172a; font-size: 0.925rem; margin-bottom: 0.15rem; }
        .psr-meta { display: flex; gap: 0.75rem; color: #94a3b8; font-size: 0.775rem; }
        .psr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
        .psr-badge { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px; }
        .psr-date { color: #94a3b8; font-size: 0.75rem; }

        .pd-loading, .pd-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 3rem; gap: 1rem; color: #94a3b8; text-align: center;
        }
        .pd-spinner {
          width: 28px; height: 28px; border: 3px solid #e2e8f0;
          border-top-color: #2563eb; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* AI */
        .pd-ai-body { padding: 1.25rem 1.5rem; min-height: 100px; }
        .pd-ai-text { color: #1e293b; line-height: 1.65; font-size: 0.9rem; }
        .pd-ai-placeholder { color: #94a3b8; font-style: italic; font-size: 0.875rem; line-height: 1.6; }
        .pd-ai-btn {
          width: 100%; padding: 0.875rem; border: none; cursor: pointer;
          background: linear-gradient(95deg, #2563eb, #7c3aed);
          color: white; font-weight: 600; font-size: 0.9rem;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: opacity 0.2s;
        }
        .pd-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pd-ai-btn:not(:disabled):hover { opacity: 0.9; }
        .btn-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.8s linear infinite; display: inline-block;
        }

        /* BREAKDOWN */
        .pd-bars { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .pd-bar-row { display: flex; align-items: center; gap: 0.75rem; }
        .pd-bar-label { font-size: 0.8rem; color: #64748b; min-width: 110px; }
        .pd-bar-track { flex: 1; height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
        .pd-bar-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
        .pd-bar-pct { font-size: 0.8rem; font-weight: 700; color: #1e293b; min-width: 20px; text-align: right; }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
