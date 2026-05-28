import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Activity, Camera, X, CheckCircle, Droplets,
  Pill, FileText, Clock, AlertCircle
} from 'lucide-react';
import { API_BASE } from '../lib/config';

const SEVERITY_COLORS = ['', '#22c55e','#4ade80','#86efac','#fbbf24','#f59e0b','#f97316','#ef4444','#dc2626','#b91c1c','#7f1d1d'];

const ASSOCIATED_OPTS = ['Fever', 'Fatigue', 'Nausea', 'Headache', 'Cough', 'Chills', 'Dizziness', 'Sweating', 'Loss of appetite', 'Insomnia'];

const emptyForm = {
  description: '',
  occurrence_date: new Date().toISOString().split('T')[0],
  occurrence_time: new Date().toTimeString().slice(0, 5),
  severity: 5,
  duration: '',
  durationUnit: 'hours',
  location: '',
  associatedSymptoms: [],
  blood_sugar: '',
  notes: '',
  meal_info: '',
  medication_taken: '',
  imageFile: null,
  imagePreview: null,
};

const Symptoms = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { if (user?.id) fetchSymptoms(); }, []);

  const fetchSymptoms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/symptoms/patient/${user.id}`);
      const data = await res.json();
      setSymptoms(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, imageFile: file, imagePreview: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { setError('Symptom description is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        patient_id: user.id,
        description: form.description.trim(),
        occurrence_date: form.occurrence_date,
        severity: form.severity,
        duration: form.duration ? `${form.duration} ${form.durationUnit}` : null,
        location: form.location || null,
        associated_symptoms: form.associatedSymptoms.length ? form.associatedSymptoms.join(', ') : null,
        notes: form.notes || null,
        blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
        meal_info: form.meal_info || null,
        medication_taken: form.medication_taken || null,
        image_url: form.imagePreview || null,
      };

      const res = await fetch(`${API_BASE}/symptoms/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to save symptom.');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
        setForm(emptyForm);
        fetchSymptoms();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this symptom log?')) return;
    try {
      await fetch(`${API_BASE}/symptoms/${id}`, { method: 'DELETE' });
      setSymptoms(s => s.filter(x => x.id !== id));
    } catch (e) { alert('Delete failed.'); }
  };

  const toggleAssoc = (sym) => {
    setForm(f => ({
      ...f,
      associatedSymptoms: f.associatedSymptoms.includes(sym)
        ? f.associatedSymptoms.filter(s => s !== sym)
        : [...f.associatedSymptoms, sym]
    }));
  };

  const getSevLabel = (s) => s <= 3 ? 'Mild' : s <= 6 ? 'Moderate' : 'Severe';
  const getSevBg = (s) => s <= 3 ? '#d1fae5' : s <= 6 ? '#fef3c7' : '#fee2e2';
  const getSevText = (s) => s <= 3 ? '#065f46' : s <= 6 ? '#92400e' : '#991b1b';

  return (
    <div className="sym-root">
      {/* PAGE HEADER */}
      <div className="sym-header">
        <div>
          <h1 className="sym-title">Symptom Journal</h1>
          <p className="sym-sub">Track how you feel and log your daily health check-ins</p>
        </div>
        <button className="sym-add-btn" onClick={() => { setShowForm(true); setError(''); }}>
          <Plus size={18} /> Log New Symptom
        </button>
      </div>

      {/* INLINE FORM */}
      {showForm && (
        <div className="sym-form-card">
          <div className="sfc-header">
            <h2 className="sfc-title">📋 New Symptom Entry</h2>
            <button className="sfc-close" onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}>
              <X size={20} />
            </button>
          </div>

          {submitSuccess ? (
            <div className="sym-success">
              <CheckCircle size={48} color="#10b981" />
              <h3>Logged Successfully!</h3>
              <p>Your symptom has been saved.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="sym-error"><AlertCircle size={16} />{error}</div>}

              {/* SECTION: BASICS */}
              <div className="sym-section">
                <div className="sym-section-title">Basic Info <span className="sym-req-star">*required</span></div>
                <div className="sym-row-2">
                  <div className="sym-field">
                    <label>What symptom are you experiencing? *</label>
                    <input
                      type="text" required
                      placeholder="E.g. Dizziness, Chest tightness, Headache..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="sym-field">
                    <label>Body Location</label>
                    <input
                      type="text"
                      placeholder="E.g. Head, Chest, Stomach, Back..."
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="sym-row-2">
                  <div className="sym-field">
                    <label>Date of Occurrence *</label>
                    <input
                      type="date" required
                      value={form.occurrence_date}
                      onChange={e => setForm(f => ({ ...f, occurrence_date: e.target.value }))}
                    />
                  </div>
                  <div className="sym-field">
                    <label>How long has it lasted?</label>
                    <div className="sym-duration-row">
                      <input
                        type="number" min="0" placeholder="Duration"
                        value={form.duration}
                        onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                      />
                      <select value={form.durationUnit} onChange={e => setForm(f => ({ ...f, durationUnit: e.target.value }))}>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: SEVERITY */}
              <div className="sym-section">
                <div className="sym-section-title">Severity Level</div>
                <label className="sym-sev-label">
                  How intense is the symptom?
                  <span className="sym-sev-badge" style={{ background: getSevBg(form.severity), color: getSevText(form.severity) }}>
                    {form.severity}/10 — {getSevLabel(form.severity)}
                  </span>
                </label>
                <div className="sym-slider-wrap">
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>Mild</span>
                  <input
                    type="range" min="1" max="10" className="sym-slider"
                    value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: parseInt(e.target.value) }))}
                    style={{ '--sv': form.severity }}
                  />
                  <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Severe</span>
                </div>
                <div className="sym-sev-dots">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <div key={n} className="sym-sev-dot" style={{ background: SEVERITY_COLORS[n], opacity: n <= form.severity ? 1 : 0.2 }} />
                  ))}
                </div>
              </div>

              {/* SECTION: ASSOCIATED */}
              <div className="sym-section">
                <div className="sym-section-title">Associated Symptoms <span className="sym-opt">(optional)</span></div>
                <div className="sym-tags-grid">
                  {ASSOCIATED_OPTS.map(sym => (
                    <button
                      type="button" key={sym}
                      className={`sym-tag ${form.associatedSymptoms.includes(sym) ? 'sym-tag-active' : ''}`}
                      onClick={() => toggleAssoc(sym)}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION: OPTIONAL EXTRAS */}
              <div className="sym-section">
                <div className="sym-section-title">Optional Health Data</div>
                <div className="sym-row-2">
                  <div className="sym-field">
                    <label><Droplets size={14} /> Blood Sugar Reading (mg/dL)</label>
                    <input
                      type="number" min="0" placeholder="E.g. 140"
                      value={form.blood_sugar}
                      onChange={e => setForm(f => ({ ...f, blood_sugar: e.target.value }))}
                    />
                    <span className="sym-hint">The doctor can see if high sugar caused your symptoms</span>
                  </div>
                  <div className="sym-field">
                    <label><Pill size={14} /> Medication Taken?</label>
                    <div className="sym-med-toggle">
                      {['yes', 'no', 'partial'].map(opt => (
                        <button
                          type="button" key={opt}
                          className={`sym-toggle-btn ${form.medication_taken === opt ? 'sym-toggle-active' : ''}`}
                          onClick={() => setForm(f => ({ ...f, medication_taken: opt }))}
                        >
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sym-field">
                  <label><FileText size={14} /> What did you eat? (Meal info)</label>
                  <input
                    type="text" placeholder="E.g. Rice and curry, skipped breakfast, had sugary drink..."
                    value={form.meal_info}
                    onChange={e => setForm(f => ({ ...f, meal_info: e.target.value }))}
                  />
                </div>

                <div className="sym-field">
                  <label><FileText size={14} /> Personal Note</label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Forgot to take insulin last night. Feeling unusually tired today..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                  <span className="sym-hint">These notes are private and help the doctor understand context</span>
                </div>

                <div className="sym-field">
                  <label><Camera size={14} /> Upload Photo (optional)</label>
                  <div className="sym-upload-zone" onClick={() => document.getElementById('sym-img-input').click()}>
                    {form.imagePreview ? (
                      <div className="sym-img-preview-wrap">
                        <img src={form.imagePreview} alt="symptom" className="sym-img-preview" />
                        <button type="button" className="sym-img-remove" onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, imageFile: null, imagePreview: null })); }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Camera size={24} color="#94a3b8" />
                        <span>Click to upload a photo (swelling, rash, food, etc.)</span>
                      </>
                    )}
                  </div>
                  <input id="sym-img-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
              </div>

              <div className="sym-form-actions">
                <button type="button" className="sym-btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="sym-btn-submit" disabled={submitting}>
                  {submitting ? <><span className="sym-spin" />Saving...</> : '✓ Save Symptom Log'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* HISTORY LIST */}
      <div className="sym-history">
        <h2 className="sym-hist-title">Your Symptom History</h2>
        {loading ? (
          <div className="sym-loader"><div className="sym-spin-lg" /><p>Loading your health log...</p></div>
        ) : symptoms.length === 0 ? (
          <div className="sym-empty">
            <Activity size={40} color="#cbd5e1" />
            <p>No symptoms logged yet.</p>
            <button className="sym-add-btn" onClick={() => setShowForm(true)}><Plus size={16} />Log your first symptom</button>
          </div>
        ) : (
          <div className="sym-list">
            {symptoms.map((s, i) => {
              const isOpen = expandedId === (s.id || i);
              const sevBg = getSevBg(s.severity || 5);
              const sevTxt = getSevText(s.severity || 5);
              return (
                <div key={s.id || i} className="sym-item">
                  <div className="sym-item-header" onClick={() => setExpandedId(isOpen ? null : (s.id || i))}>
                    <div className="sym-item-left">
                      <div className="sym-item-dot" style={{ background: SEVERITY_COLORS[s.severity || 5] }} />
                      <div>
                        <div className="sym-item-name">{s.description}</div>
                        <div className="sym-item-meta">
                          <Clock size={12} />
                          {s.occurrence_date ? new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown date'}
                          {s.location && <> · 📍 {s.location}</>}
                          {s.duration && <> · ⏱ {s.duration}</>}
                        </div>
                      </div>
                    </div>
                    <div className="sym-item-right">
                      <span className="sym-sev-pill" style={{ background: sevBg, color: sevTxt }}>
                        {getSevLabel(s.severity || 5)} · {s.severity}/10
                      </span>
                      <button className="sym-item-delete" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                        <Trash2 size={15} />
                      </button>
                      {isOpen ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sym-item-body">
                      <div className="sym-detail-grid">
                        {s.blood_sugar && (
                          <div className="sym-detail-chip">
                            <Droplets size={14} color="#3b82f6" />
                            Blood Sugar: <strong>{s.blood_sugar} mg/dL</strong>
                          </div>
                        )}
                        {s.medication_taken && (
                          <div className="sym-detail-chip">
                            <Pill size={14} color="#8b5cf6" />
                            Medication: <strong>{s.medication_taken}</strong>
                          </div>
                        )}
                        {s.meal_info && (
                          <div className="sym-detail-chip">
                            🍽 Meal: <strong>{s.meal_info}</strong>
                          </div>
                        )}
                        {s.associated_symptoms && (
                          <div className="sym-detail-chip">
                            🔗 Also: <strong>{s.associated_symptoms}</strong>
                          </div>
                        )}
                      </div>
                      {s.notes && (
                        <div className="sym-detail-note">
                          <FileText size={14} /> <span>{s.notes}</span>
                        </div>
                      )}
                      {s.image_url && (
                        <img src={s.image_url} alt="symptom" className="sym-detail-img" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .sym-root { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; }

        /* HEADER */
        .sym-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .sym-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; }
        .sym-sub { color: #64748b; margin: 0.25rem 0 0; font-size: 0.9rem; }
        .sym-add-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.25rem;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          border: none; border-radius: 0.75rem; font-weight: 600; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s;
        }
        .sym-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35); }

        /* FORM CARD */
        .sym-form-card {
          background: white; border-radius: 1.25rem;
          border: 1px solid #e2e8f0; box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .sfc-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.5rem 1.75rem; border-bottom: 1px solid #f1f5f9;
        }
        .sfc-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
        .sfc-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; border-radius: 0.5rem; }
        .sfc-close:hover { background: #f1f5f9; color: #ef4444; }

        /* SECTIONS */
        .sym-section { padding: 1.5rem 1.75rem; border-bottom: 1px solid #f8fafc; }
        .sym-section-title { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .sym-req-star { color: #ef4444; margin-left: 4px; }
        .sym-opt { color: #94a3b8; font-weight: 400; text-transform: none; font-size: 0.75rem; }

        .sym-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) { .sym-row-2 { grid-template-columns: 1fr; } }

        .sym-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .sym-field label { font-size: 0.85rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 0.3rem; }
        .sym-field input, .sym-field select, .sym-field textarea {
          border: 1.5px solid #e2e8f0; border-radius: 0.625rem; padding: 0.65rem 0.875rem;
          font-size: 0.9rem; color: #0f172a; background: #fafafa; transition: border 0.15s;
          font-family: inherit; width: 100%; box-sizing: border-box;
        }
        .sym-field input:focus, .sym-field select:focus, .sym-field textarea:focus {
          outline: none; border-color: #2563eb; background: white; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .sym-field textarea { resize: vertical; }
        .sym-hint { font-size: 0.75rem; color: #94a3b8; }

        .sym-duration-row { display: flex; gap: 0.5rem; }
        .sym-duration-row input { flex: 1; }
        .sym-duration-row select { flex: 0 0 auto; width: auto; }

        /* SEVERITY */
        .sym-sev-label { display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; }
        .sym-sev-badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; }
        .sym-slider-wrap { display: flex; align-items: center; gap: 1rem; }
        .sym-slider {
          flex: 1; -webkit-appearance: none; height: 8px; border-radius: 999px;
          background: linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%);
          outline: none; cursor: pointer;
        }
        .sym-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
          background: white; border: 3px solid #2563eb; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .sym-sev-dots { display: flex; gap: 0.4rem; margin-top: 0.75rem; }
        .sym-sev-dot { flex: 1; height: 6px; border-radius: 3px; transition: opacity 0.2s; }

        /* TAGS */
        .sym-tags-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .sym-tag {
          padding: 0.375rem 0.875rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500;
          border: 1.5px solid #e2e8f0; background: white; color: #475569; cursor: pointer; transition: all 0.15s;
        }
        .sym-tag:hover { border-color: #2563eb; color: #2563eb; }
        .sym-tag-active { background: #eff6ff; border-color: #2563eb; color: #1d4ed8; font-weight: 600; }

        /* MED TOGGLE */
        .sym-med-toggle { display: flex; gap: 0.5rem; }
        .sym-toggle-btn {
          flex: 1; padding: 0.6rem; border-radius: 0.5rem; border: 1.5px solid #e2e8f0;
          font-size: 0.85rem; font-weight: 600; cursor: pointer; background: white;
          color: #475569; transition: all 0.15s;
        }
        .sym-toggle-btn:hover { border-color: #94a3b8; }
        .sym-toggle-active { background: #eff6ff; border-color: #2563eb; color: #1d4ed8; }

        /* IMAGE UPLOAD */
        .sym-upload-zone {
          border: 2px dashed #e2e8f0; border-radius: 0.875rem; padding: 2rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          cursor: pointer; transition: all 0.2s; color: #94a3b8; font-size: 0.85rem; text-align: center;
          background: #fafafa;
        }
        .sym-upload-zone:hover { border-color: #2563eb; background: #eff6ff; }
        .sym-img-preview-wrap { position: relative; }
        .sym-img-preview { max-height: 180px; border-radius: 0.5rem; object-fit: contain; }
        .sym-img-remove {
          position: absolute; top: -8px; right: -8px; width: 24px; height: 24px;
          background: #ef4444; color: white; border: none; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        /* SUCCESS */
        .sym-success { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; text-align: center; }
        .sym-success h3 { color: #065f46; font-size: 1.25rem; margin: 0; }
        .sym-success p { color: #6b7280; margin: 0; }

        /* ERROR */
        .sym-error {
          display: flex; align-items: center; gap: 0.5rem; margin: 1rem 1.75rem 0;
          padding: 0.875rem 1rem; background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; border-radius: 0.5rem; font-size: 0.875rem;
        }

        /* FORM ACTIONS */
        .sym-form-actions {
          display: flex; justify-content: flex-end; gap: 1rem; padding: 1.5rem 1.75rem;
          border-top: 1px solid #f1f5f9;
        }
        .sym-btn-cancel { padding: 0.7rem 1.5rem; border-radius: 0.625rem; border: 1.5px solid #e2e8f0; background: white; color: #475569; font-weight: 600; cursor: pointer; }
        .sym-btn-cancel:hover { background: #f8fafc; }
        .sym-btn-submit {
          padding: 0.7rem 1.75rem; border-radius: 0.625rem; border: none;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          transition: opacity 0.2s;
        }
        .sym-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .sym-btn-submit:not(:disabled):hover { opacity: 0.9; }
        .sym-spin, .sym-spin-lg {
          display: inline-block; border-radius: 50%;
          border-color: rgba(255,255,255,0.3); border-style: solid; border-top-color: white;
          animation: spspin 0.7s linear infinite;
        }
        .sym-spin { width: 15px; height: 15px; border-width: 2px; }
        .sym-spin-lg { width: 28px; height: 28px; border-width: 3px; border-top-color: #2563eb; border-color: #e2e8f0; }
        @keyframes spspin { to { transform: rotate(360deg); } }

        /* HISTORY */
        .sym-history { display: flex; flex-direction: column; gap: 1rem; }
        .sym-hist-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .sym-loader { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: #94a3b8; }
        .sym-empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 2rem; color: #94a3b8; background: white; border-radius: 1rem; border: 2px dashed #e2e8f0; text-align: center; }

        .sym-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .sym-item { background: white; border-radius: 1rem; border: 1px solid #f1f5f9; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow 0.2s; }
        .sym-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .sym-item-header { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.25rem; cursor: pointer; gap: 1rem; }
        .sym-item-left { display: flex; align-items: center; gap: 0.875rem; flex: 1; min-width: 0; }
        .sym-item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .sym-item-name { font-weight: 600; color: #0f172a; font-size: 0.95rem; }
        .sym-item-meta { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.78rem; margin-top: 0.2rem; flex-wrap: wrap; }
        .sym-item-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .sym-sev-pill { padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
        .sym-item-delete { background: none; border: none; color: #fca5a5; cursor: pointer; padding: 0.3rem; border-radius: 0.4rem; transition: all 0.15s; }
        .sym-item-delete:hover { background: #fee2e2; color: #ef4444; }

        .sym-item-body { padding: 1rem 1.25rem 1.25rem; border-top: 1px solid #f8fafc; background: #fafafa; }
        .sym-detail-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
        .sym-detail-chip { display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; background: white; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 0.8rem; color: #374151; }
        .sym-detail-note { display: flex; align-items: flex-start; gap: 0.5rem; color: #64748b; font-size: 0.85rem; font-style: italic; padding: 0.5rem 0; }
        .sym-detail-img { max-height: 150px; border-radius: 0.5rem; margin-top: 0.5rem; object-fit: contain; }
      `}</style>
    </div>
  );
};

export default Symptoms;
