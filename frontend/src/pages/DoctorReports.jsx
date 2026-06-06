import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle, AlertCircle, X, Search, Users, 
  ExternalLink, Trash2, FilePlus, Loader, ChevronRight, Activity 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';
import { API_BASE } from '../lib/config';

const DoctorReports = () => {
  const user = getStoredUser();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  
  // Selected Patient's Reports
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsSearch, setReportsSearch] = useState('');
  
  // Upload Form State
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [loading, setLoading] = useState(true);

  // Modals
  const [previewReport, setPreviewReport] = useState(null);
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase.from('patients').select('*').eq('doctor_id', user.id);
      if (data) {
        const parsed = data.map(p => ({
          ...p,
          full_name: p.first_name || p.last_name 
            ? `${p.first_name || ''} ${p.last_name || ''}`.trim() 
            : 'Patient'
        }));
        setPatients(parsed);
      }
      setLoading(false);
    };
    load();
  }, []);

  const fetchPatientReports = async (patientId) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${API_BASE}/reports/patient/${patientId}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch patient reports:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelected(patient);
    setFile(null);
    setFileName('');
    setStatus(null);
    setReportsSearch('');
    fetchPatientReports(patient.id);
  };

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReports = reports.filter(r =>
    r.file_name.toLowerCase().includes(reportsSearch.toLowerCase())
  );

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name.replace(/\.[^/.]+$/, '')); // pre-fill name without extension
    setStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setFileName(f.name.replace(/\.[^/.]+$/, ''));
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file || !selected || !fileName.trim()) {
      setStatus({ type: 'error', msg: 'Please select a patient, name your report, and choose a file.' });
      return;
    }
    setUploading(true);
    setStatus(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const extension = '.' + file.name.split('.').pop();
          const finalName = fileName.trim() + extension;

          const payload = {
            patient_id: selected.id,
            file_name: finalName,
            file_url: reader.result,
            file_type: file.type
          };

          const res = await fetch(`${API_BASE}/reports/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to upload report.');

          // Send notification
          const docName = user?.first_name ? `Dr. ${user.first_name}` : 'Your doctor';
          try {
            await supabase.from('notifications').insert([{
              patient_id: selected.id,
              type: 'report',
              title: 'New medical report',
              message: `${docName} uploaded a new report "${finalName}" to your record.`,
            }]);
          } catch (notifErr) {
            console.error('Failed to send notification:', notifErr);
          }

          setStatus({ type: 'success', msg: `Report "${finalName}" uploaded successfully.` });
          setFile(null);
          setFileName('');
          fetchPatientReports(selected.id);
        } catch (err) {
          setStatus({ type: 'error', msg: err.message });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
      setUploading(false);
    }
  };

  const executeDeleteReport = async () => {
    if (!confirmDeleteReport) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${confirmDeleteReport.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setReports(r => r.filter(x => x.id !== confirmDeleteReport.id));
      setConfirmDeleteReport(null);
    } catch (e) {
      alert(e.message);
      setConfirmDeleteReport(null);
    }
  };

  const clearFile = () => { setFile(null); setFileName(''); setStatus(null); };

  return (
    <div className="dr-root">
      {/* GLOW BACKGROUND BACKDROP */}
      <div className="dr-glow-bg" />

      {/* Page header */}
      <div className="dr-header">
        <div>
          <h1 className="dr-title">Diagnostic Reports Vault</h1>
          <p className="dr-sub">Access, preview, search, and securely archive diagnostic reports for your patients.</p>
        </div>
      </div>

      <div className="dr-grid">
        {/* Patient Selector */}
        <div className="dr-panel dr-panel-sidebar">
          <div className="dr-panel-head">
            <Users size={17} />
            <span>Select Patient</span>
          </div>

          <div className="dr-search-wrap">
            <Search size={14} />
            <input
              className="dr-search"
              placeholder="Search patients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="dr-empty"><div className="dr-spinner" /></div>
          ) : filteredPatients.length === 0 ? (
            <div className="dr-empty"><AlertCircle size={28} /><p>No patients found.</p></div>
          ) : (
            <div className="dr-patient-list">
              {filteredPatients.map(p => {
                const initials = (p.full_name || 'P').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <button
                    key={p.id}
                    className={`dr-pt-btn ${selected?.id === p.id ? 'dr-pt-btn--active' : ''}`}
                    onClick={() => handlePatientSelect(p)}
                  >
                    <div className="dr-pt-av">{initials}</div>
                    <div className="dr-pt-info">
                      <span className="dr-pt-name">{p.full_name}</span>
                      <span className="dr-pt-sub">{p.email || 'No email registered'}</span>
                    </div>
                    <ChevronRight size={14} className="dr-pt-chevron" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Patient Area */}
        <div className="dr-main-workspace">
          {!selected ? (
            <div className="dr-panel dr-empty-workspace">
              <FileText size={48} color="#cbd5e1" />
              <h3>No Patient Selected</h3>
              <p>Please select a patient from the left column to view their reports and upload diagnostic sheets.</p>
            </div>
          ) : (
            <div className="dr-workspace-grid">
              
              {/* Left Column: Reports List */}
              <div className="dr-panel dr-reports-section">
                <div className="dr-panel-head">
                  <FileText size={17} />
                  <span>{selected.full_name}'s Reports</span>
                  <span className="dr-selected-badge">{reports.length} Records</span>
                </div>

                <div className="dr-search-wrap">
                  <Search size={14} />
                  <input
                    className="dr-search"
                    placeholder="Search patient reports..."
                    value={reportsSearch}
                    onChange={e => setReportsSearch(e.target.value)}
                  />
                </div>

                {loadingReports ? (
                  <div className="dr-empty">
                    <Loader size={24} className="dr-spin" />
                    <p>Loading medical documents...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="dr-empty">
                    <AlertCircle size={24} />
                    <p>{reportsSearch ? 'No reports match search criteria.' : 'No diagnostic sheets on file.'}</p>
                  </div>
                ) : (
                  <div className="dr-reports-list">
                    {filteredReports.map(report => (
                      <div key={report.id} className="dr-report-card" onClick={() => setPreviewReport(report)}>
                        <div className="dr-report-icon">
                          <FileText size={20} color="#6366f1" />
                        </div>
                        <div className="dr-report-info">
                          <span className="dr-report-name">{report.file_name}</span>
                          <span className="dr-report-date">
                            Uploaded: {report.upload_date ? new Date(report.upload_date).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div className="dr-report-actions" onClick={e => e.stopPropagation()}>
                          <a href={report.file_url} download={report.file_name} className="dr-icon-btn" title="Download Report">
                            <ExternalLink size={14} />
                          </a>
                          <button className="dr-icon-btn dr-btn-danger" onClick={() => setConfirmDeleteReport(report)} title="Delete Report">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Upload Form */}
              <div className="dr-panel dr-upload-section">
                <div className="dr-panel-head">
                  <FilePlus size={17} />
                  <span>Upload Document</span>
                </div>

                <p className="dr-upload-desc">Attach files for <strong>{selected.full_name}</strong>. Reports will be saved securely and notification will be sent.</p>

                <div
                  className={`dr-dropzone ${file ? 'dr-dropzone--filled' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('dr-file-input').click()}
                >
                  {file ? (
                    <div className="dr-file-preview">
                      <FileText size={32} color="#6366f1" />
                      <div className="dr-file-name">{file.name}</div>
                      <div className="dr-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                      <button className="dr-clear-btn" onClick={e => { e.stopPropagation(); clearFile(); }}>
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} color="#6366f1" />
                      <p className="dr-dz-title">Drop report file here or browse</p>
                      <p className="dr-dz-sub">PDF, PNG, JPG, or DOCX formats</p>
                    </>
                  )}
                </div>
                <input id="dr-file-input" type="file" hidden onChange={handleFileChange} />

                {file && (
                  <div className="dr-name-group">
                    <label className="dr-label">Report Title</label>
                    <input
                      className="dr-input"
                      placeholder="e.g. Lab Sheet / Scan Results"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                    />
                  </div>
                )}

                {status && (
                  <div className={`dr-status dr-status--${status.type}`}>
                    {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{status.msg}</span>
                  </div>
                )}

                <button
                  className="dr-upload-btn"
                  onClick={handleUpload}
                  disabled={uploading || !file || !fileName.trim()}
                >
                  {uploading ? (
                    <><div className="dr-btn-spinner" /> Uploading…</>
                  ) : (
                    <><Upload size={16} /> Upload to Record</>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ── REPORT PREVIEW MODAL ── */}
      {previewReport && (
        <div className="rep-modal-overlay" onClick={() => setPreviewReport(null)}>
          <div className="rep-modal" onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h3>{previewReport.file_name}</h3>
              <button className="rep-modal-close" onClick={() => setPreviewReport(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="rep-modal-body">
              <div className="rep-modal-meta">
                <span><strong>File Type:</strong> {previewReport.file_type || 'Unknown'}</span>
                <span><strong>Uploaded On:</strong> {previewReport.upload_date ? new Date(previewReport.upload_date).toLocaleDateString() : '—'}</span>
              </div>
              
              <div className="rep-preview-container">
                {previewReport.file_url?.startsWith('data:image/') || previewReport.file_type?.startsWith('image/') ? (
                  <img src={previewReport.file_url} alt={previewReport.file_name} className="rep-preview-img" />
                ) : previewReport.file_url?.startsWith('data:application/pdf') || previewReport.file_type === 'application/pdf' ? (
                  <iframe src={previewReport.file_url} title={previewReport.file_name} className="rep-preview-pdf" />
                ) : (
                  <div className="rep-preview-placeholder">
                    <FileText size={48} />
                    <span>Direct preview not supported for this file type. Please download to view.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rep-modal-actions">
              <a href={previewReport.file_url} download={previewReport.file_name} className="btn btn-primary">
                Download Report
              </a>
              <button className="btn btn-outline" onClick={() => setPreviewReport(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {confirmDeleteReport && (
        <div className="rep-modal-overlay" onClick={() => setConfirmDeleteReport(null)}>
          <div className="rep-modal rep-modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h3>Delete Patient Report</h3>
              <button className="rep-modal-close" onClick={() => setConfirmDeleteReport(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="rep-modal-body">
              <p>Are you sure you want to permanently delete the report <strong>{confirmDeleteReport.file_name}</strong> for {selected.full_name}?</p>
              <p className="confirm-warning">⚠️ This action will delete it from both the patient portal and the database.</p>
            </div>
            <div className="rep-modal-actions">
              <button className="btn btn-danger" onClick={executeDeleteReport}>Delete</button>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteReport(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dr-root {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          font-family: 'Inter', sans-serif;
          position: relative;
        }

        /* Ambient background */
        .dr-glow-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at 10% 20%, rgba(99,102,241,0.05) 0%, transparent 50%),
                      radial-gradient(circle at 90% 80%, rgba(14,165,233,0.04) 0%, transparent 50%);
          pointer-events: none;
          z-index: -1;
        }

        /* Header */
        .dr-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .dr-title {
          font-size: 2.25rem;
          font-weight: 800;
          margin: 0 0 0.35rem;
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.6px;
        }
        .dr-sub { font-size: 0.9rem; color: #64748b; margin: 0; }

        /* Grid */
        .dr-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 950px) { .dr-grid { grid-template-columns: 1fr; } }

        /* Panels */
        .dr-panel {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dr-panel-head {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          font-size: 0.9rem;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .dr-selected-badge {
          margin-left: auto;
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(99, 102, 241, 0.1);
          color: #4f46e5;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          text-transform: none;
          letter-spacing: 0;
        }

        /* Patient selector */
        .dr-search-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.6);
          border: 1.5px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0.55rem 0.875rem;
        }
        .dr-search {
          border: none !important; background: transparent !important;
          outline: none !important; box-shadow: none !important;
          font-size: 0.875rem; width: 100%; padding: 0 !important;
          color: #0f172a;
        }
        .dr-patient-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 550px; overflow-y: auto; }
        .dr-pt-btn {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem; border-radius: 0.875rem;
          background: transparent; border: 1.5px solid transparent;
          cursor: pointer; text-align: left; width: 100%;
          transition: all 0.2s; font-family: inherit;
        }
        .dr-pt-btn:hover { background: rgba(255, 255, 255, 0.8); border-color: rgba(99,102,241,0.15); }
        .dr-pt-btn--active {
          background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.06)) !important;
          border-color: rgba(99,102,241,0.3) !important;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.05);
        }
        .dr-pt-btn--active .dr-pt-chevron { transform: translateX(2px); color: #4f46e5; }
        .dr-pt-av {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white; font-weight: 700; font-size: 0.85rem;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
        }
        .dr-pt-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .dr-pt-name { font-weight: 700; font-size: 0.9rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dr-pt-sub  { font-size: 0.75rem; color: #64748b; margin-top: 1px; }
        .dr-pt-chevron { color: #94a3b8; transition: transform 0.2s; }

        /* Workspace layout */
        .dr-main-workspace { flex: 1; }
        .dr-empty-workspace {
          align-items: center; justify-content: center; text-align: center;
          padding: 6rem 2rem; color: #64748b; min-height: 400px;
        }
        .dr-empty-workspace h3 { margin: 1rem 0 0.25rem; color: #0f172a; font-size: 1.15rem; }
        .dr-empty-workspace p { max-width: 320px; font-size: 0.875rem; margin: 0; line-height: 1.5; }

        .dr-workspace-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 1200px) { .dr-workspace-grid { grid-template-columns: 1fr; } }

        /* Reports Section */
        .dr-reports-section { min-height: 400px; }
        .dr-reports-list { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        .dr-report-card {
          display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1.125rem;
          border: 1.5px solid rgba(255, 255, 255, 0.85); border-radius: 1rem;
          background: rgba(255, 255, 255, 0.5); cursor: pointer;
          transition: all 0.2s;
        }
        .dr-report-card:hover { transform: translateY(-1px); border-color: rgba(99,102,241,0.35); background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        
        .dr-report-icon {
          width: 38px; height: 38px; border-radius: 8px; background: #e0e7ff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dr-report-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .dr-report-name { font-weight: 700; font-size: 0.9rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dr-report-date { font-size: 0.75rem; color: #94a3b8; }
        
        .dr-report-actions { display: flex; gap: 0.35rem; }
        .dr-icon-btn {
          padding: 0.45rem; border-radius: 0.5rem; border: 1px solid #cbd5e1;
          background: white; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none;
        }
        .dr-icon-btn:hover { color: #4f46e5; background: #eeebff; border-color: rgba(99,102,241,0.25); }
        .dr-icon-btn.dr-btn-danger:hover { color: #ef4444; background: #fef2f2; border-color: rgba(239,68,68,0.2); }

        /* Upload Section */
        .dr-upload-section { gap: 0.875rem; }
        .dr-upload-desc { font-size: 0.825rem; color: #64748b; margin: 0; line-height: 1.5; }
        .dr-upload-desc strong { color: #0f172a; }

        /* Dropzone */
        .dr-dropzone {
          border: 2px dashed rgba(99,102,241,0.3); border-radius: 1rem;
          padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.6rem; text-align: center; cursor: pointer; transition: all 0.2s;
          background: rgba(248,250,255,0.4); min-height: 160px;
        }
        .dr-dropzone:hover { border-color: #6366f1; background: rgba(99,102,241,0.03); }
        .dr-dropzone--filled { border-color: #6366f1; border-style: solid; background: rgba(99,102,241,0.03); }
        .dr-dz-title { font-weight: 700; font-size: 0.85rem; color: #1e293b; margin: 0; }
        .dr-dz-sub { font-size: 0.72rem; color: #94a3b8; margin: 0; }

        .dr-file-preview { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
        .dr-file-name { font-weight: 700; font-size: 0.85rem; color: #0f172a; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dr-file-size { font-size: 0.75rem; color: #94a3b8; }
        .dr-clear-btn {
          display: flex; align-items: center; gap: 0.25rem; background: #fee2e2; color: #b91c1c; border: none;
          padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; cursor: pointer;
          transition: background 0.15s; font-family: inherit;
        }
        .dr-clear-btn:hover { background: #fecaca; }

        .dr-name-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .dr-label { font-size: 0.8rem; font-weight: 700; color: #475569; }
        .dr-input {
          width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid #cbd5e1; border-radius: 0.5rem;
          font-size: 0.875rem; font-family: inherit; background: white; box-sizing: border-box;
          transition: border-color 0.2s; color: #0f172a;
        }
        .dr-input:focus { outline: none; border-color: #6366f1; }

        .dr-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.875rem; border-radius: 0.75rem; font-size: 0.8rem; font-weight: 600; }
        .dr-status--success { background: #d1fae5; color: #065f46; border: 1px solid rgba(16,185,129,0.15); }
        .dr-status--error   { background: #fee2e2; color: #991b1b; border: 1px solid rgba(239,68,68,0.15); }

        .dr-upload-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #6366f1, #0ea5e9); color: white; border: none; border-radius: 0.75rem;
          font-size: 0.875rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 10px rgba(99,102,241,0.25);
        }
        .dr-upload-btn:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.95; }
        .dr-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .dr-btn-spinner {
          width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%;
          animation: drSpin 0.7s linear infinite;
        }

        .dr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; gap: 0.5rem; color: #94a3b8; font-size: 0.85rem; text-align: center; }
        .dr-spinner { width: 22px; height: 22px; border: 3px solid rgba(99,102,241,0.15); border-top-color: #6366f1; border-radius: 50%; animation: drSpin 0.8s linear infinite; }
        .dr-spin { animation: drSpin 1.2s linear infinite; color: #6366f1; }

        /* ── MODALS (SAME STYLE AS REPORTS PAGE) ── */
        .rep-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          animation: repFadeIn 0.2s ease-out;
        }
        @keyframes repFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .rep-modal {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 1.5rem;
          padding: 2rem;
          width: min(640px, 92vw);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          display: flex; flex-direction: column; gap: 1.25rem;
          animation: repScaleUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rep-modal-confirm {
          width: min(450px, 92vw);
        }
        @keyframes repScaleUp { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .rep-modal-header { display: flex; justify-content: space-between; align-items: center; }
        .rep-modal-header h3 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 85%; }
        .rep-modal-close { background: none; border: none; color: #64748b; cursor: pointer; padding: 0.35rem; border-radius: 0.5rem; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .rep-modal-close:hover { background: #f1f5f9; color: #0f172a; }

        .rep-modal-body { display: flex; flex-direction: column; gap: 1rem; }
        .rep-modal-meta { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.8rem; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; }
        
        .rep-preview-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          min-height: 200px;
          max-height: 380px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .rep-preview-img { max-width: 100%; max-height: 380px; object-fit: contain; }
        .rep-preview-pdf { width: 100%; height: 380px; border: none; }
        .rep-preview-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: #94a3b8; font-size: 0.875rem; padding: 2rem; text-align: center; }

        .confirm-warning { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin-top: 0.5rem; }

        .rep-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
        .rep-modal-actions .btn {
          padding: 0.625rem 1.25rem; border-radius: 0.625rem; font-weight: 700; font-size: 0.875rem; cursor: pointer;
          transition: all 0.2s; text-decoration: none; border: none; display: flex; align-items: center; gap: 0.5rem;
        }
        .rep-modal-actions .btn-primary { background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); }
        .rep-modal-actions .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
        .rep-modal-actions .btn-danger { background: #ef4444; color: white; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }
        .rep-modal-actions .btn-danger:hover { background: #dc2626; transform: translateY(-1px); }
        .rep-modal-actions .btn-outline { background: white; border: 1.5px solid #cbd5e1; color: #475569; }
        .rep-modal-actions .btn-outline:hover { background: #f8fafc; color: #0f172a; }
      `}</style>
    </div>
  );
};

export default DoctorReports;
