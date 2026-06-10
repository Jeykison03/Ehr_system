import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Hash, Calendar, Activity,
  ChevronDown, ChevronUp, X, Upload, Send, FileText, Droplets,
  Clock, Pill, AlertCircle, CheckCircle, Loader, StickyNote, Flame,
  HeartPulse
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';

/* ─── Severity helpers ─────────────────────────────────────────── */
const SEV_COLOR = (s) => {
  if (s <= 3) return { bg: '#d1fae5', text: '#065f46', dot: '#10b981', bar: '#10b981', label: 'Mild' };
  if (s <= 6) return { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', bar: '#f59e0b', label: 'Moderate' };
  return        { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', bar: '#ef4444', label: 'Critical' };
};

/* ─── Symptom Modal ─────────────────────────────────────────────── */
const SymptomModal = ({ sym, onClose }) => {
  if (!sym) return null;
  const sc = SEV_COLOR(sym.severity || 5);
  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-box" onClick={e => e.stopPropagation()}>
        <button className="sm-close" onClick={onClose}><X size={18} /></button>

        <div className="sm-top">
          <div className="sm-dot" style={{ background: sc.dot }} />
          <div>
            <h2 className="sm-title">{sym.description}</h2>
            <p className="sm-date">
              {sym.occurrence_date
                ? new Date(sym.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : 'Date not recorded'}
            </p>
          </div>
          <span className="sm-badge" style={{ background: sc.bg, color: sc.text }}>
            {sc.label} · {sym.severity}/10
          </span>
        </div>

        {/* Severity bar */}
        <div className="sm-sev-wrap">
          <div className="sm-sev-track">
            <div className="sm-sev-fill" style={{ width: `${(sym.severity / 10) * 100}%`, background: sc.bar }} />
          </div>
          <span className="sm-sev-num" style={{ color: sc.text }}>{sym.severity}/10</span>
        </div>

        <div className="sm-details-grid">
          {sym.duration && (
            <div className="sm-detail">
              <Clock size={15} className="sm-d-icon" />
              <div><div className="sm-d-label">Duration</div><div className="sm-d-val">{sym.duration}</div></div>
            </div>
          )}
          {sym.location && (
            <div className="sm-detail">
              <MapPin size={15} className="sm-d-icon" />
              <div><div className="sm-d-label">Location</div><div className="sm-d-val">{sym.location}</div></div>
            </div>
          )}
          {sym.blood_sugar && (
            <div className="sm-detail">
              <Droplets size={15} className="sm-d-icon" />
              <div><div className="sm-d-label">Blood Sugar</div><div className="sm-d-val">{sym.blood_sugar} mg/dL</div></div>
            </div>
          )}
          {sym.meal_info && (
            <div className="sm-detail">
              <StickyNote size={15} className="sm-d-icon" />
              <div><div className="sm-d-label">Meal Info</div><div className="sm-d-val">{sym.meal_info}</div></div>
            </div>
          )}
          {sym.medication_taken && (
            <div className="sm-detail">
              <Pill size={15} className="sm-d-icon" />
              <div><div className="sm-d-label">Medication Taken</div><div className="sm-d-val">{sym.medication_taken}</div></div>
            </div>
          )}
        </div>

        {sym.notes && (
          <div className="sm-notes">
            <div className="sm-notes-label">📝 Notes</div>
            <p className="sm-notes-text">{sym.notes}</p>
          </div>
        )}

        {sym.image_url && (
          <div className="sm-img-wrap">
            <img src={sym.image_url} alt="symptom" className="sm-img" />
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Avatar gradient helper ─────────────────────────────────────── */
const GRAD = ['linear-gradient(135deg,#6366f1,#818cf8)','linear-gradient(135deg,#0ea5e9,#38bdf8)','linear-gradient(135deg,#10b981,#34d399)','linear-gradient(135deg,#f59e0b,#fbbf24)'];
const avGrad = n => GRAD[(n?.charCodeAt(0)||0) % GRAD.length];

/* ─── Patient Detail Page ───────────────────────────────────────── */
const PatientDetailPage = () => {
  const { patientId } = useParams();
  const navigate      = useNavigate();
  const doctor        = getStoredUser();

  const [patient,   setPatient]   = useState(null);
  const [symptoms,  setSymptoms]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [symModal,  setSymModal]  = useState(null);
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [uploading, setUploading] = useState(false);
  const [upStatus,  setUpStatus]  = useState(null);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxStatus,  setRxStatus]  = useState(null);
  const [file,      setFile]      = useState(null);
  const [fileName,  setFileName]  = useState('');
  const [rx, setRx] = useState({ medicine_name:'', dosage:'', frequency:'', duration:'', instructions:'', next_visit_date:'' });

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
      setPatient(p || null);
      const { data: s } = await supabase.from('symptoms').select('*').eq('patient_id', patientId).order('occurrence_date', { ascending: false });
      setSymptoms(s || []);
      setLoading(false);
    };
    load();
  }, [patientId]);

  /* ── Filtered symptoms ── */
  const filteredSymptoms = symptoms.filter(s => {
    if (!s.occurrence_date) return true;
    if (dateFrom && s.occurrence_date < dateFrom) return false;
    if (dateTo   && s.occurrence_date > dateTo)   return false;
    return true;
  });

  const sugarData = filteredSymptoms
    .filter(s => s.blood_sugar !== null && s.blood_sugar !== undefined && Number(s.blood_sugar) > 0)
    .map(s => ({
      date: s.occurrence_date ? new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
      sugar: Number(s.blood_sugar),
      description: s.description || 'Check-in'
    }))
    .reverse();

  /* ── Upload report ── */
  const handleFileChange = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name.replace(/\.[^/.]+$/, ''));
    setUpStatus(null);
  };

  const handleUpload = async () => {
    if (!file || !fileName.trim()) { setUpStatus({ type: 'error', msg: 'Please choose a file and give it a name.' }); return; }
    setUploading(true);
    setUpStatus(null);
    const mockUrl   = URL.createObjectURL(file);
    const finalName = `${fileName.trim()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.from('reports').insert([{ patient_id: patientId, doctor_id: doctor?.id, file_name: finalName, file_url: mockUrl, file_type: file.type }]);
    if (!error) {
      await supabase.from('notifications').insert([{ patient_id: patientId, type:'report', title:'New report', message:`A report "${finalName}" was added to your record.` }]).catch(()=>{});
    }
    setUploading(false);
    if (error) setUpStatus({ type:'error', msg: error.message });
    else { setUpStatus({ type:'success', msg:`"${finalName}" uploaded!` }); setFile(null); setFileName(''); }
  };

  /* ── Prescribe ── */
  const handlePrescribe = async (e) => {
    e.preventDefault();
    if (!rx.medicine_name.trim()) return;
    setRxLoading(true); setRxStatus(null);
    const { next_visit_date, ...base } = rx;
    const { data: inserted, error } = await supabase.from('prescriptions').insert([{ ...base, patient_id: patientId, doctor_id: doctor?.id }]).select('*');
    if (!error && inserted?.[0]?.id && next_visit_date) {
      await supabase.from('prescriptions').update({ next_visit_date }).eq('id', inserted[0].id).catch(()=>{});
    }
    if (!error) {
      await supabase.from('notifications').insert([{ patient_id: patientId, type:'prescription', title:'New prescription', message:`Your doctor prescribed ${rx.medicine_name}.` }]).catch(()=>{});
    }
    setRxLoading(false);
    if (error) setRxStatus({ type:'error', msg: error.message });
    else { setRxStatus({ type:'success', msg:`Prescription for ${rx.medicine_name} sent!` }); setRx({ medicine_name:'', dosage:'', frequency:'', duration:'', instructions:'', next_visit_date:'' }); }
  };

  if (loading) return (
    <div className="pdp-loading">
      <div className="pdp-spinner" />
      <p>Loading patient data…</p>
    </div>
  );

  if (!patient) return (
    <div className="pdp-loading">
      <AlertCircle size={40} color="#ef4444" />
      <p>Patient not found.</p>
      <button className="pdp-back-btn" onClick={() => navigate('/')}>← Back</button>
    </div>
  );

  const init = (patient.full_name || 'P').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const grad = avGrad(patient.full_name);

  return (
    <div className="pdp-root">
      {/* Modal */}
      <SymptomModal sym={symModal} onClose={() => setSymModal(null)} />

      {/* ── BREADCRUMB ── */}
      <button className="pdp-back" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* ── PATIENT HERO CARD ── */}
      <div className="pdp-hero-card">
        <div className="pdp-hero-av" style={{ background: patient.avatar_url ? 'transparent' : grad }}>
          {patient.avatar_url ? (
            <img src={patient.avatar_url} alt="avatar" className="pdp-hero-av-img" />
          ) : (
            init
          )}
        </div>
        <div className="pdp-hero-info">
          <h1 className="pdp-hero-name">{patient.full_name}</h1>
          <div className="pdp-hero-meta">
            {patient.email    && <span className="pdp-meta-chip"><Mail    size={13} />{patient.email}</span>}
            {patient.phone_number && <span className="pdp-meta-chip"><Phone  size={13} />{patient.phone_number}</span>}
            {patient.address  && <span className="pdp-meta-chip"><MapPin  size={13} />{patient.address}</span>}
            <span className="pdp-meta-chip id-chip"><Hash size={13} />{patient.id.slice(0,16)}…</span>
          </div>
        </div>
        <div className="pdp-hero-badge">
          <Activity size={14} />
          {symptoms.length} symptom{symptoms.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="pdp-grid">

        {/* LEFT: SYMPTOMS */}
        <div className="pdp-col-left">
          {/* SUGAR LEVEL GRAPH */}
          {sugarData.length > 0 ? (
            <div className="sugar-graph-container">
              <div className="graph-header">
                <h3>🩸 Blood Sugar Level History</h3>
                <p>Tracking glycemic trends across logged clinical check-ins (mg/dL)</p>
              </div>
              <div style={{ width: '100%', height: 200, marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sugarData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="pdpSugarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(99, 102, 241, 0.12)" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false}
                      axisLine={false}
                      stroke="#94a3b8"
                      style={{ fontSize: '0.72rem', fontWeight: 500 }}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      stroke="#94a3b8"
                      style={{ fontSize: '0.72rem', fontWeight: 500 }}
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
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#pdpSugarGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="sugar-graph-empty">
              <div className="sge-content">
                <HeartPulse size={28} color="#cbd5e1" style={{ animation: 'pulse 2s infinite' }} />
                <p>No blood sugar levels recorded for this patient.</p>
              </div>
            </div>
          )}

          <div className="pdp-section-head">
            <div className="pdp-sec-title">
              <Activity size={17} color="#6366f1" />
              <span>Symptom History</span>
              <span className="pdp-count">{filteredSymptoms.length}</span>
            </div>

            {/* Date filter bar */}
            <div className="pdp-date-bar">
              <Calendar size={14} color="#6366f1" />
              <span className="pdp-date-lbl">From</span>
              <input type="date" className="pdp-date-inp" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="pdp-date-lbl">To</span>
              <input type="date" className="pdp-date-inp" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
              {(dateFrom || dateTo) && (
                <button className="pdp-date-clear" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {filteredSymptoms.length === 0 ? (
            <div className="pdp-sym-empty">
              <AlertCircle size={32} color="#cbd5e1" />
              <p>{(dateFrom || dateTo) ? 'No symptoms in this date range.' : 'No symptoms recorded yet.'}</p>
            </div>
          ) : (
            <div className="pdp-sym-list">
              {filteredSymptoms.map((s, i) => {
                const sc = SEV_COLOR(s.severity || 5);
                return (
                  <button
                    key={s.id || i}
                    className="pdp-sym-row"
                    onClick={() => setSymModal(s)}
                  >
                    <div className="psr-left">
                      <div className="psr-dot" style={{ background: sc.dot }} />
                      <div>
                        <div className="psr-title">{s.description}</div>
                        <div className="psr-meta">
                          {s.occurrence_date && (
                            <span>📅 {new Date(s.occurrence_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                          )}
                          {s.duration && <span>⏱ {s.duration}</span>}
                          {s.blood_sugar && <span>🩸 {s.blood_sugar} mg/dL</span>}
                        </div>
                      </div>
                    </div>
                    <div className="psr-right">
                      <span className="psr-badge" style={{ background: sc.bg, color: sc.text }}>
                        {sc.label} · {s.severity}/10
                      </span>
                      <ChevronDown size={15} color="#94a3b8" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: UPLOAD + PRESCRIBE */}
        <div className="pdp-col-right">

          {/* Upload Report */}
          <div className="pdp-panel">
            <div className="pdp-panel-title">
              <Upload size={17} color="#6366f1" />
              <span>Upload Report</span>
            </div>

            <div
              className={`pdp-dropzone ${file ? 'pdp-dz-filled' : ''}`}
              onClick={() => document.getElementById('pdp-file-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if(f){ setFile(f); setFileName(f.name.replace(/\.[^/.]+$/,'')); } }}
            >
              {file ? (
                <div className="pdp-file-info">
                  <FileText size={28} color="#6366f1" />
                  <span className="pdp-file-name">{file.name}</span>
                  <span className="pdp-file-size">{(file.size/1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <>
                  <Upload size={28} color="#c7d2fe" />
                  <span className="pdp-dz-txt">Drop file or click to browse</span>
                  <span className="pdp-dz-sub">PDF, JPG, PNG, DOCX</span>
                </>
              )}
            </div>
            <input id="pdp-file-input" type="file" hidden onChange={handleFileChange} />

            {file && (
              <div className="pdp-name-row">
                <label className="pdp-lbl">Report name</label>
                <input className="pdp-inp" placeholder="e.g. Blood Test Results" value={fileName} onChange={e => setFileName(e.target.value)} />
              </div>
            )}

            {upStatus && (
              <div className={`pdp-status pdp-status--${upStatus.type}`}>
                {upStatus.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {upStatus.msg}
              </div>
            )}

            <button className="pdp-btn-up" onClick={handleUpload} disabled={uploading || !file || !fileName.trim()}>
              {uploading ? <><Loader size={15} className="pdp-btn-spin" /> Uploading…</> : <><Upload size={15} /> Upload Report</>}
            </button>
          </div>

          {/* Prescribe */}
          <div className="pdp-panel">
            <div className="pdp-panel-title">
              <Pill size={17} color="#6366f1" />
              <span>Prescribe Medicine</span>
            </div>

            <form onSubmit={handlePrescribe} className="pdp-rx-form">
              <div className="pdp-rx-row">
                <div className="pdp-rx-field">
                  <label className="pdp-lbl">Medicine *</label>
                  <input required className="pdp-inp" placeholder="e.g. Amoxicillin" value={rx.medicine_name} onChange={e => setRx({...rx, medicine_name: e.target.value})} />
                </div>
                <div className="pdp-rx-field">
                  <label className="pdp-lbl">Dosage</label>
                  <input className="pdp-inp" placeholder="e.g. 500mg" value={rx.dosage} onChange={e => setRx({...rx, dosage: e.target.value})} />
                </div>
              </div>
              <div className="pdp-rx-row">
                <div className="pdp-rx-field">
                  <label className="pdp-lbl">Frequency</label>
                  <input className="pdp-inp" placeholder="e.g. Twice daily" value={rx.frequency} onChange={e => setRx({...rx, frequency: e.target.value})} />
                </div>
                <div className="pdp-rx-field">
                  <label className="pdp-lbl">Duration</label>
                  <input className="pdp-inp" placeholder="e.g. 7 days" value={rx.duration} onChange={e => setRx({...rx, duration: e.target.value})} />
                </div>
              </div>
              <div className="pdp-rx-field">
                <label className="pdp-lbl">Instructions</label>
                <textarea className="pdp-inp pdp-textarea" rows="2" placeholder="Take with food, avoid alcohol…" value={rx.instructions} onChange={e => setRx({...rx, instructions: e.target.value})} />
              </div>
              <div className="pdp-rx-field">
                <label className="pdp-lbl">Next visit date (optional)</label>
                <input type="date" className="pdp-inp" value={rx.next_visit_date} onChange={e => setRx({...rx, next_visit_date: e.target.value})} />
              </div>

              {rxStatus && (
                <div className={`pdp-status pdp-status--${rxStatus.type}`}>
                  {rxStatus.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {rxStatus.msg}
                </div>
              )}

              <button className="pdp-btn-rx" type="submit" disabled={rxLoading || !rx.medicine_name.trim()}>
                {rxLoading ? <><Loader size={15} className="pdp-btn-spin" /> Sending…</> : <><Send size={15} /> Send Prescription</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── STYLES ── */}
      <style>{`
        .pdp-root {
          display: flex; flex-direction: column; gap: 1.5rem;
          font-family: 'Inter', sans-serif; min-height: 100%;
        }
        .pdp-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 5rem; gap: 1rem;
          color: #94a3b8; font-size: 0.9rem; text-align: center;
        }
        .pdp-spinner {
          width: 30px; height: 30px;
          border: 3px solid rgba(99,102,241,0.15);
          border-top-color: #6366f1; border-radius: 50%;
          animation: pdpSpin 0.8s linear infinite;
        }
        @keyframes pdpSpin { to { transform: rotate(360deg); } }

        /* Back button */
        .pdp-back {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: none; border: none; cursor: pointer;
          font-size: 0.875rem; font-weight: 600; color: #6366f1;
          font-family: inherit; padding: 0;
          transition: gap 0.2s;
        }
        .pdp-back:hover { gap: 0.7rem; }
        .pdp-back-btn {
          padding: 0.6rem 1.25rem; background: #ede9fe; color: #4f46e5;
          border: none; border-radius: 0.75rem; font-weight: 600;
          cursor: pointer; font-family: inherit; font-size: 0.875rem;
        }

        /* ── Hero card ── */
        .pdp-hero-card {
          display: flex; align-items: center; gap: 1.25rem;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 1.25rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 4px 24px rgba(99,102,241,0.08);
        }
        .pdp-hero-av {
          width: 72px; height: 72px; border-radius: 50%;
          color: white; font-weight: 800; font-size: 1.4rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15); flex-shrink: 0;
          overflow: hidden;
        }
        .pdp-hero-av-img {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .pdp-hero-name {
          font-size: 1.65rem; font-weight: 800; margin: 0 0 0.625rem;
          color: #0f172a; font-family: 'Outfit', sans-serif;
        }
        .pdp-hero-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pdp-meta-chip {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.78rem; color: #64748b;
          background: #f8fafc; border: 1px solid #e2e8f0;
          padding: 0.3rem 0.65rem; border-radius: 999px;
        }
        .id-chip { font-family: monospace; font-size: 0.72rem; color: #94a3b8; }
        .pdp-hero-badge {
          margin-left: auto; flex-shrink: 0;
          display: flex; align-items: center; gap: 0.4rem;
          background: #ede9fe; color: #4f46e5;
          font-weight: 600; font-size: 0.82rem;
          padding: 0.5rem 1rem; border-radius: 999px;
        }

        /* ── Main grid ── */
        .pdp-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 1050px) { .pdp-grid { grid-template-columns: 1fr; } }

        /* ── Section head ── */
        .pdp-section-head { margin-bottom: 1.125rem; display: flex; flex-direction: column; gap: 0.875rem; }
        .pdp-sec-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-weight: 700; font-size: 0.9rem; color: #374151;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .pdp-count {
          background: #ede9fe; color: #4f46e5;
          font-size: 0.72rem; font-weight: 700;
          padding: 0.1rem 0.45rem; border-radius: 999px;
        }

        /* Date filter bar */
        .pdp-date-bar {
          display: flex; align-items: center; gap: 0.5rem;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 0.875rem;
          padding: 0.6rem 1rem;
          flex-wrap: wrap;
        }
        .pdp-date-lbl { font-size: 0.78rem; font-weight: 600; color: #6366f1; white-space: nowrap; }
        .pdp-date-inp {
          border: 1px solid #e2e8f0 !important; border-radius: 0.5rem !important;
          padding: 0.3rem 0.5rem !important; font-size: 0.8rem !important;
          width: auto !important; color: #374151 !important;
          background: white !important;
        }
        .pdp-date-inp:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.1) !important; }
        .pdp-date-clear {
          background: #fee2e2; border: none; border-radius: 6px;
          padding: 0.3rem 0.4rem; cursor: pointer; color: #ef4444;
          display: flex; align-items: center;
        }

        /* Symptoms list */
        .pdp-col-left {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(99,102,241,0.05);
        }
        .pdp-sym-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3rem 1rem; gap: 0.75rem;
          color: #94a3b8; font-size: 0.875rem; text-align: center;
        }
        .pdp-sym-list { 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
          max-height: 480px; 
          overflow-y: auto; 
          padding-right: 0.4rem;
        }
        /* Custom scrollbar styling */
        .pdp-sym-list::-webkit-scrollbar {
          width: 6px;
        }
        .pdp-sym-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .pdp-sym-list::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.25);
          border-radius: 4px;
        }
        .pdp-sym-list::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.45);
        }
        .pdp-sym-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; padding: 0.9rem 1rem; border-radius: 0.875rem;
          background: white; border: 1.5px solid #f1f5f9;
          cursor: pointer; text-align: left; width: 100%;
          font-family: inherit; transition: all 0.18s;
        }
        .pdp-sym-row:hover {
          border-color: rgba(99,102,241,0.3);
          box-shadow: 0 3px 12px rgba(99,102,241,0.08);
          transform: translateX(2px);
        }
        .psr-left { display: flex; align-items: center; gap: 0.875rem; min-width: 0; }
        .psr-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .psr-title { font-weight: 600; font-size: 0.9rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }
        .psr-meta { display: flex; gap: 0.75rem; font-size: 0.73rem; color: #94a3b8; margin-top: 2px; flex-wrap: wrap; }
        .psr-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .psr-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 999px; white-space: nowrap; }

        /* ── Right column panels ── */
        .pdp-col-right { display: flex; flex-direction: column; gap: 1.25rem; }
        .pdp-panel {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(99,102,241,0.05);
          display: flex; flex-direction: column; gap: 0.875rem;
        }
        .pdp-panel-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-weight: 700; font-size: 0.9rem; color: #374151;
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* Upload */
        .pdp-dropzone {
          border: 2px dashed rgba(99,102,241,0.25);
          border-radius: 0.875rem;
          padding: 1.75rem 1rem;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.5rem; cursor: pointer; text-align: center;
          background: #fafafe; transition: all 0.2s;
        }
        .pdp-dropzone:hover { border-color: #6366f1; background: rgba(99,102,241,0.03); }
        .pdp-dz-filled { border-style: solid; border-color: #6366f1; background: rgba(99,102,241,0.04); }
        .pdp-dz-txt { font-weight: 600; font-size: 0.88rem; color: #374151; }
        .pdp-dz-sub { font-size: 0.75rem; color: #94a3b8; }
        .pdp-file-info { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
        .pdp-file-name { font-weight: 600; font-size: 0.85rem; color: #1e293b; }
        .pdp-file-size { font-size: 0.75rem; color: #94a3b8; }

        /* Form elements */
        .pdp-name-row { display: flex; flex-direction: column; gap: 0.3rem; }
        .pdp-lbl { font-size: 0.8rem; font-weight: 600; color: #374151; }
        .pdp-inp {
          width: 100%; padding: 0.65rem 0.875rem;
          border: 1px solid #e2e8f0 !important; border-radius: 0.75rem !important;
          font-size: 0.88rem !important; font-family: inherit;
          background: white !important; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s; color: #1e293b;
        }
        .pdp-inp:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
        .pdp-textarea { resize: vertical; min-height: 70px; }

        .pdp-rx-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .pdp-rx-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .pdp-rx-field { display: flex; flex-direction: column; gap: 0.3rem; }
        @media (max-width: 450px) { .pdp-rx-row { grid-template-columns: 1fr; } }

        .pdp-status {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 0.875rem; border-radius: 0.75rem;
          font-size: 0.82rem; font-weight: 500;
        }
        .pdp-status--success { background: #d1fae5; color: #065f46; }
        .pdp-status--error   { background: #fee2e2; color: #991b1b; }

        .pdp-btn-up, .pdp-btn-rx {
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          padding: 0.8rem 1.25rem;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white; border: none; border-radius: 0.875rem;
          font-size: 0.9rem; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
        }
        .pdp-btn-up:hover:not(:disabled), .pdp-btn-rx:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .pdp-btn-up:disabled, .pdp-btn-rx:disabled { opacity: 0.45; cursor: not-allowed; }
        .pdp-btn-spin { animation: pdpSpin 0.7s linear infinite; }

        /* ── Symptom Modal ── */
        .sm-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; animation: smFadeIn 0.2s ease;
        }
        @keyframes smFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sm-box {
          background: white; border-radius: 1.25rem;
          padding: 2rem; max-width: 520px; width: 100%;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          position: relative; max-height: 90vh; overflow-y: auto;
          animation: smSlide 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes smSlide { from { transform: scale(0.94) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .sm-close {
          position: absolute; top: 1rem; right: 1rem;
          background: #f8fafc; border: none; border-radius: 8px;
          padding: 0.4rem; cursor: pointer; color: #64748b; transition: background 0.15s;
        }
        .sm-close:hover { background: #fee2e2; color: #ef4444; }
        .sm-top { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
        .sm-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .sm-title { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; padding-right: 2rem; }
        .sm-date { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; }
        .sm-badge { font-size: 0.78rem; font-weight: 700; padding: 0.3rem 0.75rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; margin-left: auto; }

        .sm-sev-wrap { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
        .sm-sev-track { flex: 1; height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
        .sm-sev-fill { height: 100%; border-radius: 999px; transition: width 0.3s; }
        .sm-sev-num { font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }

        .sm-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        .sm-detail {
          display: flex; align-items: flex-start; gap: 0.625rem;
          background: #f8fafc; border-radius: 0.75rem; padding: 0.75rem;
        }
        .sm-d-icon { color: #6366f1; flex-shrink: 0; margin-top: 2px; }
        .sm-d-label { font-size: 0.7rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .sm-d-val   { font-size: 0.875rem; font-weight: 600; color: #1e293b; margin-top: 1px; }

        .sm-notes { background: #fafafe; border: 1px solid #e0e7ff; border-radius: 0.875rem; padding: 1rem; margin-bottom: 0.75rem; }
        .sm-notes-label { font-size: 0.75rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
        .sm-notes-text { font-size: 0.875rem; color: #374151; margin: 0; line-height: 1.6; }

        .sm-img-wrap { border-radius: 0.875rem; overflow: hidden; }
        .sm-img { width: 100%; object-fit: cover; max-height: 200px; }

        /* Sugar level chart styling */
        .sugar-graph-container {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 1.25rem;
          padding: 1.25rem;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.04);
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .sugar-graph-empty {
          background: rgba(255, 255, 255, 0.45);
          border: 1.5px dashed rgba(99, 102, 241, 0.15);
          border-radius: 1.25rem;
          padding: 2.25rem 1.5rem;
          text-align: center;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .sge-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .sge-content p { margin: 0; }

        .graph-header h3 {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          font-family: 'Outfit', sans-serif;
        }
        .graph-header p {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0.15rem 0 0;
        }

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
          z-index: 9999;
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

export default PatientDetailPage;
