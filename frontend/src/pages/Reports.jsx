import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, ExternalLink, Search, Loader, AlertCircle, CheckCircle, FilePlus } from 'lucide-react';
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

  const deleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setReports(r => r.filter(x => x.id !== id));
    } catch (e) {
      alert(e.message);
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
              <div key={report.id} className="report-card">
                <div className="report-icon">
                  <FileText size={22} color="#2563eb" />
                </div>
                <div className="report-info">
                  <div className="report-name">{report.file_name}</div>
                  <div className="report-date">
                    Uploaded: {report.upload_date ? new Date(report.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div className="report-actions">
                  <a href={report.file_url} download={report.file_name} target="_blank" rel="noreferrer" className="btn-icon" title="View or Download">
                    <ExternalLink size={15} />
                  </a>
                  <button className="btn-icon danger" onClick={() => deleteReport(report.id)} title="Delete Record">
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

      <style jsx>{`
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
