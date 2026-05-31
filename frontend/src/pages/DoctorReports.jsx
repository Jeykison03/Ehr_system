import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Search, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';

const DoctorReports = () => {
  const user = getStoredUser();
  const [patients,  setPatients]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [file,      setFile]      = useState(null);
  const [fileName,  setFileName]  = useState('');
  const [uploading, setUploading] = useState(false);
  const [status,    setStatus]    = useState(null); // { type: 'success'|'error', msg }
  const [loading,   setLoading]   = useState(true);

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

  const filtered = patients.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
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

    const mockUrl = URL.createObjectURL(file);
    const finalName = `${fileName.trim()}.${file.name.split('.').pop()}`;

    const { error } = await supabase.from('reports').insert([{
      patient_id: selected.id,
      doctor_id:  user?.id,
      file_name:  finalName,
      file_url:   mockUrl,
      file_type:  file.type,
    }]);

    // Try notification
    if (!error) {
      await supabase.from('notifications').insert([{
        patient_id: selected.id,
        type:    'report',
        title:   'New medical report',
        message: `Dr. uploaded a new report "${finalName}" to your record.`,
      }]).catch(() => {});
    }

    setUploading(false);
    if (error) {
      setStatus({ type: 'error', msg: 'Upload failed: ' + error.message });
    } else {
      setStatus({ type: 'success', msg: `Report "${finalName}" uploaded successfully for ${selected.full_name}.` });
      setFile(null);
      setFileName('');
    }
  };

  const clearFile = () => { setFile(null); setFileName(''); setStatus(null); };

  return (
    <div className="dr-root">
      {/* Page header */}
      <div className="dr-header">
        <div>
          <h1 className="dr-title">Upload Report</h1>
          <p className="dr-sub">Select a patient and attach their medical report or scan.</p>
        </div>
      </div>

      <div className="dr-grid">
        {/* Patient Selector */}
        <div className="dr-panel">
          <div className="dr-panel-head">
            <Users size={17} />
            <span>Select Patient</span>
            {selected && <span className="dr-selected-badge">✓ {selected.full_name}</span>}
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
          ) : filtered.length === 0 ? (
            <div className="dr-empty"><AlertCircle size={28} /><p>No patients found.</p></div>
          ) : (
            <div className="dr-patient-list">
              {filtered.map(p => {
                const initials = (p.full_name || 'P').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <button
                    key={p.id}
                    className={`dr-pt-btn ${selected?.id === p.id ? 'dr-pt-btn--active' : ''}`}
                    onClick={() => { setSelected(p); setStatus(null); }}
                  >
                    <div className="dr-pt-av">{initials}</div>
                    <div className="dr-pt-info">
                      <span className="dr-pt-name">{p.full_name}</span>
                      <span className="dr-pt-sub">{p.email || `ID: ${p.id.slice(0,8)}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Panel */}
        <div className="dr-panel">
          <div className="dr-panel-head">
            <Upload size={17} />
            <span>Attach Report</span>
          </div>

          {/* Drop Zone */}
          <div
            className={`dr-dropzone ${file ? 'dr-dropzone--filled' : ''} ${!selected ? 'dr-dropzone--disabled' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={selected ? handleDrop : undefined}
            onClick={selected ? () => document.getElementById('dr-file-input').click() : undefined}
          >
            {file ? (
              <div className="dr-file-preview">
                <FileText size={36} color="#6366f1" />
                <div className="dr-file-name">{file.name}</div>
                <div className="dr-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                <button className="dr-clear-btn" onClick={e => { e.stopPropagation(); clearFile(); }}>
                  <X size={14} /> Remove
                </button>
              </div>
            ) : (
              <>
                <Upload size={36} color={selected ? '#6366f1' : '#cbd5e1'} />
                <p className="dr-dz-title">{selected ? 'Drop file here or click to browse' : 'Select a patient first'}</p>
                <p className="dr-dz-sub">PDF, JPG, PNG, DOCX supported</p>
              </>
            )}
          </div>
          <input id="dr-file-input" type="file" hidden onChange={handleFileChange} />

          {/* File Name */}
          {file && (
            <div className="dr-name-group">
              <label className="dr-label">Report Name</label>
              <input
                className="dr-input"
                placeholder="e.g. Blood Test Results"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
              />
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`dr-status dr-status--${status.type}`}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {status.msg}
            </div>
          )}

          {/* Upload Button */}
          <button
            className="dr-upload-btn"
            onClick={handleUpload}
            disabled={uploading || !file || !selected || !fileName.trim()}
          >
            {uploading ? (
              <><div className="dr-btn-spinner" /> Uploading…</>
            ) : (
              <><Upload size={17} /> Upload Report</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .dr-root {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          font-family: 'Inter', sans-serif;
        }

        /* Header */
        .dr-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .dr-title {
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 0.35rem;
          color: #0f172a;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(120deg, #4f46e5, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dr-sub { font-size: 0.9rem; color: #64748b; margin: 0; }

        /* Grid */
        .dr-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 780px) { .dr-grid { grid-template-columns: 1fr; } }

        /* Panels */
        .dr-panel {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(99,102,241,0.07);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dr-panel-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.9rem;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .dr-selected-badge {
          margin-left: auto;
          font-size: 0.72rem;
          font-weight: 600;
          background: #d1fae5;
          color: #065f46;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          text-transform: none;
          letter-spacing: 0;
        }

        /* Patient list */
        .dr-search-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 0.55rem 0.875rem;
        }
        .dr-search {
          border: none !important; background: transparent !important;
          outline: none !important; box-shadow: none !important;
          font-size: 0.85rem; width: 100%; padding: 0 !important;
        }
        .dr-patient-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 400px; overflow-y: auto; }
        .dr-pt-btn {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 0.875rem; border-radius: 0.875rem;
          background: transparent; border: 1.5px solid transparent;
          cursor: pointer; text-align: left; width: 100%;
          transition: all 0.17s; font-family: inherit;
        }
        .dr-pt-btn:hover { background: rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.15); }
        .dr-pt-btn--active {
          background: linear-gradient(135deg,rgba(99,102,241,0.1),rgba(14,165,233,0.06)) !important;
          border-color: rgba(99,102,241,0.3) !important;
        }
        .dr-pt-av {
          width: 36px; height: 36px; border-radius: 9px;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white; font-weight: 700; font-size: 0.78rem;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .dr-pt-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .dr-pt-name { font-weight: 600; font-size: 0.85rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dr-pt-sub  { font-size: 0.72rem; color: #94a3b8; }

        /* Drop zone */
        .dr-dropzone {
          border: 2px dashed rgba(99,102,241,0.3);
          border-radius: 1rem;
          padding: 2.5rem 1.5rem;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.75rem; text-align: center; cursor: pointer;
          transition: all 0.2s;
          background: rgba(248,250,255,0.6);
          min-height: 200px;
        }
        .dr-dropzone:not(.dr-dropzone--disabled):hover {
          border-color: #6366f1;
          background: rgba(99,102,241,0.04);
        }
        .dr-dropzone--filled {
          border-color: #6366f1;
          border-style: solid;
          background: rgba(99,102,241,0.04);
        }
        .dr-dropzone--disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        .dr-dz-title { font-weight: 600; font-size: 0.95rem; color: #374151; margin: 0; }
        .dr-dz-sub   { font-size: 0.8rem; color: #94a3b8; margin: 0; }

        .dr-file-preview { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .dr-file-name { font-weight: 600; font-size: 0.9rem; color: #1e293b; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dr-file-size { font-size: 0.78rem; color: #94a3b8; }
        .dr-clear-btn {
          display: flex; align-items: center; gap: 0.35rem;
          background: #fee2e2; color: #b91c1c; border: none;
          padding: 0.35rem 0.75rem; border-radius: 999px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: background 0.15s;
        }
        .dr-clear-btn:hover { background: #fecaca; }

        .dr-name-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .dr-label { font-size: 0.82rem; font-weight: 600; color: #374151; }
        .dr-input {
          width: 100%; padding: 0.7rem 0.9rem;
          border: 1px solid #e2e8f0; border-radius: 0.75rem;
          font-size: 0.9rem; font-family: inherit;
          background: white; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dr-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

        .dr-status {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1rem; border-radius: 0.875rem;
          font-size: 0.875rem; font-weight: 500;
        }
        .dr-status--success { background: #d1fae5; color: #065f46; }
        .dr-status--error   { background: #fee2e2; color: #991b1b; }

        .dr-upload-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          color: white; border: none; border-radius: 0.875rem;
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          font-family: inherit; transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
        }
        .dr-upload-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .dr-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dr-btn-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: drSpin 0.7s linear infinite;
        }
        @keyframes drSpin { to { transform: rotate(360deg); } }

        .dr-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 2rem 1rem;
          gap: 0.75rem; color: #94a3b8; font-size: 0.875rem; text-align: center;
        }
        .dr-spinner {
          width: 24px; height: 24px;
          border: 3px solid rgba(99,102,241,0.15);
          border-top-color: #6366f1; border-radius: 50%;
          animation: drSpin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DoctorReports;
