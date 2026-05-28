import React, { useState, useEffect } from 'react';
import { Users, Search, Pill, Activity, History, ChevronRight, Send, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from '../lib/session';

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [prescription, setPrescription] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    next_visit_date: ''
  });
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientStats, setPatientStats] = useState({ totalLogs: 0, avgSeverity: 0, maxSeverity: 0 });
  const [loading, setLoading] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      const user = getStoredUser();
      const doctorId = user?.id;

      if (doctorId) {
        const { data: doctorRow } = await supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle();
        if (doctorRow) setDoctorProfile(doctorRow);
      }

      if (!doctorId) {
        setPatients([]);
        return;
      }

      const { data, error } = await supabase.from('patients').select('*').eq('doctor_id', doctorId);
      if (error) {
        alert('Failed to load patients: ' + error.message);
        return;
      }
      if (data) setPatients(data);
    };
    loadPatients();
  }, []);

  const createNotification = async ({ patientId, type, title, message }) => {
    const payload = {
      patient_id: patientId,
      type,
      title,
      message,
    };
    const { error } = await supabase.from('notifications').insert([payload]);
    if (error && !error.message?.toLowerCase().includes('relation') && !error.message?.toLowerCase().includes('table')) {
      // Non-schema error; surface it in console but don't block the flow.
      // eslint-disable-next-line no-console
      console.warn('Notification insert failed:', error.message);
    }
  };

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    const { data: symptoms } = await supabase
      .from('symptoms')
      .select('*')
      .eq('patient_id', patient.id)
      .order('occurrence_date', { ascending: false });

    if (symptoms) {
      setPatientHistory(symptoms);
      const totalLogs = symptoms.length;
      const avgSeverity = totalLogs > 0 ? (symptoms.reduce((sum, item) => sum + item.severity, 0) / totalLogs).toFixed(1) : 0;
      const maxSeverity = totalLogs > 0 ? Math.max(...symptoms.map((item) => item.severity)) : 0;
      setPatientStats({ totalLogs, avgSeverity, maxSeverity });
    }
  };

  const handlePrescribe = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    const user = getStoredUser();
    if (!user?.id) {
      alert('Doctor session not found. Please log in again.');
      setLoading(false);
      return;
    }
    const { next_visit_date, ...basePrescription } = prescription;

    const { data: inserted, error } = await supabase.from('prescriptions').insert([{
      ...basePrescription,
      patient_id: selectedPatient.id,
      doctor_id: user.id
    }]).select('*');
    setLoading(false);
    if (error) {
      alert('Failed to send prescription: ' + error.message);
      return;
    }

    // Try to store next_visit_date if column exists
    const insertedId = inserted?.[0]?.id;
    if (insertedId && next_visit_date) {
      const { error: nextVisitErr } = await supabase
        .from('prescriptions')
        .update({ next_visit_date })
        .eq('id', insertedId);
      if (nextVisitErr && !nextVisitErr.message?.toLowerCase().includes('column')) {
        // eslint-disable-next-line no-console
        console.warn('next_visit_date update failed:', nextVisitErr.message);
      }
    }

    await createNotification({
      patientId: selectedPatient.id,
      type: 'prescription',
      title: 'New prescription',
      message: `Your doctor prescribed ${prescription.medicine_name}${prescription.duration ? ` for ${prescription.duration}` : ''}.`,
    });

    alert('Prescription sent successfully');
    setPrescription({ medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '', next_visit_date: '' });
  };

  const handleReportUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;
    setUploadingReport(true);

    const user = getStoredUser();
    const mockUrl = URL.createObjectURL(file);

    const { error } = await supabase.from('reports').insert([{
      patient_id: selectedPatient.id,
      doctor_id: user?.id,
      file_name: file.name,
      file_url: mockUrl,
      file_type: file.type
    }]);

    setUploadingReport(false);
    if (error) {
      alert('Failed to upload report: ' + error.message);
      return;
    }

    await createNotification({
      patientId: selectedPatient.id,
      type: 'report',
      title: 'New medical report',
      message: `A new report "${file.name}" was added to your record.`,
    });

    alert('Report uploaded successfully');
  };

  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (value) => {
    if (value <= 3) return '#4ade80';
    if (value <= 6) return '#facc15';
    return '#f87171';
  };

  return (
    <div className="doctor-dashboard">
      <header className="header-row">
        <div>
          <h1>Doctor Dashboard</h1>
          <p>Choose a patient to review symptoms, upload reports, and prescribe treatment.</p>
        </div>
        {doctorProfile?.doctor_code && (
          <div className="doctor-code glass-card">
            <div className="code-label">Your Doctor ID</div>
            <div className="code-value">{doctorProfile.doctor_code}</div>
            <div className="code-help">Share this with patients to connect.</div>
          </div>
        )}
      </header>

      <div className="layout-grid">
        <aside className="patient-sidebar glass-card">
          <div className="sidebar-header">
            <Users size={20} color="var(--primary)" />
            <h2>Patients</h2>
          </div>
          <div className="search-field">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients"
            />
          </div>
          <div className="patient-list">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                className={`patient-card ${selectedPatient?.id === patient.id ? 'active' : ''}`}
                onClick={() => selectPatient(patient)}
              >
                <span className="patient-avatar">{patient.full_name?.charAt(0)}</span>
                <div className="patient-details">
                  <strong>{patient.full_name}</strong>
                  <span>ID: {patient.id.slice(0, 8)}</span>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </aside>

        <main className="main-panel">
          {selectedPatient ? (
            <>
              <section className="patient-summary glass-card">
                <div className="summary-header">
                  <div>
                    <h2>{selectedPatient.full_name}</h2>
                    <p>ID: {selectedPatient.id}</p>
                  </div>
                  <div className="summary-badge">Patient</div>
                </div>
                <div className="summary-stats">
                  <div className="stat-card">
                    <span>Total Logs</span>
                    <strong>{patientStats.totalLogs}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Avg Severity</span>
                    <strong>{patientStats.avgSeverity}/10</strong>
                  </div>
                  <div className="stat-card">
                    <span>Max Severity</span>
                    <strong>{patientStats.maxSeverity}/10</strong>
                  </div>
                </div>
              </section>

              <section className="history-card glass-card">
                <div className="section-header">
                  <Activity size={20} color="var(--primary)" />
                  <h3>Recent Symptoms</h3>
                </div>
                {patientHistory.length === 0 ? (
                  <p className="empty-text">No symptoms recorded yet for this patient.</p>
                ) : (
                  patientHistory.slice(0, 6).map((item) => (
                    <div key={item.id} className="history-item">
                      <div>
                        <p className="history-title">{item.description}</p>
                        <p className="history-meta">{item.occurrence_date}</p>
                      </div>
                      <div className="severity-pill" style={{ backgroundColor: getSeverityColor(item.severity) }}>
                        {item.severity}/10
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="prescription-card glass-card">
                <div className="section-header">
                  <Pill size={20} color="var(--primary)" />
                  <h3>Prescribe Medicine</h3>
                </div>
                <form onSubmit={handlePrescribe} className="prescription-form">
                  <label>
                    Medicine
                    <input
                      required
                      value={prescription.medicine_name}
                      onChange={(e) => setPrescription({ ...prescription, medicine_name: e.target.value })}
                      placeholder="e.g. Amoxicillin"
                    />
                  </label>
                  <label>
                    Dosage
                    <input
                      value={prescription.dosage}
                      onChange={(e) => setPrescription({ ...prescription, dosage: e.target.value })}
                      placeholder="e.g. 500mg"
                    />
                  </label>
                  <label>
                    Frequency
                    <input
                      value={prescription.frequency}
                      onChange={(e) => setPrescription({ ...prescription, frequency: e.target.value })}
                      placeholder="e.g. Twice daily"
                    />
                  </label>
                  <label>
                    Duration
                    <input
                      value={prescription.duration}
                      onChange={(e) => setPrescription({ ...prescription, duration: e.target.value })}
                      placeholder="e.g. 7 days"
                    />
                  </label>
                  <label>
                    Instructions
                    <textarea
                      rows="3"
                      value={prescription.instructions}
                      onChange={(e) => setPrescription({ ...prescription, instructions: e.target.value })}
                      placeholder="Take with food, avoid alcohol..."
                    />
                  </label>
                  <label>
                    Next visit date (optional)
                    <input
                      type="date"
                      value={prescription.next_visit_date}
                      onChange={(e) => setPrescription({ ...prescription, next_visit_date: e.target.value })}
                    />
                  </label>
                  <button className="btn-submit" type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Prescription'}
                    <Send size={18} />
                  </button>
                </form>
              </section>

              <section className="prescription-card glass-card">
                <div className="section-header">
                  <Upload size={20} color="var(--primary)" />
                  <h3>Upload Report</h3>
                </div>
                <p className="empty-text" style={{ marginTop: 0 }}>
                  Add lab results / scans to this patient’s record.
                </p>
                <label className="btn-submit" style={{ width: 'fit-content' }}>
                  {uploadingReport ? 'Uploading...' : 'Choose file'}
                  <input type="file" hidden onChange={handleReportUpload} disabled={uploadingReport} />
                </label>
              </section>
            </>
          ) : (
            <div className="empty-state glass-card">
              <History size={48} color="var(--border)" />
              <h2>Select a patient to start</h2>
              <p>Patient data and history will appear here once a patient is selected.</p>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .doctor-dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .doctor-code {
          padding: 1rem 1.25rem;
          text-align: right;
          min-width: 220px;
        }
        .code-label {
          font-size: 0.75rem;
          color: var(--secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .code-value {
          font-size: 1.4rem;
          font-weight: 800;
          margin-top: 0.25rem;
        }
        .code-help {
          margin-top: 0.35rem;
          color: var(--secondary);
          font-size: 0.85rem;
        }

        .header-row h1 {
          margin: 0;
          font-size: 2rem;
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.5rem;
          min-height: calc(100vh - 180px);
        }

        .patient-sidebar {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 1.1rem;
        }

        .search-field {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          background: var(--background);
          margin-bottom: 1rem;
          border: 1px solid var(--border);
        }

        .search-field input {
          border: none;
          outline: none;
          background: transparent;
          flex: 1;
          font-size: 0.95rem;
        }

        .patient-list {
          display: grid;
          gap: 0.75rem;
          overflow-y: auto;
        }

        .patient-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid transparent;
          background: var(--background);
          cursor: pointer;
          text-align: left;
        }

        .patient-card.active {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.08);
        }

        .patient-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .patient-details strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .main-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .glass-card {
          padding: 1.5rem;
        }

        .patient-summary {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }

        .summary-badge {
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          background: var(--primary);
          color: white;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .stat-card {
          border-radius: var(--radius-md);
          background: var(--background);
          padding: 1rem;
        }

        .stat-card span {
          color: var(--secondary);
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }

        .stat-card strong {
          font-size: 1.5rem;
          display: block;
          margin-top: 0.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .history-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: var(--background);
        }

        .history-title {
          margin: 0;
          font-weight: 600;
        }

        .history-meta {
          margin: 0.25rem 0 0;
          color: var(--secondary);
          font-size: 0.9rem;
        }

        .severity-pill {
          min-width: 60px;
          text-align: center;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          color: white;
          font-weight: 700;
        }

        .prescription-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prescription-form {
          display: grid;
          gap: 1rem;
        }

        .prescription-form label {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .prescription-form input,
        .prescription-form textarea {
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          font-size: 0.95rem;
          background: white;
        }

        .btn-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.9rem 1.2rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 700;
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          text-align: center;
        }

        .empty-text {
          color: var(--secondary);
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default DoctorDashboard;
