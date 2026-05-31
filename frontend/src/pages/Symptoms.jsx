import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Activity, Camera, X, CheckCircle, Droplets, Pill, FileText, Clock, AlertCircle, Loader, Heart, Thermometer, User, Compass, Calendar
} from 'lucide-react';
import { API_BASE } from '../lib/config';

const SEVERITY_COLORS = ['', '#10b981','#10b981','#34d399','#6ee7b7','#fbbf24','#f59e0b','#f97316','#ef4444','#dc2626','#b91c1c'];

const emptyForm = {
  description: '',
  occurrence_date: new Date().toISOString().split('T')[0],
  severity: 5,
  duration: '',
  durationUnit: 'hours',
  location: '',
  blood_sugar: '',
  notes: '',
  meal_info: '',
  medication_taken: '',
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
  const [editId, setEditId] = useState(null); // symptom id being edited
  const [alertingId, setAlertingId] = useState(null); // symptom id being alerted
  const [alertSent, setAlertSent] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user?.id) {
      fetchSymptoms();
    }
  }, []);

  const fetchSymptoms = async () => {
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, imagePreview: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError('Symptom description is required.');
      return;
    }
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
        associated_symptoms: null,
        notes: form.notes || null,
        blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
        meal_info: form.meal_info || null,
        medication_taken: form.medication_taken || null,
        image_url: form.imagePreview || null,
      };

      const url    = editId ? `${API_BASE}/symptoms/${editId}` : `${API_BASE}/symptoms/save`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
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
        setEditId(null);
        setForm(emptyForm);
        fetchSymptoms();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s) => {
    // Pre-fill form with existing symptom data
    const parts = (s.duration || '').split(' ');
    setEditId(s.id);
    setForm({
      description: s.description || '',
      occurrence_date: s.occurrence_date || new Date().toISOString().split('T')[0],
      severity: s.severity || 5,
      duration: parts[0] || '',
      durationUnit: parts[1] || 'hours',
      location: s.location || '',
      blood_sugar: s.blood_sugar || '',
      notes: s.notes || '',
      meal_info: s.meal_info || '',
      medication_taken: s.medication_taken || '',
      imagePreview: s.image_url || null,
    });
    setShowForm(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAlert = async (s) => {
    if (alertingId) return;
    setAlertingId(s.id);
    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.id,
          symptom_id: s.id,
          message: `Patient reported: ${s.description}`,
          severity: s.severity,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 3000);
    } catch (e) {
      alert('Failed to send alert. Please try again.');
    } finally {
      setAlertingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      await fetch(`${API_BASE}/symptoms/${id}`, { method: 'DELETE' });
      setSymptoms(s => s.filter(x => x.id !== id));
    } catch (e) {
      alert('Delete failed.');
    }
  };

  const getSevLabel = (s) => s <= 3 ? 'Mild' : s <= 6 ? 'Moderate' : 'Severe';
  const getSevBg = (s) => s <= 3 ? 'rgba(16, 185, 129, 0.12)' : s <= 6 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  const getSevText = (s) => s <= 3 ? '#10b981' : s <= 6 ? '#f59e0b' : '#ef4444';
  const getSevBorder = (s) => s <= 3 ? 'rgba(16, 185, 129, 0.2)' : s <= 6 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';

  return (
    <div className="sym-root">
      {/* DECORATIVE BLURRED IMAGE BACKDROP */}
      <div className="sym-glow-bg" />

      {/* ALERT SENT TOAST */}
      {alertSent && (
        <div className="sym-alert-toast">
          🚨 Alert sent to your doctor successfully!
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="sym-header sym-header-glass animate-fade-in">
        <div>
          <h1 className="sym-title">Symptom Journal</h1>
          <p className="sym-sub">Log daily check-ins to monitor sugar levels, meals, and general clinical wellness.</p>
        </div>
        <button className="sym-add-btn" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setError(''); }}>
          <Plus size={18} /> Log Check-In
        </button>
      </div>

      {/* WORLD-CLASS SYMPTOM INPUT FORM */}
      {showForm && (
        <div className="sym-form-card glass-panel animate-slide-down">
          <div className="sfc-header">
            <h2 className="sfc-title">{editId ? '✏️ Edit Health Check-In' : '🩺 New Health Check-In'}</h2>
            <button className="sfc-close" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); setError(''); }}>
              <X size={20} />
            </button>
          </div>

          {submitSuccess ? (
            <div className="sym-success">
              <CheckCircle size={48} color="#10b981" />
              <h3>Symptom Registered!</h3>
              <p>Your clinical status has been recorded in the secure DB archive.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="sym-form-body">
              {error && <div className="sym-error"><AlertCircle size={16} />{error}</div>}

              {/* ROW 1: DESCRIPTION & LOCATION */}
              <div className="form-row">
                <div className="form-group flex-2">
                  <label><Thermometer size={14} color="#3b82f6" /> What symptom do you experience? *</label>
                  <input
                    type="text" required
                    placeholder="E.g. Dizziness, Headaches, Chronic Fatigue..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label><Compass size={14} color="#3b82f6" /> Body Location <span className="opt-tag">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="E.g. Chest, joints, head..."
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
              </div>

              {/* ROW 2: DATE & DURATION */}
              <div className="form-row">
                <div className="form-group">
                  <label><Calendar size={14} color="#3b82f6" /> Date of Occurrence *</label>
                  <input
                    type="date" required
                    value={form.occurrence_date}
                    onChange={e => setForm(f => ({ ...f, occurrence_date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label><Clock size={14} color="#3b82f6" /> Duration <span className="opt-tag">(optional)</span></label>
                  <div className="duration-row">
                    <input
                      type="number" min="0" placeholder="E.g. 3"
                      value={form.duration}
                      onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    />
                    <select value={form.durationUnit} onChange={e => setForm(f => ({ ...f, durationUnit: e.target.value }))}>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEVERITY LEVEL - TACTILE SLIDER WITH COLOR BADGES */}
              <div className="form-group severity-section">
                <label className="slider-label">
                  <Heart size={14} color="#ef4444" /> Symptom Severity
                  <span className="slider-badge" style={{ background: getSevBg(form.severity), color: getSevText(form.severity), border: `1px solid ${getSevBorder(form.severity)}` }}>
                    {getSevLabel(form.severity)} · {form.severity}/10
                  </span>
                </label>
                
                <div className="slider-interactive-wrap">
                  <span className="slider-hint green">Mild</span>
                  <input
                    type="range" min="1" max="10" className="sym-slider"
                    value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: parseInt(e.target.value) }))}
                  />
                  <span className="slider-hint red">Severe</span>
                </div>
                
                <div className="severity-dots-bar">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <div key={n} className="sev-indicator-dot" style={{ background: SEVERITY_COLORS[n], opacity: n <= form.severity ? 1 : 0.15, transform: n === form.severity ? 'scale(1.35)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>

              {/* ROW 3: SUGAR & MEALS EXTRAS */}
              <div className="form-row glass-sub-section">
                <div className="form-group">
                  <label><Droplets size={14} color="#3b82f6" /> Blood Sugar Level (mg/dL) <span className="opt-tag">(optional)</span></label>
                  <input
                    type="number" min="0" placeholder="E.g. 135"
                    value={form.blood_sugar}
                    onChange={e => setForm(f => ({ ...f, blood_sugar: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>🍽 Meal Eaten Prior <span className="opt-tag">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="E.g. Oats with honey, high sugar snack..."
                    value={form.meal_info}
                    onChange={e => setForm(f => ({ ...f, meal_info: e.target.value }))}
                  />
                </div>
              </div>

              {/* COMMENTS AND PHOTO */}
              <div className="form-group">
                <label><FileText size={14} color="#64748b" /> Personal Comments / Private Notes <span className="opt-tag">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="Record how you felt, trigger factors, or medication interactions..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label><Camera size={14} color="#64748b" /> Symptom Image <span className="opt-tag">(optional)</span></label>
                <div className="photo-upload-zone" onClick={() => document.getElementById('photo-input').click()}>
                  {form.imagePreview ? (
                    <div className="photo-preview-wrap">
                      <img src={form.imagePreview} alt="symptom-preview" className="photo-preview-img" />
                      <button type="button" className="photo-remove-btn" onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, imagePreview: null })); }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera size={20} color="#94a3b8" />
                      <span>Click to upload symptom photo (rash, food, swelling, etc.)</span>
                    </>
                  )}
                </div>
                <input id="photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </div>

              {/* FORM ACTIONS */}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); setError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? <><Loader size={16} className="sym-spin" /> {editId ? 'Updating...' : 'Registering...'}</> : editId ? '✓ Update Check-In' : '✓ Save Check-In'}
                </button>
              </div>

            </form>
          )}
        </div>
      )}

      {/* LOGGED CHECKS TIMELINE */}
      <div className="sym-history-section">
        <h2>📋 Logged Check-Ins</h2>
        
        {loading ? (
          <div className="sym-loading-container">
            <Loader size={32} className="sym-spin-lg" />
            <p>Loading your logs...</p>
          </div>
        ) : symptoms.length === 0 ? (
          <div className="sym-empty-container">
            <Activity size={36} color="#cbd5e1" />
            <p>No symptoms logged. Click <strong>Log Check-In</strong> to record your first health log.</p>
          </div>
        ) : (
          <div className="sym-grid-feed">
            {symptoms.map((s, i) => {
              const isOpen = expandedId === (s.id || i);
              const sevBg = getSevBg(s.severity || 5);
              const sevTxt = getSevText(s.severity || 5);
              return (
                <div key={s.id || i} className="sym-item-card glass-panel">
                  <div className="sic-header" onClick={() => setExpandedId(isOpen ? null : (s.id || i))}>
                    <div className="sic-left">
                      <div className="sic-dot" style={{ background: SEVERITY_COLORS[s.severity || 5] }} />
                      <div>
                        <h4 className="sic-name">{s.description}</h4>
                        <span className="sic-date">
                          <Clock size={12} />
                          {s.occurrence_date ? new Date(s.occurrence_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="sic-right">
                      <span className="sic-sev-pill" style={{ background: sevBg, color: sevTxt, border: `1px solid ${getSevBorder(s.severity || 5)}` }}>
                        {getSevLabel(s.severity || 5)} · {s.severity}/10
                      </span>
                      <button className="sic-edit" title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(s); }}>
                        ✏️
                      </button>
                      <button
                        className="sic-alert-btn"
                        title="Alert Doctor"
                        disabled={alertingId === s.id}
                        onClick={(e) => { e.stopPropagation(); handleAlert(s); }}
                      >
                        🚨
                      </button>
                      <button className="sic-delete" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                        <Trash2 size={14} />
                      </button>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sic-body">
                      <div className="sic-details-chips">
                        {s.blood_sugar && (
                          <div className="sic-chip">
                            <Droplets size={13} color="#3b82f6" />
                            Sugar: <strong>{s.blood_sugar} mg/dL</strong>
                          </div>
                        )}
                        {s.meal_info && (
                          <div className="sic-chip">
                            🍽 Meal: <strong>{s.meal_info}</strong>
                          </div>
                        )}
                        {s.location && (
                          <div className="sic-chip">
                            📍 Location: <strong>{s.location}</strong>
                          </div>
                        )}
                        {s.duration && (
                          <div className="sic-chip">
                            ⏱ Duration: <strong>{s.duration}</strong>
                          </div>
                        )}
                      </div>
                      
                      {s.notes && (
                        <div className="sic-comment-box">
                          <FileText size={14} />
                          <span>{s.notes}</span>
                        </div>
                      )}

                      {s.image_url && (
                        <img src={s.image_url} alt="logged symptom" className="sic-image" />
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
        .sym-root { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; position: relative; }

        /* BLURRED BACKGROUND BACKDROP */
        .sym-glow-bg {
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

        /* HEADER */
        .sym-header-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.25rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .sym-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; }
        .sym-sub { color: #475569; margin: 0.35rem 0 0; font-size: 0.875rem; line-height: 1.5; }
        
        .sym-add-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.35rem;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          border: none; border-radius: 0.625rem; font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }
        .sym-add-btn:hover { transform: translateY(-1px); opacity: 0.95; }

        /* FORM PANEL */
        .glass-panel {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 1.25rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
        }
        .sym-form-card { overflow: hidden; }
        .sfc-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .sfc-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
        .sfc-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; border-radius: 0.5rem; }
        .sfc-close:hover { background: rgba(0,0,0,0.05); color: #ef4444; }

        .sym-form-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        
        .form-row { display: flex; gap: 1rem; }
        @media (max-width: 600px) { .form-row { flex-direction: column; gap: 1.25rem; } }
        
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; }
        .form-group.flex-2 { flex: 2; }
        .form-group label { font-size: 0.825rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 0.35rem; }
        .form-group input, .form-group select, .form-group textarea {
          border: 1.5px solid #e2e8f0; border-radius: 0.625rem; padding: 0.7rem 0.875rem;
          font-size: 0.9rem; color: #0f172a; background: white; transition: all 0.15s;
          font-family: inherit; box-sizing: border-box; width: 100%;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .opt-tag { font-size: 0.75rem; color: #94a3b8; font-weight: 400; }
        .duration-row { display: flex; gap: 0.5rem; }
        .duration-row input { flex: 1; }
        .duration-row select { width: auto; }

        .glass-sub-section {
          background: rgba(255, 255, 255, 0.4);
          padding: 1rem; border-radius: 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        /* SEVERITY SLIDER */
        .severity-section { background: rgba(255, 255, 255, 0.4); padding: 1rem; border-radius: 0.875rem; border: 1px solid rgba(255, 255, 255, 0.5); }
        .slider-label { display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; }
        .slider-badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; transition: all 0.2s; }
        
        .slider-interactive-wrap { display: flex; align-items: center; gap: 1rem; }
        .slider-hint { font-size: 0.75rem; font-weight: 700; }
        .slider-hint.green { color: #10b981; }
        .slider-hint.red { color: #ef4444; }

        .sym-slider {
          flex: 1; -webkit-appearance: none; height: 6px; border-radius: 999px;
          background: linear-gradient(90deg, #10b981 0%, #fbbf24 50%, #ef4444 100%);
          outline: none; cursor: pointer;
        }
        .sym-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 3px solid #2563eb; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.1s;
        }
        .sym-slider::-webkit-slider-thumb:active { transform: scale(1.2); }
        
        .severity-dots-bar { display: flex; gap: 0.5rem; margin-top: 0.875rem; justify-content: space-between; padding: 0 0.5rem; }
        .sev-indicator-dot { flex: 1; height: 6px; border-radius: 3px; transition: all 0.25s ease; }

        /* PHOTO UPLOAD */
        .photo-upload-zone {
          border: 1.5px dashed #cbd5e1; border-radius: 0.75rem; padding: 1.5rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          cursor: pointer; transition: all 0.2s; font-size: 0.8rem; color: #64748b;
          background: rgba(255,255,255,0.4); text-align: center;
        }
        .photo-upload-zone:hover { border-color: #2563eb; background: #eff6ff; }
        .photo-preview-wrap { position: relative; }
        .photo-preview-img { max-height: 140px; border-radius: 0.5rem; object-fit: contain; }
        .photo-remove-btn {
          position: absolute; top: -6px; right: -6px; width: 20px; height: 20px;
          background: #ef4444; color: white; border: none; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        /* FORM ACTIONS */
        .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 1rem; }
        .btn-cancel { padding: 0.65rem 1.35rem; border-radius: 0.5rem; border: 1.5px solid #cbd5e1; background: white; color: #475569; font-weight: 600; cursor: pointer; }
        .btn-cancel:hover { background: #fafafa; }
        .btn-submit {
          padding: 0.65rem 1.65rem; border-radius: 0.5rem; border: none;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: opacity 0.2s; box-shadow: 0 4px 14px rgba(37,99,235,0.2);
        }
        .btn-submit:hover { opacity: 0.95; }

        /* SUCCESS / ERROR */
        .sym-success { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem; text-align: center; color: #065f46; }
        .sym-success h3 { font-size: 1.15rem; margin: 0; }
        .sym-success p { font-size: 0.85rem; color: #64748b; margin: 0; }
        .sym-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1rem; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 0.5rem; font-size: 0.85rem; }

        /* HISTORY */
        .sym-history-section { display: flex; flex-direction: column; gap: 1rem; position: relative; z-index: 1; }
        .sym-history-section h2 { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
        .sym-loading-container, .sym-empty-container { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3.5rem; color: #94a3b8; font-size: 0.875rem; text-align: center; }
        .sym-empty-container p { max-width: 280px; line-height: 1.5; }
        
        .sym-spin { animation: spin 0.8s linear infinite; }
        .sym-spin-lg { animation: spin 0.8s linear infinite; color: #2563eb; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sym-grid-feed { display: flex; flex-direction: column; gap: 0.75rem; }
        .sym-item-card { border-radius: 1rem; border: 1px solid rgba(0,0,0,0.04); overflow: hidden; transition: all 0.2s; }
        .sym-item-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .sic-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; cursor: pointer; gap: 1rem; }
        .sic-left { display: flex; align-items: center; gap: 0.875rem; min-width: 0; }
        .sic-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sic-name { font-weight: 600; color: #0f172a; font-size: 0.925rem; margin: 0; }
        .sic-date { display: flex; align-items: center; gap: 0.3rem; color: #94a3b8; font-size: 0.75rem; margin-top: 0.15rem; }
        .sic-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .sic-sev-pill { padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; transition: all 0.15s; }
        .sic-delete { background: none; border: none; color: #fca5a5; cursor: pointer; padding: 0.25rem; border-radius: 0.35rem; transition: all 0.15s; }
        .sic-delete:hover { background: #fee2e2; color: #ef4444; }

        .sic-body { padding: 1rem 1.25rem 1.25rem; border-top: 1px solid rgba(0,0,0,0.04); background: rgba(255,255,255,0.4); }
        .sic-details-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
        .sic-chip { display: flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.65rem; background: white; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 0.78rem; color: #475569; }
        .sic-comment-box { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.82rem; color: #64748b; font-style: italic; background: white; padding: 0.625rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; }
        .sic-image { max-height: 120px; border-radius: 0.5rem; margin-top: 0.75rem; object-fit: contain; }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .sic-edit {
          background: none; border: none; cursor: pointer;
          padding: 0.25rem 0.35rem; border-radius: 0.35rem;
          font-size: 0.9rem; transition: all 0.15s; line-height: 1;
        }
        .sic-edit:hover { background: #eff6ff; transform: scale(1.15); }

        .sic-alert-btn {
          background: none; border: none; cursor: pointer;
          padding: 0.25rem 0.35rem; border-radius: 0.35rem;
          font-size: 0.9rem; transition: all 0.15s; line-height: 1;
        }
        .sic-alert-btn:hover:not(:disabled) { background: #fff1f2; transform: scale(1.15); }
        .sic-alert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .sym-alert-toast {
          position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; font-weight: 700; font-size: 0.875rem;
          padding: 0.75rem 1.5rem; border-radius: 999px;
          box-shadow: 0 4px 20px rgba(239,68,68,0.35);
          z-index: 9999;
          animation: toastIn 0.35s cubic-bezier(0.16,1,0.3,1), toastOut 0.3s ease 2.7s forwards;
        }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes toastOut { to { opacity: 0; transform: translateX(-50%) translateY(-8px); } }
      `}</style>
    </div>
  );
};

export default Symptoms;
