import React, { useState, useRef } from 'react';
import { ScanLine, Upload, X, AlertCircle, Pill, CheckCircle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { API_BASE } from '../lib/config';

const PrescriptionScan = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);  // { medicines: [{name, description, side_effects}] }
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, etc.).');
      return;
    }
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!image) { setError('Please upload a prescription image first.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/scan-prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: image })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed.');
      setResult(data);
      setExpandedIdx(0);
    } catch (e) {
      setError(e.message || 'Could not analyze image. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setExpandedIdx(null);
  };

  return (
    <div className="ps-root">
      {/* HERO */}
      <div className="ps-hero">
        <div className="ps-hero-glow" />
        <div className="ps-hero-icon"><ScanLine size={32} /></div>
        <div>
          <h1 className="ps-title">Prescription Scanner</h1>
          <p className="ps-sub">Upload a photo of your prescription — our AI will identify every medicine and list its side effects in simple language.</p>
        </div>
      </div>

      <div className="ps-layout">
        {/* LEFT: UPLOAD PANEL */}
        <div className="ps-panel ps-upload-panel">
          <h3 className="ps-panel-title">📷 Upload Prescription Photo</h3>

          {!imagePreview ? (
            <div
              className={`ps-drop-zone ${dragging ? 'ps-dz-active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={36} color={dragging ? '#2563eb' : '#94a3b8'} />
              <p className="ps-dz-title">{dragging ? 'Drop it here!' : 'Drag & drop or click to upload'}</p>
              <p className="ps-dz-sub">Supports JPEG, PNG, HEIC, WEBP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="ps-preview-card">
              <img src={imagePreview} alt="prescription" className="ps-preview-img" />
              <button className="ps-remove-btn" onClick={clearAll}><X size={16} /> Remove</button>
            </div>
          )}

          {error && (
            <div className="ps-error"><AlertCircle size={16} />{error}</div>
          )}

          {imagePreview && !loading && (
            <button className="ps-analyze-btn" onClick={handleAnalyze}>
              <ScanLine size={18} />
              Analyze with AI
            </button>
          )}

          {loading && (
            <div className="ps-analyzing">
              <Loader size={24} className="ps-spin" />
              <div>
                <p className="ps-analyzing-title">Analyzing prescription...</p>
                <p className="ps-analyzing-sub">Gemini Vision is reading your prescription</p>
              </div>
            </div>
          )}

          {/* HOW IT WORKS */}
          <div className="ps-how-it-works">
            <p className="ps-hiw-title">How it works</p>
            {[
              ['📸', 'Upload a clear photo of your prescription'],
              ['🤖', 'Gemini AI reads and identifies all medicines'],
              ['💊', 'Get side effects & descriptions instantly'],
            ].map(([icon, text], i) => (
              <div key={i} className="ps-hiw-step">
                <span className="ps-hiw-icon">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: RESULTS PANEL */}
        <div className="ps-panel ps-results-panel">
          <h3 className="ps-panel-title">💊 Medicine Analysis Results</h3>

          {!result && !loading && (
            <div className="ps-placeholder">
              <ScanLine size={48} color="#e2e8f0" />
              <p>Upload a prescription and click <strong>Analyze</strong> to see results here.</p>
            </div>
          )}

          {result && result.medicines?.length === 0 && (
            <div className="ps-no-medicines">
              <AlertCircle size={32} color="#f59e0b" />
              <p>No medicines could be identified. Try a clearer photo with better lighting.</p>
            </div>
          )}

          {result && result.medicines?.length > 0 && (
            <div className="ps-medicines-list">
              <div className="ps-found-header">
                <CheckCircle size={18} color="#10b981" />
                <span>{result.medicines.length} medicine{result.medicines.length !== 1 ? 's' : ''} identified</span>
              </div>

              {result.medicines.map((med, i) => (
                <div key={i} className="ps-med-card">
                  <div className="ps-med-header" onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                    <div className="ps-med-left">
                      <div className="ps-med-icon-wrap"><Pill size={18} /></div>
                      <div>
                        <div className="ps-med-name">{med.name}</div>
                        <div className="ps-med-desc">{med.description}</div>
                      </div>
                    </div>
                    <div className="ps-med-toggle">
                      <span className="ps-se-count">{med.side_effects?.length || 0} side effects</span>
                      {expandedIdx === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {expandedIdx === i && (
                    <div className="ps-med-body">
                      <p className="ps-se-title">Known Side Effects:</p>
                      {med.side_effects?.length > 0 ? (
                        <ul className="ps-se-list">
                          {med.side_effects.map((se, j) => (
                            <li key={j} className="ps-se-item">
                              <span className="ps-se-dot" />
                              {se}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="ps-se-none">No side effects listed.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="ps-disclaimer">
                ⚠️ This analysis is AI-generated for informational purposes only. Always consult your doctor or pharmacist for medical advice.
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ps-root { display: flex; flex-direction: column; gap: 1.75rem; font-family: 'Inter', sans-serif; padding-bottom: 2rem; }

        /* HERO */
        .ps-hero {
          display: flex; align-items: center; gap: 1.25rem;
          background: linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed);
          border-radius: 1.25rem; padding: 1.75rem 2rem; position: relative; overflow: hidden;
        }
        .ps-hero-glow {
          position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(196, 181, 253, 0.2), transparent 70%); pointer-events: none;
        }
        .ps-hero-icon {
          width: 64px; height: 64px; border-radius: 1rem; background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
        }
        .ps-title { color: white; font-size: 1.6rem; font-weight: 800; margin: 0; }
        .ps-sub { color: rgba(255,255,255,0.7); font-size: 0.875rem; margin: 0.3rem 0 0; line-height: 1.5; }

        /* LAYOUT */
        .ps-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem; }
        @media (max-width: 900px) { .ps-layout { grid-template-columns: 1fr; } }

        /* PANELS */
        .ps-panel {
          background: white; border-radius: 1.25rem; padding: 1.75rem;
          border: 1px solid #f1f5f9; box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          display: flex; flex-direction: column; gap: 1.25rem;
        }
        .ps-panel-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }

        /* DROP ZONE */
        .ps-drop-zone {
          border: 2px dashed #e2e8f0; border-radius: 1rem; padding: 3rem 2rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
          cursor: pointer; transition: all 0.2s; background: #fafafa; text-align: center;
        }
        .ps-drop-zone:hover { border-color: #2563eb; background: #eff6ff; }
        .ps-dz-active { border-color: #2563eb; background: #eff6ff; transform: scale(1.01); }
        .ps-dz-title { font-weight: 600; color: #374151; font-size: 0.95rem; margin: 0; }
        .ps-dz-sub { color: #94a3b8; font-size: 0.8rem; margin: 0; }

        /* PREVIEW */
        .ps-preview-card { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .ps-preview-img { max-width: 100%; max-height: 240px; border-radius: 0.875rem; object-fit: contain; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .ps-remove-btn {
          display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.875rem;
          border: 1.5px solid #fecaca; background: #fef2f2; color: #ef4444;
          border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        .ps-remove-btn:hover { background: #fee2e2; }

        /* ANALYZE BUTTON */
        .ps-analyze-btn {
          width: 100%; padding: 0.875rem; border: none; cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #a855f7); color: white;
          font-weight: 700; font-size: 0.95rem; border-radius: 0.875rem;
          display: flex; align-items: center; justify-content: center; gap: 0.625rem;
          transition: all 0.2s; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
        }
        .ps-analyze-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* ANALYZING */
        .ps-analyzing {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem; background: #f5f3ff; border-radius: 0.875rem;
          border: 1px solid #ddd6fe;
        }
        .ps-analyzing-title { font-weight: 600; color: #4c1d95; margin: 0 0 0.2rem; font-size: 0.9rem; }
        .ps-analyzing-sub { color: #7c3aed; font-size: 0.8rem; margin: 0; }
        .ps-spin { animation: spin 1s linear infinite; color: #7c3aed; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* HOW IT WORKS */
        .ps-how-it-works { border-top: 1px solid #f1f5f9; padding-top: 1rem; }
        .ps-hiw-title { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.75rem; }
        .ps-hiw-step { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem; }
        .ps-hiw-icon { font-size: 1rem; flex-shrink: 0; }

        /* ERROR */
        .ps-error {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
          background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
          border-radius: 0.625rem; font-size: 0.875rem;
        }

        /* PLACEHOLDER */
        .ps-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
          padding: 3rem; color: #cbd5e1; text-align: center;
          flex: 1; justify-content: center;
        }
        .ps-placeholder p { color: #94a3b8; max-width: 240px; line-height: 1.6; font-size: 0.9rem; }

        .ps-no-medicines { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2.5rem; color: #92400e; text-align: center; background: #fffbeb; border-radius: 0.875rem; }

        /* MEDICINES */
        .ps-found-header { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #065f46; font-size: 0.9rem; background: #d1fae5; padding: 0.625rem 1rem; border-radius: 0.5rem; }
        .ps-medicines-list { display: flex; flex-direction: column; gap: 0.875rem; }

        .ps-med-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; transition: box-shadow 0.2s; }
        .ps-med-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .ps-med-header {
          display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem;
          cursor: pointer; gap: 1rem; transition: background 0.15s;
        }
        .ps-med-header:hover { background: #f8fafc; }
        .ps-med-left { display: flex; align-items: center; gap: 0.875rem; flex: 1; min-width: 0; }
        .ps-med-icon-wrap {
          width: 40px; height: 40px; border-radius: 0.625rem; flex-shrink: 0;
          background: #f5f3ff; color: #7c3aed;
          display: flex; align-items: center; justify-content: center;
        }
        .ps-med-name { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
        .ps-med-desc { color: #64748b; font-size: 0.8rem; margin-top: 0.15rem; line-height: 1.4; }
        .ps-med-toggle { display: flex; align-items: center; gap: 0.5rem; color: #64748b; flex-shrink: 0; }
        .ps-se-count { font-size: 0.78rem; background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }

        .ps-med-body { padding: 0.875rem 1.25rem 1.25rem; background: #fafafa; border-top: 1px solid #f1f5f9; }
        .ps-se-title { font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 0.75rem; }
        .ps-se-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .ps-se-item { display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.875rem; color: #374151; line-height: 1.5; }
        .ps-se-dot { width: 6px; height: 6px; border-radius: 50%; background: #a855f7; flex-shrink: 0; margin-top: 0.45rem; }
        .ps-se-none { color: #94a3b8; font-style: italic; font-size: 0.85rem; }

        .ps-disclaimer {
          font-size: 0.78rem; color: #92400e; background: #fffbeb;
          border: 1px solid #fde68a; padding: 0.75rem 1rem; border-radius: 0.625rem; line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default PrescriptionScan;
