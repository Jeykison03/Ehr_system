import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, ExternalLink, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('patient_id', user.id)
      .order('upload_date', { ascending: false });
    
    if (data) setReports(data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const user = getStoredUser();
    if (!user?.id) {
      alert('No authenticated patient found.');
      setUploading(false);
      return;
    }
    
    // In a real app, you'd upload to Supabase Storage first.
    // Here we'll simulate the URL for the demo.
    const mockUrl = URL.createObjectURL(file); 

    const { error } = await supabase
      .from('reports')
      .insert([{
        patient_id: user.id,
        file_name: file.name,
        file_url: mockUrl,
        file_type: file.type
      }]);

    if (!error) fetchReports();
    setUploading(false);
  };

  const deleteReport = async (id) => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (!error) fetchReports();
  };

  const filteredReports = reports.filter(r => 
    r.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h1>Medical Reports</h1>
          <p>Manage and view your uploaded diagnostic reports.</p>
        </div>
        <label className="btn btn-primary cursor-pointer">
          <Upload size={18} />
          <span>{uploading ? 'Uploading...' : 'Upload New Report'}</span>
          <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
        </label>
      </header>

      <div className="glass-card reports-container">
        <div className="search-bar">
          <Search size={18} />
          <input 
            placeholder="Search reports by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="reports-grid">
          {filteredReports.map(report => (
            <div key={report.id} className="report-card">
              <div className="report-icon">
                <FileText size={32} color="var(--primary)" />
              </div>
              <div className="report-info">
                <div className="report-name">{report.file_name}</div>
                <div className="report-date">
                  Uploaded: {new Date(report.upload_date).toLocaleDateString()}
                </div>
              </div>
              <div className="report-actions">
                <a href={report.file_url} target="_blank" rel="noreferrer" className="btn-icon">
                  <ExternalLink size={18} />
                </a>
                <button className="btn-icon danger" onClick={() => deleteReport(report.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="empty-state">
              <FileText size={48} color="var(--border)" />
              <p>No reports found. Start by uploading a file.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .reports-page { display: flex; flex-direction: column; gap: 2rem; }
        .reports-container { padding: 1.5rem; }
        .search-bar { 
          display: flex; align-items: center; gap: 0.75rem; 
          background: var(--background); padding: 0.75rem; 
          border-radius: var(--radius-md); margin-bottom: 2rem;
        }
        .search-bar input { border: none; background: transparent; }
        .search-bar input:focus { box-shadow: none; }
        
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .report-card { 
          display: flex; align-items: center; gap: 1rem; padding: 1rem; 
          border: 1px solid var(--border); border-radius: var(--radius-md); 
          transition: transform 0.2s;
        }
        .report-card:hover { transform: translateY(-2px); border-color: var(--primary); }
        .report-info { flex: 1; }
        .report-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .report-date { font-size: 0.75rem; color: var(--secondary); }
        
        .report-actions { display: flex; gap: 0.5rem; }
        .btn-icon { 
          padding: 0.5rem; border-radius: var(--radius-sm); border: none; 
          background: var(--background); color: var(--secondary); cursor: pointer;
        }
        .btn-icon:hover { color: var(--primary); background: var(--ring); }
        .btn-icon.danger:hover { color: var(--danger); background: #fee2e2; }
        
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--secondary); }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Reports;
