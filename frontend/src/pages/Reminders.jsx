import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, Clock, Pill, X } from 'lucide-react';

const STORAGE_KEY = 'ehr_reminders';

const FREQUENCIES = [
  { label: 'Every N Hours', value: 'interval' },
  { label: 'Daily (specific time)', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const emptyForm = {
  medicine: '',
  dosage: '',
  frequency: 'daily',
  intervalHours: 8,
  dailyTime: '08:00',
  weeklyDay: 1,
  weeklyTime: '08:00',
  notes: '',
};

const getNextFire = (reminder) => {
  const now = new Date();
  if (reminder.frequency === 'interval') {
    if (!reminder.lastFired) return new Date(now.getTime() + reminder.intervalHours * 3600000);
    return new Date(new Date(reminder.lastFired).getTime() + reminder.intervalHours * 3600000);
  }
  if (reminder.frequency === 'daily') {
    const [h, m] = reminder.dailyTime.split(':').map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  if (reminder.frequency === 'weekly') {
    const [h, m] = reminder.weeklyTime.split(':').map(Number);
    const next = new Date(now);
    const diffDays = (reminder.weeklyDay - now.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + diffDays);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next;
  }
  return null;
};

const isDue = (reminder) => {
  if (!reminder.enabled) return false;
  const next = getNextFire(reminder);
  if (!next) return false;
  return next <= new Date();
};

const formatNextFire = (reminder) => {
  const next = getNextFire(reminder);
  if (!next) return 'Not scheduled';
  const now = new Date();
  const diff = next - now;
  if (diff < 0) return 'Due now!';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `In ${m}m`;
  if (h < 24) return `In ${h}h ${m}m`;
  return `In ${Math.floor(h/24)}d ${h%24}h`;
};

const Reminders = () => {
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [notifPerm, setNotifPerm] = useState('default');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  // Polling checker every 60 seconds
  useEffect(() => {
    const check = () => {
      if (Notification.permission !== 'granted') return;
      setReminders(prev => prev.map(r => {
        if (!r.enabled) return r;
        if (isDue(r)) {
          new Notification('💊 Medicine Reminder', {
            body: `Time to take ${r.medicine}${r.dosage ? ` — ${r.dosage}` : ''}`,
            icon: '/favicon.ico',
            tag: r.id,
          });
          return { ...r, lastFired: new Date().toISOString() };
        }
        return r;
      }));
    };
    check();
    checkIntervalRef.current = setInterval(check, 60000);
    return () => clearInterval(checkIntervalRef.current);
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      setSuccess('Notifications enabled! You will get reminders on time.');
      new Notification('✅ EHR Reminders Active', { body: 'You will now receive medication reminders.' });
    } else {
      setError('Notification permission denied. Please allow it in your browser settings.');
    }
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!form.medicine.trim()) { setError('Medicine name is required.'); return; }
    const newReminder = {
      id: `r_${Date.now()}`,
      ...form,
      enabled: true,
      lastFired: null,
      createdAt: new Date().toISOString(),
    };
    setReminders(prev => [newReminder, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
    setError('');
    setSuccess(`Reminder set for "${newReminder.medicine}"!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const toggleReminder = (id) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteReminder = (id) => {
    if (!window.confirm('Delete this reminder?')) return;
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const getFreqLabel = (r) => {
    if (r.frequency === 'interval') return `Every ${r.intervalHours} hours`;
    if (r.frequency === 'daily') return `Daily at ${r.dailyTime}`;
    if (r.frequency === 'weekly') return `Every ${DAYS_OF_WEEK[r.weeklyDay]} at ${r.weeklyTime}`;
    return '';
  };

  return (
    <div className="rem-root">
      {/* HERO */}
      <div className="rem-hero">
        <div className="rem-hero-glow" />
        <div className="rem-hero-icon"><Bell size={32} /></div>
        <div>
          <h1 className="rem-title">Medication Reminders</h1>
          <p className="rem-sub">Set up smart reminders and get browser notifications when it's time to take your medicine — even when this page is in the background.</p>
        </div>
      </div>

      {/* NOTIFICATION PERMISSION BANNER */}
      {notifPerm !== 'granted' && (
        <div className="rem-notif-banner">
          <div className="rem-nb-left">
            <Bell size={20} />
            <div>
              <p className="rem-nb-title">Enable Browser Notifications</p>
              <p className="rem-nb-sub">Allow notifications so your reminders can alert you even when you're on a different tab.</p>
            </div>
          </div>
          <button className="rem-nb-btn" onClick={requestPermission}>
            {notifPerm === 'denied' ? '🔒 Blocked — Open Browser Settings' : 'Enable Notifications'}
          </button>
        </div>
      )}

      {notifPerm === 'granted' && (
        <div className="rem-notif-ok">
          <CheckCircle size={16} color="#10b981" />
          <span>Browser notifications are active — you will receive reminders on time.</span>
        </div>
      )}

      {success && <div className="rem-success"><CheckCircle size={16} />{success}</div>}
      {error && <div className="rem-error"><AlertCircle size={16} />{error}</div>}

      {/* HEADER */}
      <div className="rem-page-header">
        <div>
          <h2 className="rem-ph-title">Your Reminders <span className="rem-count">{reminders.length}</span></h2>
          <p className="rem-ph-sub">Reminders are stored locally on this device</p>
        </div>
        <button className="rem-add-btn" onClick={() => { setShowForm(true); setError(''); }}>
          <Plus size={18} /> Add Reminder
        </button>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div className="rem-form-card">
          <div className="rfc-header">
            <h3>⏰ New Medication Reminder</h3>
            <button className="rfc-close" onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddReminder} className="rfc-body">
            <div className="rem-row-2">
              <div className="rem-field">
                <label>Medicine Name *</label>
                <input
                  type="text" required placeholder="E.g. Metformin, Insulin, Aspirin..."
                  value={form.medicine}
                  onChange={e => setForm(f => ({ ...f, medicine: e.target.value }))}
                />
              </div>
              <div className="rem-field">
                <label>Dosage / Dose Amount</label>
                <input
                  type="text" placeholder="E.g. 500mg, 1 tablet, 10 units..."
                  value={form.dosage}
                  onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))}
                />
              </div>
            </div>

            <div className="rem-field">
              <label>Frequency</label>
              <div className="rem-freq-tabs">
                {FREQUENCIES.map(f => (
                  <button
                    type="button" key={f.value}
                    className={`rem-freq-tab ${form.frequency === f.value ? 'rem-freq-active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, frequency: f.value }))}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {form.frequency === 'interval' && (
              <div className="rem-field">
                <label>Repeat every (hours)</label>
                <div className="rem-interval-wrap">
                  <input
                    type="range" min="1" max="48" value={form.intervalHours}
                    onChange={e => setForm(f => ({ ...f, intervalHours: parseInt(e.target.value) }))}
                    className="rem-slider"
                  />
                  <span className="rem-interval-label">{form.intervalHours}h</span>
                </div>
                <span className="rem-hint">Every {form.intervalHours} hours, you will get a notification</span>
              </div>
            )}

            {form.frequency === 'daily' && (
              <div className="rem-field">
                <label>Time of Day</label>
                <input type="time" value={form.dailyTime} onChange={e => setForm(f => ({ ...f, dailyTime: e.target.value }))} />
              </div>
            )}

            {form.frequency === 'weekly' && (
              <div className="rem-row-2">
                <div className="rem-field">
                  <label>Day of Week</label>
                  <div className="rem-days-grid">
                    {DAYS_OF_WEEK.map((d, i) => (
                      <button
                        type="button" key={d}
                        className={`rem-day-btn ${form.weeklyDay === i ? 'rem-day-active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, weeklyDay: i }))}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rem-field">
                  <label>Time</label>
                  <input type="time" value={form.weeklyTime} onChange={e => setForm(f => ({ ...f, weeklyTime: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="rem-field">
              <label>Notes (optional)</label>
              <input
                type="text" placeholder="E.g. Take with food, 30 min after meal..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="rfc-actions">
              <button type="button" className="rem-btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}>Cancel</button>
              <button type="submit" className="rem-btn-save">
                <Bell size={16} /> Save Reminder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REMINDERS LIST */}
      {reminders.length === 0 ? (
        <div className="rem-empty">
          <Bell size={48} color="#e2e8f0" />
          <p>No reminders set yet.</p>
          <button className="rem-add-btn" onClick={() => setShowForm(true)}><Plus size={16} /> Add your first reminder</button>
        </div>
      ) : (
        <div className="rem-list">
          {reminders.map(r => (
            <div key={r.id} className={`rem-card ${!r.enabled ? 'rem-card-disabled' : ''}`}>
              <div className="rem-card-left">
                <div className="rem-card-icon" style={{ background: r.enabled ? '#eff6ff' : '#f8fafc' }}>
                  <Pill size={20} color={r.enabled ? '#2563eb' : '#94a3b8'} />
                </div>
                <div>
                  <div className="rem-card-name">{r.medicine}</div>
                  {r.dosage && <div className="rem-card-dosage">💊 {r.dosage}</div>}
                  <div className="rem-card-meta">
                    <Clock size={12} /> {getFreqLabel(r)}
                    {r.notes && <> · {r.notes}</>}
                  </div>
                </div>
              </div>
              <div className="rem-card-right">
                <div className="rem-next-fire" style={{ color: r.enabled ? '#2563eb' : '#94a3b8' }}>
                  {r.enabled ? formatNextFire(r) : 'Paused'}
                </div>
                <button className="rem-toggle-btn" onClick={() => toggleReminder(r.id)} title={r.enabled ? 'Pause reminder' : 'Enable reminder'}>
                  {r.enabled ? <ToggleRight size={28} color="#2563eb" /> : <ToggleLeft size={28} color="#94a3b8" />}
                </button>
                <button className="rem-del-btn" onClick={() => deleteReminder(r.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .rem-root { display: flex; flex-direction: column; gap: 1.5rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; }

        /* HERO */
        .rem-hero {
          display: flex; align-items: center; gap: 1.25rem;
          background: linear-gradient(135deg, #064e3b, #065f46, #047857);
          border-radius: 1.25rem; padding: 1.75rem 2rem; position: relative; overflow: hidden;
        }
        .rem-hero-glow {
          position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(167, 243, 208, 0.2), transparent 70%); pointer-events: none;
        }
        .rem-hero-icon {
          width: 64px; height: 64px; border-radius: 1rem; background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
        }
        .rem-title { color: white; font-size: 1.6rem; font-weight: 800; margin: 0; }
        .rem-sub { color: rgba(255,255,255,0.7); font-size: 0.875rem; margin: 0.3rem 0 0; line-height: 1.5; }

        /* NOTIFICATION BANNER */
        .rem-notif-banner {
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
          background: #fffbeb; border: 1px solid #fde68a; border-radius: 1rem;
          padding: 1.25rem 1.5rem;
        }
        .rem-nb-left { display: flex; align-items: flex-start; gap: 0.875rem; color: #92400e; }
        .rem-nb-title { font-weight: 700; font-size: 0.9rem; margin: 0 0 0.25rem; color: #78350f; }
        .rem-nb-sub { font-size: 0.8rem; color: #92400e; margin: 0; }
        .rem-nb-btn {
          padding: 0.6rem 1.25rem; background: #d97706; color: white;
          border: none; border-radius: 0.625rem; font-weight: 600; font-size: 0.85rem; cursor: pointer;
          white-space: nowrap; transition: opacity 0.2s; flex-shrink: 0;
        }
        .rem-nb-btn:hover { opacity: 0.9; }

        .rem-notif-ok {
          display: flex; align-items: center; gap: 0.5rem;
          background: #d1fae5; border: 1px solid #6ee7b7; padding: 0.75rem 1rem;
          border-radius: 0.75rem; color: #065f46; font-size: 0.875rem; font-weight: 500;
        }

        .rem-success { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; border-radius: 0.625rem; font-size: 0.875rem; }
        .rem-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 0.625rem; font-size: 0.875rem; }

        /* PAGE HEADER */
        .rem-page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .rem-ph-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .rem-count { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #2563eb; color: white; border-radius: 999px; font-size: 0.75rem; margin-left: 0.5rem; }
        .rem-ph-sub { color: #94a3b8; font-size: 0.8rem; margin: 0.25rem 0 0; }
        .rem-add-btn {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.25rem;
          background: linear-gradient(135deg, #047857, #10b981); color: white;
          border: none; border-radius: 0.75rem; font-weight: 600; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s;
        }
        .rem-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(4, 120, 87, 0.35); }

        /* FORM */
        .rem-form-card {
          background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08); overflow: hidden;
        }
        .rfc-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;
        }
        .rfc-header h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .rfc-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; border-radius: 0.5rem; }
        .rfc-close:hover { background: #f1f5f9; color: #ef4444; }
        .rfc-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

        .rem-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) { .rem-row-2 { grid-template-columns: 1fr; } }

        .rem-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .rem-field label { font-size: 0.85rem; font-weight: 600; color: #374151; }
        .rem-field input, .rem-field select {
          border: 1.5px solid #e2e8f0; border-radius: 0.625rem; padding: 0.65rem 0.875rem;
          font-size: 0.9rem; color: #0f172a; background: #fafafa; transition: border 0.15s; width: 100%; box-sizing: border-box;
        }
        .rem-field input:focus, .rem-field select:focus { outline: none; border-color: #10b981; background: white; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
        .rem-hint { font-size: 0.75rem; color: #94a3b8; }

        /* FREQUENCY TABS */
        .rem-freq-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .rem-freq-tab {
          padding: 0.5rem 1rem; border-radius: 0.625rem; border: 1.5px solid #e2e8f0;
          background: white; color: #475569; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
        }
        .rem-freq-tab:hover { border-color: #10b981; color: #047857; }
        .rem-freq-active { background: #d1fae5; border-color: #10b981; color: #065f46; }

        /* INTERVAL SLIDER */
        .rem-interval-wrap { display: flex; align-items: center; gap: 1rem; }
        .rem-slider { flex: 1; height: 6px; background: linear-gradient(90deg, #10b981, #047857); border-radius: 999px; -webkit-appearance: none; outline: none; cursor: pointer; }
        .rem-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; border: 3px solid #10b981; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .rem-interval-label { font-weight: 700; color: #047857; font-size: 1rem; min-width: 35px; }

        /* DAYS */
        .rem-days-grid { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .rem-day-btn {
          width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid #e2e8f0;
          background: white; font-size: 0.75rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s;
        }
        .rem-day-btn:hover { border-color: #10b981; color: #047857; }
        .rem-day-active { background: #d1fae5; border-color: #10b981; color: #065f46; }

        /* FORM ACTIONS */
        .rfc-actions { display: flex; justify-content: flex-end; gap: 0.875rem; padding-top: 0.5rem; }
        .rem-btn-cancel { padding: 0.7rem 1.25rem; border-radius: 0.625rem; border: 1.5px solid #e2e8f0; background: white; color: #475569; font-weight: 600; cursor: pointer; }
        .rem-btn-save {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.5rem;
          background: linear-gradient(135deg, #047857, #10b981); color: white;
          border: none; border-radius: 0.625rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
        }
        .rem-btn-save:hover { opacity: 0.9; }

        /* EMPTY */
        .rem-empty {
          display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
          padding: 4rem 2rem; background: white; border-radius: 1.25rem; border: 2px dashed #e2e8f0; text-align: center;
          color: #94a3b8; font-size: 1rem;
        }

        /* LIST */
        .rem-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .rem-card {
          background: white; border-radius: 1rem; border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 1.1rem 1.25rem;
          display: flex; justify-content: space-between; align-items: center; gap: 1rem;
          transition: box-shadow 0.2s;
        }
        .rem-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .rem-card-disabled { opacity: 0.6; }

        .rem-card-left { display: flex; align-items: center; gap: 0.875rem; flex: 1; min-width: 0; }
        .rem-card-icon { width: 44px; height: 44px; border-radius: 0.75rem; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .rem-card-name { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
        .rem-card-dosage { color: #475569; font-size: 0.82rem; margin-top: 0.1rem; }
        .rem-card-meta { display: flex; align-items: center; gap: 0.4rem; color: #94a3b8; font-size: 0.78rem; margin-top: 0.15rem; }

        .rem-card-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
        .rem-next-fire { font-size: 0.8rem; font-weight: 700; }
        .rem-toggle-btn { background: none; border: none; cursor: pointer; padding: 0.1rem; }
        .rem-del-btn { background: none; border: none; color: #fca5a5; cursor: pointer; padding: 0.3rem; border-radius: 0.4rem; transition: all 0.15s; }
        .rem-del-btn:hover { background: #fee2e2; color: #ef4444; }
      `}</style>
    </div>
  );
};

export default Reminders;
