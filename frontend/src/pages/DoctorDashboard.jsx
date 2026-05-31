import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Calendar, ChevronRight, Clock, Mail,
  AlertCircle, CheckCircle, Heart, Activity, TrendingUp,
  UserCheck, Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';
import { API_BASE } from '../lib/config';

/* ─── Mini Calendar ───────────────────────────────────────────────────────── */
const MiniCalendar = () => {
  const today = new Date();
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const firstDay = new Date(cur.y, cur.m, 1).getDay();
  const offset   = (firstDay + 6) % 7;
  const daysIn   = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells    = [...Array(offset).fill(null), ...Array.from({length: daysIn}, (_,i) => i+1)];
  const isToday  = d => d === today.getDate() && cur.m === today.getMonth() && cur.y === today.getFullYear();
  const prev = () => setCur(c => ({ y: c.m === 0 ? c.y-1 : c.y, m: c.m === 0 ? 11 : c.m-1 }));
  const next = () => setCur(c => ({ y: c.m === 11 ? c.y+1 : c.y, m: c.m === 11 ? 0  : c.m+1 }));

  return (
    <div className="mc-wrap">
      <div className="mc-nav">
        <button className="mc-arr" onClick={prev}>‹</button>
        <span className="mc-month">{MONTHS[cur.m]} {cur.y}</span>
        <button className="mc-arr" onClick={next}>›</button>
      </div>
      <div className="mc-grid">
        {DAYS.map(d => <div key={d} className="mc-lbl">{d}</div>)}
        {cells.map((d,i) => (
          <div key={i} className={`mc-cell ${!d ? 'mc-empty' : ''} ${isToday(d) ? 'mc-today' : ''}`}>
            {d || ''}
          </div>
        ))}
      </div>
      <div className="mc-today-row">
        <Clock size={13} style={{color:'#7c3aed'}} />
        <span>{today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</span>
      </div>
    </div>
  );
};

/* ─── Avatar colours ──────────────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#0284c7,#38bdf8)',
  'linear-gradient(135deg,#059669,#34d399)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#db2777,#f472b6)',
  'linear-gradient(135deg,#dc2626,#f87171)',
];
const avatarGrad = name => AVATAR_GRADIENTS[(name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

/* ─── Doctor Dashboard ────────────────────────────────────────────────────── */
const DoctorDashboard = () => {
  const navigate  = useNavigate();
  const user      = getStoredUser();
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'Doctor';
  const lastName  = user?.last_name  || user?.full_name?.split(' ').slice(1).join(' ') || '';
  const initials  = `${firstName.charAt(0)}${lastName.charAt(0)||''}`.toUpperCase();

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const greetIcon = hour < 12 ? '🌤️' : hour < 18 ? '☀️' : '🌙';

  const [patients,      setPatients]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [doctorCode,    setDoctorCode]    = useState(user?.doctor_code || '');

  useEffect(() => {
    const load = async () => {
      const doctorId = user?.id;
      if (!doctorId) { setLoading(false); return; }
      const { data: doc } = await supabase.from('doctors').select('doctor_code').eq('id', doctorId).maybeSingle();
      if (doc?.doctor_code) setDoctorCode(doc.doctor_code);
      const { data } = await supabase.from('patients').select('*').eq('doctor_id', doctorId);
      if (data) {
        const parsed = data.map((p, idx) => ({
          ...p,
          full_name: (p.first_name || p.last_name)
            ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
            : 'Unknown Patient',
          short_id: `PT-${String(idx + 1).padStart(3, '0')}`,
        }));
        setPatients(parsed);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = patients.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email     || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.short_id  || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dd-root">

      {/* ── HERO HEADER ── */}
      <div className="dd-hero">
        <div className="dd-hero-left">
          <div className="dd-greeting-pill">
            <span className="dd-greeting-dot" />
            {greetIcon} {greeting}
          </div>
          <h1 className="dd-doctor-name">Dr. {firstName} {lastName}</h1>
          <p className="dd-doctor-sub">
            {patients.length > 0
              ? <>You have <strong>{patients.length}</strong> patient{patients.length !== 1 ? 's' : ''} registered under your care.</>
              : 'No patients connected yet. Share your code to get started.'
            }
            {doctorCode && (
              <span className="dd-code-chip">
                <Stethoscope size={11} />
                {doctorCode}
              </span>
            )}
          </p>
        </div>

        <div className="dd-hero-right">
          <div className="dd-doctor-avatar" onClick={() => navigate('/profile')} title="My Profile">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" className="dd-avatar-img" />
              : <span>{initials}</span>
            }
            <span className="dd-online-dot" />
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="dd-stats">
        <div className="dd-stat-card stat-purple">
          <div className="stat-icon-wrap stat-icon-purple">
            <Users size={20} />
          </div>
          <div className="stat-body">
            <div className="stat-number">{patients.length}</div>
            <div className="stat-label">Total Patients</div>
          </div>
          <div className="stat-trend">
            <TrendingUp size={14} />
          </div>
        </div>

        <div className="dd-stat-card stat-green">
          <div className="stat-icon-wrap stat-icon-green">
            <UserCheck size={20} />
          </div>
          <div className="stat-body">
            <div className="stat-number">{patients.length}</div>
            <div className="stat-label">Active Cases</div>
          </div>
          <div className="stat-trend">
            <Activity size={14} />
          </div>
        </div>

        <div className="dd-stat-card stat-rose">
          <div className="stat-icon-wrap stat-icon-rose">
            <Heart size={20} />
          </div>
          <div className="stat-body">
            <div className="stat-number">{now.toLocaleString('en-US',{month:'short'})}</div>
            <div className="stat-label">Current Month</div>
          </div>
          <div className="stat-trend">
            <CheckCircle size={14} />
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="dd-main-grid">

        {/* PATIENTS SECTION */}
        <div className="dd-panel">
          <div className="dd-panel-header">
            <div className="dd-panel-title">
              <div className="panel-title-icon">
                <Users size={16} />
              </div>
              <span>Patient List</span>
              <span className="dd-badge">{filtered.length}</span>
            </div>
            <div className="dd-search-bar">
              <Search size={14} color="#9ca3af" />
              <input
                className="dd-search-input"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="dd-empty">
              <div className="dd-spinner" />
              <p>Loading patients…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="dd-empty">
              <div className="dd-empty-icon">
                <AlertCircle size={28} color="#d1d5db" />
              </div>
              <p className="dd-empty-title">{search ? 'No patients match your search.' : 'No patients yet.'}</p>
              {!search && doctorCode && (
                <div className="dd-share-code">
                  Share your code: <strong>{doctorCode}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="dd-card-grid">
              {filtered.map(p => {
                const name = p.full_name;
                const init = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                const grad = avatarGrad(name);
                return (
                  <button
                    key={p.id}
                    className="dd-pt-card"
                    onClick={() => navigate(`/doctor/patient/${p.id}`)}
                  >
                    <div className="dpc-top">
                      <div className="dpc-avatar" style={{ background: grad }}>{init}</div>
                      <div className="dpc-id-badge">{p.short_id}</div>
                    </div>
                    <div className="dpc-name">{name}</div>
                    <div className="dpc-email">
                      <Mail size={11} />
                      <span>{p.email || '—'}</span>
                    </div>
                    <div className="dpc-footer">
                      View Details <ChevronRight size={13} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CALENDAR */}
        <div className="dd-panel dd-cal-panel">
          <div className="dd-panel-header" style={{ marginBottom: '1rem' }}>
            <div className="dd-panel-title">
              <div className="panel-title-icon">
                <Calendar size={16} />
              </div>
              <span>Calendar</span>
            </div>
          </div>
          <MiniCalendar />
        </div>

      </div>

      <style>{`
        /* ── Root ── */
        .dd-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          font-family: 'Inter', sans-serif;
          min-height: 100%;
        }

        /* ── Hero ── */
        .dd-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 1.5rem;
          padding: 2rem 2.25rem;
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.08), 0 2px 8px rgba(0,0,0,0.04);
          position: relative;
          overflow: hidden;
        }
        .dd-hero::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .dd-hero::after {
          content: '';
          position: absolute;
          bottom: -40px; left: 30%;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }
        .dd-hero-left { display: flex; flex-direction: column; gap: 0.5rem; position: relative; z-index: 1; }

        .dd-greeting-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: #7c3aed;
          background: rgba(124, 58, 237, 0.08);
          border: 1px solid rgba(124, 58, 237, 0.15);
          border-radius: 999px;
          padding: 0.3rem 0.875rem;
          width: fit-content;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .dd-greeting-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #7c3aed;
          animation: heroGlow 2s ease-in-out infinite;
        }
        @keyframes heroGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(124,58,237,0); }
        }

        .dd-doctor-name {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          margin: 0;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.8px;
          line-height: 1.15;
        }
        .dd-doctor-sub {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .dd-code-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #ede9fe;
          color: #6d28d9;
          font-weight: 700;
          font-size: 0.78rem;
          padding: 0.2rem 0.625rem;
          border-radius: 6px;
          letter-spacing: 0.04em;
          border: 1px solid rgba(109,40,217,0.15);
        }

        /* Doctor Avatar */
        .dd-hero-right { position: relative; z-index: 1; }
        .dd-doctor-avatar {
          width: 58px; height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: white; font-weight: 800; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; position: relative;
          border: 3px solid white;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .dd-doctor-avatar:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(124,58,237,0.4); }
        .dd-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .dd-online-dot {
          position: absolute; bottom: 2px; right: 2px;
          width: 13px; height: 13px; border-radius: 50%;
          background: #10b981; border: 2.5px solid white;
        }

        /* ── Stats ── */
        .dd-stats { display: flex; gap: 1rem; }
        .dd-stat-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .dd-stat-card:hover { transform: translateY(-2px); }
        .stat-purple {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-color: rgba(124,58,237,0.12);
          box-shadow: 0 2px 16px rgba(124,58,237,0.08);
        }
        .stat-green {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: rgba(5,150,105,0.12);
          box-shadow: 0 2px 16px rgba(5,150,105,0.08);
        }
        .stat-rose {
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
          border-color: rgba(219,39,119,0.12);
          box-shadow: 0 2px 16px rgba(219,39,119,0.08);
        }
        .stat-icon-wrap {
          width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-purple { background: rgba(124,58,237,0.12); color: #7c3aed; }
        .stat-icon-green  { background: rgba(5,150,105,0.12);  color: #059669; }
        .stat-icon-rose   { background: rgba(219,39,119,0.12); color: #db2777; }
        .stat-body { flex: 1; }
        .stat-number {
          font-size: 1.75rem; font-weight: 800;
          font-family: 'Outfit', sans-serif; line-height: 1;
          color: #111827;
        }
        .stat-label { font-size: 0.75rem; color: #6b7280; font-weight: 500; margin-top: 2px; }
        .stat-trend { opacity: 0.3; }
        .stat-purple .stat-trend { color: #7c3aed; }
        .stat-green .stat-trend  { color: #059669; }
        .stat-rose .stat-trend   { color: #db2777; }

        /* ── Main Grid ── */
        .dd-main-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 1000px) {
          .dd-main-grid { grid-template-columns: 1fr; }
          .dd-cal-panel { display: none; }
          .dd-stats { flex-direction: column; }
        }

        /* ── Panels ── */
        .dd-panel {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }
        .dd-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .dd-panel-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          font-size: 0.9rem;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .panel-title-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: #f3e8ff;
          color: #7c3aed;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dd-badge {
          background: #ede9fe;
          color: #6d28d9;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
        }

        /* Search */
        .dd-search-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 999px;
          padding: 0.5rem 1rem;
          min-width: 240px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dd-search-bar:focus-within {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
        }
        .dd-search-input {
          border: none !important; background: transparent !important;
          outline: none !important; font-size: 0.875rem;
          width: 100%; color: #111827; padding: 0 !important;
        }

        /* ── Patient Cards ── */
        .dd-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 1rem;
        }
        .dd-pt-card {
          display: flex;
          flex-direction: column;
          padding: 1.25rem 1rem 1rem;
          background: #fafafa;
          border: 1.5px solid #f1f5f9;
          border-radius: 1.125rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.22s;
          font-family: inherit;
          gap: 0.5rem;
        }
        .dd-pt-card:hover {
          border-color: rgba(124,58,237,0.3);
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(124,58,237,0.1);
          transform: translateY(-3px);
        }
        .dpc-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .dpc-avatar {
          width: 52px; height: 52px;
          border-radius: 14px;
          color: white; font-weight: 800; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        .dpc-id-badge {
          background: #f3e8ff;
          color: #7c3aed;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.04em;
          border: 1px solid rgba(124,58,237,0.15);
        }
        .dpc-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .dpc-email {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: #9ca3af;
          font-size: 0.73rem;
          overflow: hidden;
        }
        .dpc-email span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dpc-footer {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.78rem;
          font-weight: 600;
          color: #7c3aed;
          transition: gap 0.2s;
        }
        .dd-pt-card:hover .dpc-footer { gap: 0.5rem; }

        /* ── Empty State ── */
        .dd-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3rem 1rem; gap: 0.75rem;
          color: #9ca3af; font-size: 0.875rem; text-align: center;
        }
        .dd-empty-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: #f9fafb; border: 1.5px solid #e5e7eb;
          display: flex; align-items: center; justify-content: center;
        }
        .dd-empty-title { font-weight: 600; color: #6b7280; margin: 0; }
        .dd-share-code {
          background: #f3e8ff; color: #7c3aed;
          border: 1px solid rgba(124,58,237,0.2);
          padding: 0.4rem 0.875rem; border-radius: 8px;
          font-size: 0.85rem; font-weight: 500;
        }

        /* ── Spinner ── */
        .dd-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(124,58,237,0.15);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: ddSpin 0.8s linear infinite;
        }
        @keyframes ddSpin { to { transform: rotate(360deg); } }

        /* ── Mini Calendar ── */
        .mc-wrap { user-select: none; }
        .mc-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .mc-month { font-weight: 700; font-size: 0.875rem; color: #7c3aed; }
        .mc-arr {
          background: none; border: none; cursor: pointer; font-size: 1.1rem;
          color: #9ca3af; padding: 0.2rem 0.4rem; border-radius: 6px;
          transition: background 0.15s; font-family: inherit;
        }
        .mc-arr:hover { background: #f3e8ff; color: #7c3aed; }
        .mc-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
        .mc-lbl {
          text-align: center; font-size: 0.63rem; font-weight: 700;
          color: #9ca3af; padding: 0.2rem 0; text-transform: uppercase;
        }
        .mc-cell {
          text-align: center; font-size: 0.75rem;
          padding: 0.32rem 0; border-radius: 6px;
          color: #374151; transition: background 0.15s;
        }
        .mc-empty { visibility: hidden; }
        .mc-today {
          background: linear-gradient(135deg, #7c3aed, #0ea5e9) !important;
          color: white !important; font-weight: 700; border-radius: 8px;
        }
        .mc-cell:not(.mc-empty):not(.mc-today):hover { background: #f3e8ff; cursor: pointer; }
        .mc-today-row {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.75rem; color: #6b7280;
          margin-top: 0.875rem; padding-top: 0.875rem;
          border-top: 1px solid #f1f5f9;
        }

        /* ── Alerts Panel ── */
        .dd-alerts-panel {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }
        .panel-title-icon--red { background: #fee2e2 !important; color: #dc2626 !important; }
        .dd-badge--red { background: #fee2e2; color: #dc2626; }

        .dd-alerts-list { display: flex; flex-direction: column; gap: 0.875rem; }
        .dd-alert-card {
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(255,255,255,0.8);
          border-radius: 1rem;
          padding: 1rem 1.125rem;
          display: flex; flex-direction: column; gap: 0.625rem;
          transition: all 0.2s;
        }
        .dd-alert-card:hover { background: rgba(255,255,255,0.9); }
        .dd-alert-unread { border-color: rgba(239,68,68,0.2); }

        .dac-top { display: flex; align-items: center; gap: 0.75rem; }
        .dac-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: white; font-weight: 700; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dac-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .dac-name { font-weight: 700; font-size: 0.875rem; color: #111827; }
        .dac-symptom { font-size: 0.78rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dac-sev {
          font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.5rem;
          border-radius: 999px; flex-shrink: 0;
        }
        .sev-high { background: #fee2e2; color: #dc2626; }
        .sev-mid  { background: #fef3c7; color: #d97706; }
        .sev-low  { background: #d1fae5; color: #059669; }

        .dac-replied {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.75rem; color: #6b7280;
          background: rgba(124,58,237,0.05);
          padding: 0.4rem 0.625rem; border-radius: 0.5rem;
        }
        .dac-replied em { color: #374151; font-style: normal; }

        .dac-reply-btn {
          display: flex; align-items: center; justify-content: center;
          padding: 0.5rem; border-radius: 0.625rem;
          background: rgba(124,58,237,0.07);
          border: 1px solid rgba(124,58,237,0.15);
          color: #7c3aed; font-weight: 600; font-size: 0.78rem;
          cursor: pointer; transition: all 0.18s; font-family: inherit;
        }
        .dac-reply-btn:hover { background: rgba(124,58,237,0.14); }

        /* ── Comment Modal ── */
        .dd-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .dd-modal {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 1.5rem;
          padding: 1.75rem;
          width: min(520px, 92vw);
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: flex; flex-direction: column; gap: 1.125rem;
        }
        .dd-modal-header { display: flex; justify-content: space-between; align-items: center; }
        .dd-modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0; font-family: 'Outfit', sans-serif; }
        .dd-modal-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0.25rem; border-radius: 6px; }
        .dd-modal-close:hover { background: #f3f4f6; color: #374151; }
        .dd-modal-symptom {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.875rem; color: #374151;
          background: rgba(124,58,237,0.06);
          padding: 0.625rem 0.875rem; border-radius: 0.75rem;
          border-left: 3px solid #7c3aed;
        }
        .dd-modal-textarea {
          width: 100%; min-height: 100px;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.75rem; padding: 0.75rem 1rem;
          font-size: 0.875rem; font-family: inherit; color: #111827;
          background: rgba(255,255,255,0.8); resize: vertical;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .dd-modal-textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .dd-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .dd-modal-cancel {
          padding: 0.6rem 1.25rem; border-radius: 0.625rem;
          border: 1.5px solid #e5e7eb; background: white; color: #6b7280;
          font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .dd-modal-send {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.6rem 1.25rem; border-radius: 0.625rem;
          border: none; background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: white; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s;
        }
        .dd-modal-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .dd-modal-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.75rem; padding: 1.5rem; text-align: center;
          color: #065f46; font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default DoctorDashboard;
