import React from 'react';
import { useLocation } from 'react-router-dom';
import AuroraGrid from './AuroraGrid';

/**
 * PageLayout
 * Wraps every main-content page. Renders the AuroraGrid background animation
 * everywhere EXCEPT /profile and /reports (per user request).
 *
 * The animation now fills 100% of the main-content area (edge-to-edge, no gaps).
 * Inner content gets its own padding via the .page-content-inner div.
 */
const EXCLUDED_PATHS = ['/profile', '/reports'];

const PageLayout = ({ children }) => {
  const { pathname } = useLocation();
  const sessionUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isDoctor = sessionUser?.role === 'doctor';
  const showGrid = !EXCLUDED_PATHS.includes(pathname);
  const hideCanvas = pathname === '/' && isDoctor;

  return (
    <div
      className="page-layout-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        /* stretch so animation always reaches all 4 edges */
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background animation layer — covers the entire wrapper */}
      {showGrid && <AuroraGrid hideCanvas={hideCanvas} />}

      {/* Scrollable content layer with padding */}
      <div
        className="page-content-inner"
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '2.5rem',
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
