import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, ExternalLink, Search, Loader, AlertCircle, CheckCircle, FilePlus, X } from 'lucide-react';
import { API_BASE } from '../lib/config';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [previewReport, setPreviewReport] = useState(null);
  const [confirmDeleteReport, setConfirmDeleteReport] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user?.id) {
      fetchReports();
    }
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/reports/patient/${user.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not fetch medical reports.');
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const lastDot = file.name.lastIndexOf('.');
    const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
    setCustomFileName(baseName);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const lastDot = selectedFile.name.lastIndexOf('.');
          const extension = lastDot !== -1 ? selectedFile.name.substring(lastDot) : '';
          const finalName = (customFileName.trim() || 'Unnamed_Report') + extension;

          const payload = {
            patient_id: user.id,
            file_name: finalName,
            file_url: reader.result,
            file_type: selectedFile.type
          };

          const res = await fetch(`${API_BASE}/reports/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Failed to save report to database.');

          setSuccess(true);
          setSelectedFile(null);
          setCustomFileName('');
          fetchReports();
          setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
          setError(err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);

    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDeleteClick = (report) => {
    setConfirmDeleteReport(report);
  };

  const executeDeleteReport = async () => {
    if (!confirmDeleteReport) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${confirmDeleteReport.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setReports(r => r.filter(x => x.id !== confirmDeleteReport.id));
      setConfirmDeleteReport(null);
    } catch (e) {
      setError(e.message);
      setConfirmDeleteReport(null);
    }
  };

  const filteredReports = reports.filter(r => 
    r.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rep-root">
      {/* GLOW BACKGROUND BACKDROP */}
      <div className="rep-glow-bg" />

      {/* HEADER SECTION */}
      <header className="page-header rep-header-glass">
        <h1>Medical Reports</h1>
        <p>Your secure, direct SQL diagnostic vault. Track diagnostic results, lab scans and medical documents.</p>
      </header>

      {error && <div className="rep-alert error"><AlertCircle size={16} />{error}</div>}
      {success && <div className="rep-alert success"><CheckCircle size={16} />Report uploaded successfully!</div>}

      {/* SEARCH AND GRID PANEL */}
      <div className="glass-card rep-container">
        {/* SEARCH BAR */}
        <div className="search-bar">
          <Search size={18} />
          <input 
            placeholder="Search reports by filename..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="rep-loader">
            <Loader size={32} className="rep-spin" />
            <p>Retrieving diagnostic records...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <FileText size={44} color="#cbd5e1" />
            <p>No medical reports archived yet. Use the upload panel below to store your first diagnostic record.</p>
          </div>
        ) : (
          <div className="reports-grid">
            {filteredReports.map(report => (
              <div key={report.id} className="report-card" onClick={() => setPreviewReport(report)} style={{ cursor: 'pointer' }}>
                <div className="report-icon">
                  <FileText size={22} color="#2563eb" />
                </div>
                <div className="report-info">
                  <div className="report-name">{report.file_name}</div>
                  <div className="report-date">
                    Uploaded: {report.upload_date ? new Date(report.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div className="report-actions" onClick={e => e.stopPropagation()}>
                  <a href={report.file_url} download={report.file_name} className="btn-icon" title="Download File">
                    <ExternalLink size={15} />
                  </a>
                  <button className="btn-icon danger" onClick={() => handleDeleteClick(report)} title="Delete Record">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD PANEL SHIFTED TO THE BOTTOM */}
      <div className="glass-card rep-upload-panel">
        <div className="rup-header">
          <FilePlus size={20} color="#2563eb" />
          <h3>📤 Add Diagnostic Report</h3>
        </div>
        <p className="rup-desc">Upload clinical document scans, blood test sheets, or x-ray photos (PNG/JPG/PDF formats) directly to your secure archive.</p>
        
        {!selectedFile ? (
          <div className="rup-action-zone">
            <label className="btn-upload">
              <Upload size={18} />
              <span>Select Report File</span>
              <input type="file" hidden onChange={handleFileChange} />
            </label>
          </div>
        ) : (
          <div className="rup-form-zone">
            <div className="rup-file-detail">
              <FileText size={16} color="#2563eb" />
              <span>Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            
            <div className="rup-input-group">
              <label htmlFor="customName">✏️ Custom Report Name:</label>
              <input 
                id="customName"
                type="text" 
                placeholder="Type a perfect name for your file..." 
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                disabled={uploading}
              />
            </div>
            
            <div className="rup-buttons">
              <button className="btn-save" onClick={handleUploadSubmit} disabled={uploading || !customFileName.trim()}>
                {uploading ? (
                  <>
                    <Loader size={16} className="rep-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Save to Vault</span>
                  </>
                )}
              </button>
              <button className="btn-cancel" onClick={() => { setSelectedFile(null); setCustomFileName(''); }} disabled={uploading}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
              <h3>Delete Report</h3>
              <button className="rep-modal-close" onClick={() => setConfirmDeleteReport(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="rep-modal-body">
              <p>Are you sure you want to permanently delete the report <strong>{confirmDeleteReport.file_name}</strong>?</p>
              <p className="confirm-warning">⚠️ This action cannot be undone and will delete it from the secure database.</p>
            </div>
            <div className="rep-modal-actions">
              <button className="btn btn-danger" onClick={executeDeleteReport}>Delete</button>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteReport(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── MODALS ── */
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

        .rep-root { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; position: relative; }
        
        /* BLURRED IMAGE BACKDROP */
        .rep-glow-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('/dashboard_bg.png');
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.88);
          opacity: 0.28;
          pointer-events: none;
          z-index: -1;
        }

        .rep-header-glass {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 1.25rem;
          padding: 1.75rem 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .rep-header-glass h1 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif; }
        .rep-header-glass p { color: #475569; margin: 0.35rem 0 0; font-size: 0.875rem; line-height: 1.5; }

        .rep-container {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 1.5rem;
          border-radius: 1.25rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        
        .search-bar { 
          display: flex; align-items: center; gap: 0.75rem; 
          background: rgba(255, 255, 255, 0.5); padding: 0.7rem 1rem; 
          border-radius: 0.625rem; margin-bottom: 1.5rem;
          border: 1.5px solid #e2e8f0;
        }
        .search-bar input { border: none; background: transparent; width: 100%; font-size: 0.9rem; outline: none; font-family: inherit; color: #0f172a; }
        
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .report-card { 
          display: flex; align-items: center; gap: 1rem; padding: 1rem; 
          border: 1.5px solid rgba(255, 255, 255, 0.8); border-radius: 0.875rem; 
          transition: transform 0.2s, border-color 0.2s;
          background: rgba(255, 255, 255, 0.6);
        }
        .report-card:hover { transform: translateY(-2px); border-color: #2563eb; background: white; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
        .report-icon {
          width: 40px; height: 40px; border-radius: 0.625rem; background: #eff6ff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .report-info { flex: 1; min-width: 0; }
        .report-name { font-weight: 600; font-size: 0.9rem; color: #0f172a; margin-bottom: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .report-date { font-size: 0.75rem; color: #94a3b8; }
        
        .report-actions { display: flex; gap: 0.4rem; }
        .btn-icon { 
          padding: 0.5rem; border-radius: 0.5rem; border: none; 
          background: rgba(255, 255, 255, 0.8); color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; text-decoration: none; border: 1px solid #e2e8f0;
        }
        .btn-icon:hover { color: #2563eb; background: #eff6ff; border-color: rgba(37,99,235,0.2); }
        .btn-icon.danger:hover { color: #ef4444; background: #fef2f2; border-color: rgba(239,68,68,0.2); }
        
        .empty-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; font-size: 0.875rem; }
        .empty-state p { max-width: 320px; margin: 1rem auto 0; }

        .rep-loader { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: #94a3b8; font-size: 0.9rem; }
        .rep-spin { animation: spin 1s linear infinite; color: #2563eb; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* UPLOAD CARD AT THE BOTTOM */
        .rep-upload-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 1.25rem;
          padding: 1.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .rup-header { display: flex; align-items: center; gap: 0.5rem; }
        .rup-header h3 { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; }
        .rup-desc { font-size: 0.825rem; color: #64748b; margin: 0; line-height: 1.5; }
        .rup-action-zone { display: flex; justify-content: flex-start; margin-top: 0.5rem; }

        .btn-upload {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.35rem;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          border: none; border-radius: 0.625rem; font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }
        .btn-upload:hover { transform: translateY(-1px); opacity: 0.95; }

        .rup-form-zone {
          display: flex; flex-direction: column; gap: 0.85rem; 
          background: rgba(255, 255, 255, 0.4); padding: 1rem; 
          border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.5); 
          margin-top: 0.5rem;
        }
        .rup-file-detail { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #475569; }
        .rup-file-detail strong { color: #0f172a; word-break: break-all; }
        .rup-input-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .rup-input-group label { font-size: 0.8rem; font-weight: 700; color: #475569; }
        .rup-input-group input {
          background: white; border: 1.5px solid #cbd5e1; border-radius: 0.5rem; 
          padding: 0.6rem 0.8rem; font-size: 0.875rem; color: #0f172a; outline: none; 
          font-family: inherit; transition: border-color 0.2s;
        }
        .rup-input-group input:focus { border-color: #2563eb; }
        .rup-buttons { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
        
        .btn-save {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem;
          background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white;
          border: none; border-radius: 0.5rem; font-weight: 700; font-size: 0.825rem;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }
        .btn-save:hover { transform: translateY(-1px); opacity: 0.95; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .btn-cancel {
          padding: 0.6rem 1rem; background: #e2e8f0; color: #475569; border: none; 
          border-radius: 0.5rem; font-weight: 600; font-size: 0.825rem; cursor: pointer; 
          transition: all 0.15s;
        }
        .btn-cancel:hover { background: #cbd5e1; color: #1e293b; }

        .rep-alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 0.625rem; font-size: 0.85rem; font-weight: 500; }
        .rep-alert.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .rep-alert.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
      `}</style>
    </div>
  );
};

export default Reports;
