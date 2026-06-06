import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Upload,
  User,
  LogOut,
  Settings as SettingsIcon,
  FileText,
  Bell
} from 'lucide-react';

const DoctorSidebar = ({ profile, onLogout }) => {
  const firstName   = profile?.first_name || profile?.full_name?.split(' ')[0] || 'Doctor';
  const lastName    = profile?.last_name  || profile?.full_name?.split(' ').slice(1).join(' ') || '';
  const displayName = `Dr. ${firstName} ${lastName}`.trim();
  const initials    = `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase();

  const links = [
    { name: 'Dashboard',      path: '/',               icon: <LayoutDashboard size={20} />, end: true },
    { name: 'Patient Alerts',  path: '/doctor-alerts',  icon: <Bell size={20} />,            end: false },
    { name: 'Reports',        path: '/doctor-reports', icon: <FileText size={20} />,        end: false },
    { name: 'My Profile',     path: '/profile',        icon: <User size={20} />,            end: false },
  ];

  return (
    <aside className="sidebar">
      {/* Ambient glow blobs */}
      <div className="sb-glow sb-glow-1" />
      <div className="sb-glow sb-glow-2" />

      {/* Brand */}
      <div className="brand">
        <div className="brand-logo-ring">
          <Stethoscope size={22} color="white" />
        </div>
        <div className="brand-info">
          <h3 className="brand-title">Mini EHR</h3>
          <p className="brand-sub">Doctor Portal</p>
        </div>
      </div>

      <div className="sb-divider" />

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="nav-section-label">NAVIGATION</p>
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.end}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-text">{link.name}</span>
            <span className="nav-indicator" />
          </NavLink>
        ))}
      </nav>

      <div className="sb-divider" />
      <nav className="sidebar-nav" style={{ flex: 0 }}>
        <p className="nav-section-label">SYSTEM</p>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
        >
          <span className="nav-icon"><SettingsIcon size={20} /></span>
          <span className="nav-text">Settings</span>
          <span className="nav-indicator" />
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          className="user-card"
          onClick={() => window.location.href = '/profile'}
          title="Go to profile"
        >
          <div className="user-avatar">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="sb-avatar-img" />
              : <span>{initials}</span>
            }
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-role">Physician</span>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          background: linear-gradient(160deg, #0f1629 0%, #111827 60%, #0d1b2a 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          padding: 1.75rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar::-webkit-scrollbar {
          display: none;
        }
        .sb-glow { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; z-index: 0; }
        .sb-glow-1 { width: 200px; height: 200px; background: rgba(99,102,241,0.18); top: -60px; left: -60px; }
        .sb-glow-2 { width: 160px; height: 160px; background: rgba(14,165,233,0.12); bottom: 60px; right: -40px; }

        .brand { display: flex; align-items: center; gap: 0.875rem; margin-bottom: 1.25rem; position: relative; z-index: 1; }
        .brand-logo-ring {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #4f46e5, #0ea5e9);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(99,102,241,0.45); flex-shrink: 0;
        }
        .brand-title { font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin: 0; font-family: 'Outfit', sans-serif; }
        .brand-sub { font-size: 0.7rem; color: rgba(148,163,184,0.75); margin: 0; text-transform: uppercase; letter-spacing: 0.06em; }

        .sb-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent); margin: 0.75rem 0; position: relative; z-index: 1; }

        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; position: relative; z-index: 1; }
        .nav-section-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.1em; color: rgba(148,163,184,0.45); padding: 0.25rem 0.75rem 0.5rem; margin: 0; text-transform: uppercase; }

        .nav-link {
          display: flex; align-items: center; gap: 0.875rem; padding: 0.65rem 0.875rem;
          color: rgba(148,163,184,0.8); text-decoration: none; border-radius: 10px;
          font-weight: 500; font-size: 0.875rem; transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          position: relative; border: 1px solid transparent;
        }
        .nav-link:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); transform: translateX(3px); }
        .nav-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); transition: all 0.22s; flex-shrink: 0; }
        .nav-text { flex: 1; }
        .nav-indicator { width: 4px; height: 4px; border-radius: 50%; background: transparent; transition: background 0.2s, transform 0.2s; flex-shrink: 0; }

        .nav-link-active {
          color: #ffffff !important;
          background: linear-gradient(135deg, rgba(99,102,241,0.35), rgba(14,165,233,0.2)) !important;
          border-color: rgba(99,102,241,0.3) !important;
          backdrop-filter: blur(8px);
        }
        .nav-link-active .nav-icon { background: linear-gradient(135deg,rgba(99,102,241,0.6),rgba(14,165,233,0.5)); box-shadow: 0 0 12px rgba(99,102,241,0.4); }
        .nav-link-active .nav-indicator { background: #818cf8; transform: scale(1.5); }

        .sidebar-footer { padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; position: relative; z-index: 1; }
        .user-card {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem;
          border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer; transition: background 0.2s, border-color 0.2s;
        }
        .user-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(99,102,241,0.3); }
        .user-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, #4f46e5, #0ea5e9); color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.8rem; flex-shrink: 0; overflow: hidden;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }
        .sb-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
        .user-details { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
        .user-name { font-weight: 600; font-size: 0.8rem; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-role { font-size: 0.7rem; color: rgba(148,163,184,0.6); text-transform: capitalize; }

        .btn-logout {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);
          color: rgba(248,113,113,0.9); font-weight: 500; padding: 0.55rem 0.75rem;
          border-radius: 10px; width: 100%; cursor: pointer; font-size: 0.85rem;
          transition: all 0.2s; font-family: inherit;
        }
        .btn-logout:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.35); color: #f87171; transform: translateY(-1px); }
      `}</style>
    </aside>
  );
};

export default DoctorSidebar;
