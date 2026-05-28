import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Activity, 
  TrendingUp, 
  MessageSquare, 
  AlertCircle,
  BrainCircuit
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import axios from 'axios';
import { API_BASE } from '../lib/config';

const PatientDashboard = () => {
  const [symptoms, setSymptoms] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymptom, setNewSymptom] = useState({ 
    description: '', 
    severity: 5,
    duration: '',
    durationUnit: 'hours',
    startDate: new Date().toISOString().split('T')[0],
    location: '',
    associatedSymptoms: []
  });
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchSymptoms();
    fetchAlerts();
    fetchNotifications();
  }, []);

  const fetchSymptoms = async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (!user?.id) return;

      const response = await fetch(`${API_BASE}/symptoms/patient/${user.id}`);
      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to load symptoms:', data.detail || 'server error');
        return;
      }
      setSymptoms(data || []);
    } catch (err) {
      console.error('Failed to load symptoms:', err);
    }
  };

  const fetchAlerts = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API_BASE}/alerts/${user.id}`);
      setAlerts(response.data.alerts);
    } catch (err) {
      console.error("Alerts fetch failed", err);
    }
  };

  const fetchNotifications = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error && (error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('table'))) {
      setNotifications([]);
      return;
    }
    if (data) setNotifications(data);
  };

  const handleAddSymptom = async (e) => {
    e.preventDefault();
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (!user?.id) {
        throw new Error('No authenticated patient found. Please log in again.');
      }

      const payload = {
        patient_id: user.id,
        description: newSymptom.description,
        severity: newSymptom.severity,
        duration: newSymptom.duration ? `${newSymptom.duration} ${newSymptom.durationUnit}` : null,
        location: newSymptom.location || null,
        associated_symptoms: newSymptom.associatedSymptoms.length > 0 ? newSymptom.associatedSymptoms.join(', ') : null,
        occurrence_date: newSymptom.startDate
      };

      const response = await fetch(`${API_BASE}/symptoms/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save symptom.');
      }

      setShowAddModal(false);
      setNewSymptom({ 
        description: '', 
        severity: 5,
        duration: '',
        durationUnit: 'hours',
        startDate: new Date().toISOString().split('T')[0],
        location: '',
        associatedSymptoms: []
      });
      fetchSymptoms();
      fetchAlerts();
      fetchNotifications();
    } catch (err) {
      console.error('Save symptom failed:', err);
      alert('Failed to save symptom: ' + (err.message || 'Unknown error'));
    }
  };

  const generateAiSummary = async () => {
    setLoadingAi(true);
    const user = getStoredUser();
    if (!user?.id) {
      setLoadingAi(false);
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/ai/summarize-history?patient_id=${user.id}`);
      setAiSummary(response.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="patient-dashboard">
      <header className="page-header">
        <div>
          <h1>Welcome Back</h1>
          <p>Here's your health overview for today.</p>
        </div>
        <div className="header-image">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="40" r="18" stroke="var(--primary)" strokeWidth="2" fill="none"/>
            <path d="M60 58V90" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
            <path d="M35 70C35 70 30 75 30 80C30 85 35 90 40 92" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M85 70C85 70 90 75 90 80C90 85 85 90 80 92" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M45 75C45 75 45 85 45 92" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M75 75C75 75 75 85 75 92" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <circle cx="50" cy="38" r="3" fill="var(--primary)"/>
            <circle cx="70" cy="38" r="3" fill="var(--primary)"/>
            <path d="M55 45C55 45 60 48 65 45" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>Report Symptom</span>
        </button>
      </header>

      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert-card ${alert.type}`}>
              <AlertCircle size={20} />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="alerts-section">
          {notifications.map((n) => (
            <div key={n.id} className="alert-card warning">
              <MessageSquare size={20} />
              <span>
                <strong style={{ marginRight: 6 }}>{n.title || 'Update'}:</strong>
                {n.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Logs</div>
          <div className="stat-value">{symptoms.length}</div>
          <Activity size={24} color="var(--primary)" />
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Severity</div>
          <div className="stat-value">
            {symptoms.length > 0 
              ? (symptoms.reduce((acc, s) => acc + s.severity, 0) / symptoms.length).toFixed(1)
              : '0'
            }
          </div>
          <TrendingUp size={24} color="var(--success)" />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-section glass-card">
          <h3>Symptom Timeline</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={symptoms}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="occurrence_date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="severity" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--primary)' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ai-assistant-section glass-card">
          <div className="ai-header">
            <BrainCircuit size={24} color="var(--primary)" />
            <h3>AI Health Summary</h3>
          </div>
          <div className="ai-content">
            {aiSummary ? (
              <p>{aiSummary}</p>
            ) : (
              <p className="placeholder">Need a summary of your recent logs? Ask our AI assistant.</p>
            )}
          </div>
          <button 
            className="btn btn-outline" 
            onClick={generateAiSummary}
            disabled={loadingAi}
          >
            {loadingAi ? 'Analyzing...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>📋 Log New Symptom</h3>
            <form onSubmit={handleAddSymptom}>
              <div className="form-group">
                <label className="form-label">What symptom are you experiencing?</label>
                <input 
                  type="text"
                  placeholder="E.g. Dizziness, Headache, Fever, Nausea..."
                  value={newSymptom.description}
                  onChange={(e) => setNewSymptom({...newSymptom, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location (if applicable)</label>
                <input 
                  type="text"
                  placeholder="E.g. Head, Chest, Back, Stomach..."
                  value={newSymptom.location}
                  onChange={(e) => setNewSymptom({...newSymptom, location: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">When did it start?</label>
                  <input 
                    type="date"
                    value={newSymptom.startDate}
                    onChange={(e) => setNewSymptom({...newSymptom, startDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">How long has it lasted?</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number"
                      placeholder="Duration"
                      min="0"
                      value={newSymptom.duration}
                      onChange={(e) => setNewSymptom({...newSymptom, duration: e.target.value})}
                      style={{ flex: 1 }}
                    />
                    <select 
                      value={newSymptom.durationUnit}
                      onChange={(e) => setNewSymptom({...newSymptom, durationUnit: e.target.value})}
                      style={{ flex: 0.8 }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level: <strong>{newSymptom.severity}/10</strong></label>
                <div className="severity-indicator">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={newSymptom.severity}
                    onChange={(e) => setNewSymptom({...newSymptom, severity: parseInt(e.target.value)})}
                    className="severity-slider"
                  />
                  <div className="severity-labels">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Associated Symptoms</label>
                <div className="checkbox-group">
                  {['Fever', 'Fatigue', 'Nausea', 'Headache', 'Cough', 'Chills'].map(sym => (
                    <label key={sym} className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={newSymptom.associatedSymptoms.includes(sym)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSymptom({...newSymptom, associatedSymptoms: [...newSymptom.associatedSymptoms, sym]});
                          } else {
                            setNewSymptom({...newSymptom, associatedSymptoms: newSymptom.associatedSymptoms.filter(s => s !== sym)});
                          }
                        }}
                      />
                      {sym}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Symptom Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .patient-dashboard {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }
        .page-header h1 { font-size: 2rem; margin: 0; }
        .page-header p { color: var(--secondary); margin: 0.25rem 0 0 0; }
        
        .header-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 140px;
          height: 140px;
          background: linear-gradient(135deg, #f0f4ff 0%, #e0f0ff 100%);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 1.5rem;
        }
        
        .chart-section, .ai-assistant-section {
          padding: 1.5rem;
        }
        
        .ai-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .ai-content {
          min-height: 120px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        
        .placeholder { color: var(--secondary); font-style: italic; }
        
        .alert-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
          font-weight: 500;
        }
        .alert-card.warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          overflow-y: auto;
        }
        .modal-content {
          width: 90%;
          max-width: 600px;
          padding: 2rem;
          margin: 2rem auto;
        }
        .modal-content h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .severity-indicator {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .severity-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg, #4ade80 0%, #facc15 50%, #f87171 100%);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }
        .severity-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .severity-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .severity-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--secondary);
        }
        
        .checkbox-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.2s;
        }
        .checkbox-label:hover {
          background: var(--background);
        }
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
};

export default PatientDashboard;
