import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Sidebar from './components/Sidebar';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Login from './pages/Login';
import Reports from './pages/Reports';
import Prescriptions from './pages/Prescriptions';
import Symptoms from './pages/Symptoms';
import Settings from './pages/Settings';

function App() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user in localStorage (Custom Auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setProfile(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setProfile(null);
    window.location.href = '/login';
  };

  if (loading) return <div className="loading-screen">
    <div className="loader"></div>
    <p>Loading Clinical Data...</p>
    <style jsx>{`
      .loading-screen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; background: var(--background); }
      .loader { width: 48px; height: 48px; border: 5px solid var(--border); border-bottom-color: var(--primary); border-radius: 50%; display: inline-block; animation: rotation 1s linear infinite; }
      @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>;

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={!profile ? <Login /> : <Navigate to="/" />} />
          
          <Route 
            path="/*" 
            element={
              profile ? (
                <div className="dashboard-container">
                  <Sidebar profile={profile} onLogout={handleLogout} />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={
                        profile?.role === 'doctor' ? <DoctorDashboard /> : <PatientDashboard />
                      } />
                      <Route path="/symptoms" element={<Symptoms />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/prescriptions" element={<Prescriptions />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
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
