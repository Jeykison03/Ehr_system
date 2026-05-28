import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Stethoscope, 
  FileText, 
  Pill, 
  Settings as SettingsIcon, 
  LogOut,
  User,
  Activity
} from 'lucide-react';

const Sidebar = ({ profile, onLogout }) => {
  const handleLogout = () => onLogout();

  const patientLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Symptoms', path: '/symptoms', icon: <Activity size={20} /> },
    { name: 'Reports', path: '/reports', icon: <FileText size={20} /> },
    { name: 'Prescriptions', path: '/prescriptions', icon: <Pill size={20} /> },
  ];

  const doctorLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  ];

  const links = profile?.role === 'doctor' ? doctorLinks : patientLinks;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <Stethoscope size={32} color="var(--primary)" />
        </div>
        <div className="brand-info">
          <h3>Mini EHR</h3>
          <p>{profile?.role === 'doctor' ? 'Provider Portal' : 'Patient Portal'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink 
            key={link.path} 
            to={link.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            <span>{link.name}</span>
          </NavLink>
        ))}
        <NavLink 
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} mt-auto`}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{profile?.full_name}</span>
            <span className="user-role">{profile?.role}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <style jsx>{`
        .brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .brand h3 {
          font-size: 1.25rem;
          margin: 0;
        }
        .brand p {
          font-size: 0.75rem;
          color: var(--secondary);
          margin: 0;
        }
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .mt-auto { margin-top: auto; border-top: 1px solid var(--border); padding-top: 1rem; }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          color: var(--secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-link:hover {
          background: var(--background);
          color: var(--primary);
        }
        .nav-link.active {
          background: var(--primary);
          color: white;
        }
        .sidebar-footer {
          border-top: 1px solid var(--border);
          padding-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .user-role {
          font-size: 0.75rem;
          color: var(--secondary);
          text-transform: capitalize;
        }
        .btn-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: transparent;
          border: none;
          color: var(--danger);
          font-weight: 500;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          width: 100%;
        }
        .btn-logout:hover {
          background: #fef2f2;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
