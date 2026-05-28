import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Activity, 
  Trash2,
  Calendar,
  MapPin,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { API_BASE } from '../lib/config';

const Symptoms = () => {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSymptoms();
  }, []);

  const fetchSymptoms = async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (!user?.id) {
        throw new Error('No authenticated patient found. Please log in again.');
      }

      const response = await fetch(`${API_BASE}/symptoms/patient/${user.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch symptoms from the server.');
      }
      setSymptoms(data || []);
    } catch (err) {
      console.error('Failed to fetch symptoms:', err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to save symptom: ' + (err.message || 'Unknown error'));
    }
  };

  const deleteSymptom = async (id) => {
    if (window.confirm('Are you sure you want to delete this symptom?')) {
      try {
        const response = await fetch(`${API_BASE}/symptoms/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error('Failed to delete symptom');
        }
        fetchSymptoms();
      } catch (err) {
        console.error('Error deleting symptom:', err);
        alert('Failed to delete symptom: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const getSeverityColor = (severity) => {
    if (severity <= 3) return '#4ade80';
    if (severity <= 6) return '#facc15';
    return '#f87171';
  };

  const getSeverityLabel = (severity) => {
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    return 'Severe';
  };

  if (loading) return <div className="loading-text">Loading symptoms...</div>;

  return (
    <div className="symptoms-page">
      <header className="page-header">
        <div>
          <h1>📋 Your Symptoms Log</h1>
          <p>Track and manage your health symptoms over time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>Log New Symptom</span>
        </button>
      </header>

      <div className="symptoms-container">
        {symptoms.length === 0 ? (
          <div className="empty-state glass-card">
            <Activity size={48} color="var(--border)" />
            <h3>No symptoms logged yet</h3>
            <p>Start by logging your first symptom to track your health.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Log First Symptom
            </button>
          </div>
        ) : (
          <div className="symptoms-grid">
            {symptoms.map(symptom => (
              <div key={symptom.id} className="symptom-card glass-card">
                <div className="card-header">
                  <h3>{symptom.description}</h3>
                  <button 
                    className="btn-delete"
                    onClick={() => deleteSymptom(symptom.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="card-content">
                  <div className="info-row">
                    <Calendar size={16} />
                    <span><strong>Date:</strong> {new Date(symptom.occurrence_date).toLocaleDateString()}</span>
                  </div>

                  {symptom.location && (
                    <div className="info-row">
                      <MapPin size={16} />
                      <span><strong>Location:</strong> {symptom.location}</span>
                    </div>
                  )}

                  {symptom.duration && (
                    <div className="info-row">
                      <Zap size={16} />
                      <span><strong>Duration:</strong> {symptom.duration}</span>
                    </div>
                  )}

                  <div className="severity-section">
                    <div className="severity-bar">
                      <div 
                        className="severity-fill" 
                        style={{ 
                          width: `${symptom.severity * 10}%`,
                          backgroundColor: getSeverityColor(symptom.severity)
                        }}
                      ></div>
                    </div>
                    <div className="severity-info">
                      <span className="severity-label">{getSeverityLabel(symptom.severity)}</span>
                      <span className="severity-value">{symptom.severity}/10</span>
                    </div>
                  </div>

                  {symptom.associated_symptoms && (
                    <div className="associated-symptoms">
                      <strong>Associated Symptoms:</strong>
                      <div className="symptoms-tags">
                        {symptom.associated_symptoms.split(',').map((s, idx) => (
                          <span key={idx} className="tag">{s.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <h2>📋 Log New Symptom</h2>
            <form onSubmit={handleAddSymptom}>
              <div className="form-group">
                <label className="form-label">What symptom are you experiencing? *</label>
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
                  <label className="form-label">Duration</label>
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
                <label className="form-label">Severity Level: <strong style={{color: 'var(--primary)'}}>{newSymptom.severity}/10</strong></label>
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
        .symptoms-page {
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

        .symptoms-container { min-height: 300px; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          gap: 1rem;
        }

        .symptoms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .symptom-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .symptom-card:hover {
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 1rem;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--primary);
        }

        .btn-delete {
          background: none;
          border: none;
          color: var(--secondary);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .btn-delete:hover {
          color: #f87171;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: var(--text);
        }

        .severity-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .severity-bar {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }

        .severity-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }

        .severity-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .severity-label {
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .associated-symptoms {
          margin-top: 0.5rem;
        }

        .associated-symptoms strong {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          text-transform: uppercase;
          color: var(--secondary);
        }

        .symptoms-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: var(--primary);
          color: white;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .loading-text {
          text-align: center;
          padding: 2rem;
          color: var(--secondary);
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          width: 100%;
          max-width: 600px;
          padding: 2rem;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content h2 {
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
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
};

export default Symptoms;
