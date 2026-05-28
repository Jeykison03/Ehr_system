import React, { useState, useEffect } from 'react';
import { Pill, Calendar, Clock, Info, BrainCircuit } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';
import { API_BASE } from '../lib/config';

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [explainingId, setExplainingId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    const user = getStoredUser();
    if (!user?.id) return;
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setPrescriptions(data);
  };

  const explainMedicine = async (medicine, id) => {
    setExplainingId(id);
    try {
      const response = await axios.post(`${API_BASE}/ai/explain-medicine?medicine=${medicine}`);
      setExplanation({ id, text: response.data.explanation });
    } catch (err) {
      console.error(err);
    } finally {
      setExplainingId(null);
    }
  };

  return (
    <div className="prescriptions-page">
      <header className="page-header">
        <div>
          <h1>Active Prescriptions</h1>
          <p>View your medications and use AI to understand them better.</p>
        </div>
      </header>

      <div className="prescriptions-grid">
        {prescriptions.map(p => (
          <div key={p.id} className="prescription-card glass-card">
            <div className="card-header">
              <div className="med-icon">
                <Pill size={24} color="white" />
              </div>
              <div className="med-info">
                <h3>{p.medicine_name}</h3>
                <span>{p.dosage}</span>
              </div>
            </div>

            <div className="card-body">
              <div className="info-row">
                <Clock size={16} />
                <span>{p.frequency}</span>
              </div>
              <div className="info-row">
                <Calendar size={16} />
                <span>For {p.duration}</span>
              </div>
              {p.instructions && (
                <div className="instructions">
                  <strong>Instructions:</strong>
                  <p>{p.instructions}</p>
                </div>
              )}
            </div>

            <div className="card-footer">
              <button 
                className="btn btn-outline w-full"
                onClick={() => explainMedicine(p.medicine_name, p.id)}
                disabled={explainingId === p.id}
              >
                <BrainCircuit size={18} />
                <span>{explainingId === p.id ? 'Explaining...' : 'Explain with AI'}</span>
              </button>
            </div>

            {explanation?.id === p.id && (
              <div className="ai-explanation">
                <div className="exp-header">
                  <Info size={14} />
                  <span>AI Insight</span>
                </div>
                <p>{explanation.text}</p>
              </div>
            )}
          </div>
        ))}
        {prescriptions.length === 0 && (
          <div className="empty-state glass-card">
            <Pill size={48} color="var(--border)" />
            <p>No prescriptions found. Your doctor hasn't issued any yet.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .prescriptions-page { display: flex; flex-direction: column; gap: 2rem; }
        .prescriptions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
        
        .prescription-card { padding: 0; display: flex; flex-direction: column; overflow: hidden; }
        .card-header { 
          padding: 1.5rem; background: var(--primary); color: white; 
          display: flex; align-items: center; gap: 1rem;
        }
        .med-icon { 
          width: 48px; height: 48px; border-radius: var(--radius-md); 
          background: rgba(255,255,255,0.2); display: flex; 
          align-items: center; justify-content: center;
        }
        .med-info h3 { color: white; margin: 0; font-size: 1.25rem; }
        .med-info span { font-size: 0.85rem; opacity: 0.9; }
        
        .card-body { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
        .info-row { display: flex; align-items: center; gap: 0.75rem; color: var(--secondary); font-size: 0.9rem; font-weight: 500; }
        .instructions { margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border); }
        .instructions strong { display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--secondary); margin-bottom: 0.25rem; }
        .instructions p { font-size: 0.9rem; margin: 0; }
        
        .card-footer { padding: 1rem 1.5rem; }
        .w-full { width: 100%; }
        
        .ai-explanation { 
          padding: 1rem 1.5rem; background: #eff6ff; border-top: 1px solid var(--ring);
          animation: slideIn 0.3s ease;
        }
        .exp-header { display: flex; align-items: center; gap: 0.5rem; color: var(--primary); font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase; }
        .ai-explanation p { font-size: 0.85rem; line-height: 1.5; margin: 0; }
        
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 4rem 0; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--secondary); }
      `}</style>
    </div>
  );
};

export default Prescriptions;
