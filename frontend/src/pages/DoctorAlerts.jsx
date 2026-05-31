import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MessageSquare, X, Send, CheckCircle, Activity,
  ChevronLeft, AlertCircle, Sparkles, AlertTriangle
} from 'lucide-react';
import { getStoredUser } from '../lib/session';
import { API_BASE } from '../lib/config';

const DoctorAlerts = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentAlert, setCommentAlert] = useState(null); // alert being replied to
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  const fetchAlerts = async () => {
    const doctorId = user?.id;
    if (!doctorId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/alerts/doctor/${doctorId}`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Alerts fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSendComment = async () => {
    if (!commentText.trim() || !commentAlert) return;
    setSendingComment(true);
    try {
      const res = await fetch(`${API_BASE}/alerts/${commentAlert.id}/comment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setAlerts(prev => prev.map(a => a.id === commentAlert.id ? { ...a, doctor_comment: commentText.trim(), is_read: true } : a));
      setCommentSent(true);
      setTimeout(() => {
        setCommentSent(false);
        setCommentAlert(null);
        setCommentText('');
      }, 1500);
    } catch (e) {
      alert('Failed to send comment.');
    } finally {
      setSendingComment(false);
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="da-root">
      {/* ── HEADER ── */}
      <div className="da-header-card">
        <div className="da-header-left">
          <button className="btn-back" onClick={() => navigate('/')}>
            <ChevronLeft size={16} />
            <span>Dashboard</span>
          </button>
          <h1 className="da-title">Patient Alerts Inbox</h1>
          <p className="da-subtitle">
            Review urgent reports, symptoms, and send instant medical advice back to your patients.
          </p>
        </div>
        <div className="da-header-right">
          <div className="da-stats-glow">
            <div className="da-stat-num">{unreadCount}</div>
            <div className="da-stat-lbl">Unread Alerts</div>
          </div>
        </div>
      </div>

      {/* ── ALERTS CONTAINER ── */}
      <div className="da-panel">
        <div className="da-panel-header">
          <div className="da-panel-title">
            <div className="panel-title-icon">
              <Bell size={18} />
            </div>
            <span>Alerts Feed</span>
            {unreadCount > 0 && (
              <span className="da-badge da-badge--red">{unreadCount} urgent</span>
            )}
          </div>
          <button className="btn-refresh" onClick={() => { setLoading(true); fetchAlerts(); }}>
            <Sparkles size={13} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {loading ? (
          <div className="da-empty">
            <div className="da-spinner" />
            <p>Retrieving patient alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="da-empty-state">
            <div className="da-success-circle">
              <CheckCircle size={32} color="#10b981" />
            </div>
            <h3>All Clear!</h3>
            <p>There are no patient alerts requiring your attention at this time.</p>
          </div>
        ) : (
          <div className="da-grid">
            {alerts.map(a => (
              <div key={a.id} className={`da-card ${!a.is_read ? 'da-card-unread' : ''}`}>
                <div className="dac-glow" />
                <div className="dac-content">
                  <div className="dac-top">
                    <div className="dac-avatar">
                      {(a.patient_name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="dac-meta">
                      <div className="dac-name">{a.patient_name || 'Unknown Patient'}</div>
                      <div className="dac-date">
                        {a.created_at ? new Date(a.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Just now'}
                      </div>
                    </div>
                    {a.severity && (
                      <span className={`dac-sev ${a.severity >= 7 ? 'sev-high' : a.severity >= 4 ? 'sev-mid' : 'sev-low'}`}>
                        Severity: {a.severity}/10
                      </span>
                    )}
                  </div>

                  <div className="dac-body">
                    <div className="dac-body-icon">
                      <AlertTriangle size={15} />
                    </div>
                    <p className="dac-desc">{a.symptom_description || a.message}</p>
                  </div>

                  {a.doctor_comment ? (
                    <div className="dac-replied">
                      <MessageSquare size={13} color="#7c3aed" />
                      <div className="dac-replied-text">
                        <strong>Your Medical Advice:</strong> <span>{a.doctor_comment}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="dac-pending-badge">
                      <AlertCircle size={12} color="#d97706" />
                      <span>Pending doctor's response</span>
                    </div>
                  )}

                  <button
                    className={`dac-reply-btn ${a.doctor_comment ? 'dac-reply-btn-edit' : ''}`}
                    onClick={() => { setCommentAlert(a); setCommentText(a.doctor_comment || ''); }}
                  >
                    {a.doctor_comment ? '✏️ Edit Advice / Comment' : '💬 Send Clinical Advice'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── COMMENT MODAL ── */}
      {commentAlert && (
        <div className="da-modal-overlay" onClick={() => setCommentAlert(null)}>
          <div className="da-modal" onClick={e => e.stopPropagation()}>
            <div className="da-modal-header">
              <h3>Clinical Advice to {commentAlert.patient_name}</h3>
              <button className="da-modal-close" onClick={() => { setCommentAlert(null); setCommentText(''); }}>
                <X size={20} />
              </button>
            </div>
            <div className="da-modal-symptom">
              <Activity size={14} color="#7c3aed" />
              <span>{commentAlert.symptom_description || commentAlert.message}</span>
            </div>
            {commentSent ? (
              <div className="da-modal-success">
                <CheckCircle size={32} color="#10b981" />
                <p>Advice successfully updated! The patient will see your comment immediately on their dashboard.</p>
              </div>
            ) : (
              <>
                <textarea
                  className="da-modal-textarea"
                  placeholder="Provide clinical guidance, reassure the patient, or recommend clinic/emergency visits..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={4}
                />
                <div className="da-modal-actions">
                  <button className="da-modal-cancel" onClick={() => { setCommentAlert(null); setCommentText(''); }}>Cancel</button>
                  <button className="da-modal-send" disabled={!commentText.trim() || sendingComment} onClick={handleSendComment}>
                    <Send size={14} />
                    {sendingComment ? 'Sending...' : 'Send Advice'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .da-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          font-family: 'Inter', sans-serif;
          min-height: 100%;
          color: #1f2937;
        }

        /* ── Header ── */
        .da-header-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 1.5rem;
          padding: 1.75rem 2.25rem;
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.06);
          position: relative;
          overflow: hidden;
        }
        .da-header-left { display: flex; flex-direction: column; gap: 0.35rem; position: relative; z-index: 1; }
        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(124,58,237,0.06);
          border: 1px solid rgba(124,58,237,0.12);
          color: #7c3aed;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s;
          margin-bottom: 0.5rem;
        }
        .btn-back:hover { background: rgba(124,58,237,0.12); transform: translateX(-2px); }

        .da-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: #111827;
          margin: 0;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.6px;
        }
        .da-subtitle { font-size: 0.9rem; color: #6b7280; margin: 0; max-width: 600px; }

        .da-header-right { position: relative; z-index: 1; }
        .da-stats-glow {
          width: 80px; height: 80px; border-radius: 20px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
          border: 1px solid rgba(239,68,68,0.25);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(239,68,68,0.1);
        }
        .da-stat-num { font-size: 2rem; font-weight: 800; color: #dc2626; line-height: 1; font-family: 'Outfit', sans-serif; }
        .da-stat-lbl { font-size: 0.625rem; color: #b91c1c; font-weight: 600; text-transform: uppercase; margin-top: 3px; }

        /* ── Panel ── */
        .da-panel {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
        }
        .da-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .da-panel-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          font-size: 0.95rem;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .panel-title-icon {
          width: 34px; height: 34px; border-radius: 8px;
          background: #fee2e2;
          color: #dc2626;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .da-badge {
          background: #fee2e2;
          color: #dc2626;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          letter-spacing: 0.02em;
        }
        .btn-refresh {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(124,58,237,0.2);
          color: #7c3aed;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: all 0.2s;
        }
        .btn-refresh:hover { background: #f3e8ff; border-color: rgba(124,58,237,0.35); transform: translateY(-1px); }

        /* ── Alerts Grid ── */
        .da-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }

        .da-card {
          background: rgba(255, 255, 255, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 1.15rem;
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .da-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(124, 58, 237, 0.2);
          box-shadow: 0 12px 30px rgba(124, 58, 237, 0.06);
        }
        .da-card-unread {
          border-color: rgba(239, 68, 68, 0.18);
          background: linear-gradient(185deg, rgba(254, 242, 242, 0.4), rgba(255,255,255,0.45));
        }
        .da-card-unread:hover {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .dac-content {
          padding: 1.25rem 1.35rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          position: relative;
          z-index: 1;
        }

        .dac-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .dac-avatar {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: white; font-weight: 700; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(124,58,237,0.15);
        }
        .dac-meta { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .dac-name { font-weight: 700; font-size: 0.92rem; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dac-date { font-size: 0.7rem; color: #9ca3af; }

        .dac-sev {
          font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem;
          border-radius: 999px; flex-shrink: 0;
          letter-spacing: 0.01em;
        }
        .sev-high { background: #fee2e2; color: #dc2626; border: 1px solid rgba(220,38,38,0.15); }
        .sev-mid  { background: #fef3c7; color: #d97706; border: 1px solid rgba(217,119,6,0.15); }
        .sev-low  { background: #d1fae5; color: #059669; border: 1px solid rgba(5,150,105,0.15); }

        .dac-body {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 0.75rem;
          padding: 0.75rem 0.875rem;
          border: 1px solid rgba(0, 0, 0, 0.03);
        }
        .dac-body-icon { color: #dc2626; margin-top: 2px; flex-shrink: 0; }
        .dac-desc { font-size: 0.82rem; color: #374151; margin: 0; line-height: 1.45; }

        .dac-replied {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.8rem;
          background: rgba(124, 58, 237, 0.05);
          border: 1px solid rgba(124, 58, 237, 0.12);
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
        }
        .dac-replied-text { color: #374151; display: flex; flex-direction: column; gap: 2px; }
        .dac-replied-text strong { color: #5b21b6; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; }
        .dac-replied-text span { font-style: italic; color: #1e1b4b; line-height: 1.4; }

        .dac-pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #d97706;
          background: #fef3c7;
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          width: fit-content;
          border: 1px solid rgba(217,119,6,0.1);
        }

        .dac-reply-btn {
          display: flex; align-items: center; justify-content: center;
          padding: 0.65rem; border-radius: 0.75rem;
          background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          border: none;
          color: white; font-weight: 700; font-size: 0.8rem;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
          margin-top: 0.25rem;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
        }
        .dac-reply-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(124, 58, 237, 0.22);
          opacity: 0.95;
        }
        .dac-reply-btn-edit {
          background: rgba(124,58,237,0.07) !important;
          border: 1px solid rgba(124,58,237,0.18) !important;
          color: #7c3aed !important;
          box-shadow: none !important;
        }
        .dac-reply-btn-edit:hover { background: rgba(124,58,237,0.14) !important; color: #6d28d9 !important; }

        /* ── Empty & Spinner ── */
        .da-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 4rem 1rem; gap: 0.75rem;
          color: #9ca3af; font-size: 0.875rem; text-align: center;
        }
        .da-empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 5rem 1rem; text-align: center;
          color: #4b5563; gap: 0.5rem;
        }
        .da-empty-state h3 { font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 700; margin: 0; color: #111827; }
        .da-empty-state p { font-size: 0.875rem; color: #6b7280; margin: 0; max-width: 320px; }
        .da-success-circle {
          width: 56px; height: 56px; border-radius: 50%;
          background: #d1fae5; display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.5rem; border: 1px solid rgba(16,185,129,0.2);
        }

        .da-spinner {
          width: 32px; height: 32px;
          border: 3.5px solid rgba(124,58,237,0.1);
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: daSpin 0.8s linear infinite;
        }
        @keyframes daSpin { to { transform: rotate(360deg); } }

        /* ── Modal ── */
        .da-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9000;
          animation: daFadeIn 0.25s ease;
        }
        @keyframes daFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .da-modal {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 1.5rem;
          padding: 1.75rem;
          width: min(520px, 92vw);
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: flex; flex-direction: column; gap: 1.125rem;
          animation: daScaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes daScaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .da-modal-header { display: flex; justify-content: space-between; align-items: center; }
        .da-modal-header h3 { font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0; font-family: 'Outfit', sans-serif; }
        .da-modal-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0.25rem; border-radius: 6px; }
        .da-modal-close:hover { background: #f3f4f6; color: #374151; }

        .da-modal-symptom {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.875rem; color: #374151;
          background: rgba(124,58,237,0.06);
          padding: 0.625rem 0.875rem; border-radius: 0.75rem;
          border-left: 3px solid #7c3aed;
        }
        .da-modal-textarea {
          width: 100%; min-height: 110px;
          border: 1.5px solid #e5e7eb;
          border-radius: 0.75rem; padding: 0.75rem 1rem;
          font-size: 0.875rem; font-family: inherit; color: #111827;
          background: rgba(255,255,255,0.8); resize: vertical;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .da-modal-textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
        .da-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .da-modal-cancel {
          padding: 0.6rem 1.25rem; border-radius: 0.625rem;
          border: 1.5px solid #e5e7eb; background: white; color: #6b7280;
          font-weight: 600; cursor: pointer; font-family: inherit;
        }
        .da-modal-send {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.6rem 1.25rem; border-radius: 0.625rem;
          border: none; background: linear-gradient(135deg, #7c3aed, #0ea5e9);
          color: white; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s;
        }
        .da-modal-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .da-modal-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.75rem; padding: 1.5rem; text-align: center;
          color: #065f46; font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default DoctorAlerts;
