import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';
import DoctorSidebar from './components/DoctorSidebar';
import PageLayout from './components/PageLayout';

// Pages – shared
import Login from './pages/Login';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';

// Pages – patient
import PatientDashboard from './pages/PatientDashboard';
import Reports from './pages/Reports';
import Symptoms from './pages/Symptoms';
import PrescriptionScan from './pages/PrescriptionScan';
import Reminders from './pages/Reminders';
import Prescriptions from './pages/Prescriptions';

// Pages – doctor
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorReports from './pages/DoctorReports';
import DoctorAlerts from './pages/DoctorAlerts';
import PatientDetailPage from './pages/PatientDetailPage';

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setProfile(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setProfile(null);
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loader" />
      <p>Loading Clinical Data...</p>
      <style>{`
        .loading-screen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: var(--background); }
        .loader { width: 48px; height: 48px; border: 5px solid var(--border); border-bottom-color: var(--primary); border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  const isDoctor = profile?.role === 'doctor';

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!profile ? <Login /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/*"
            element={
              profile ? (
                <div className="dashboard-container">
                  {isDoctor
                    ? <DoctorSidebar profile={profile} onLogout={handleLogout} />
                    : <Sidebar       profile={profile} onLogout={handleLogout} />
                  }
                  <main className="main-content">
                    <PageLayout>
                      <Routes>
                        {/* Root */}
                        <Route path="/" element={isDoctor ? <DoctorDashboard /> : <PatientDashboard />} />

                        {/* Doctor-only */}
                        <Route path="/doctor-reports"          element={<DoctorReports />} />
                        <Route path="/doctor-alerts"           element={<DoctorAlerts />} />
                        <Route path="/doctor/patient/:patientId" element={<PatientDetailPage />} />

                        {/* Patient-only */}
                        <Route path="/symptoms"           element={<Symptoms />} />
                        <Route path="/reports"            element={<Reports />} />
                        <Route path="/prescription-scan"  element={<PrescriptionScan />} />
                        <Route path="/reminders"          element={<Reminders />} />

                        {/* Shared */}
                        <Route path="/settings" element={<Settings onProfileUpdate={(updated) => setProfile(updated)} />} />
                        <Route path="/profile"  element={<Profile onProfileUpdate={(updated) => setProfile(updated)} />} />
                      </Routes>
                    </PageLayout>
                  </main>
                </div>
              ) : <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
