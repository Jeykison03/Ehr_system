import React, { useRef, useEffect } from 'react';

/**
 * AuroraGrid – premium background animation
 *
 * Floating soft orbs + a subtle SVG hexagonal mesh that reacts gently to the
 * mouse cursor. No external dependencies — pure canvas + CSS.
 *
 * Design: Two layers:
 *  1. CSS: large soft glowing orbs that slowly drift (pure CSS keyframes)
 *  2. Canvas: a lightweight floating-particle constellation that tracks the mouse
 */
const AuroraGrid = ({ hideCanvas = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Config ───────────────────────────────────────────────────────────────
    const PARTICLE_COUNT = 55;
    const CONNECTION_DIST = 140;  // max distance to draw a line
    const MOUSE_ATTRACT = 90;     // mouse attraction radius
    const MOUSE_STRENGTH = 0.015; // how strongly mouse pulls particles
    const SPEED_MAX = 0.38;

    let W = 0, H = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let raf;

    const rand = (min, max) => Math.random() * (max - min) + min;

    // ── Build particles ──────────────────────────────────────────────────────
    const buildParticles = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x:  rand(0, W),
        y:  rand(0, H),
        vx: rand(-SPEED_MAX, SPEED_MAX),
        vy: rand(-SPEED_MAX, SPEED_MAX),
        r:  rand(1.5, 3.5),
        opacity: rand(0.3, 0.7),
      }));
    };

    // ── Tick ─────────────────────────────────────────────────────────────────
    const tick = () => {
      for (const p of particles) {
        // Gentle mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_ATTRACT && dist > 0) {
          p.vx += (dx / dist) * MOUSE_STRENGTH;
          p.vy += (dy / dist) * MOUSE_STRENGTH;
        }

        // Cap speed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > SPEED_MAX) {
          p.vx = (p.vx / speed) * SPEED_MAX;
          p.vy = (p.vy / speed) * SPEED_MAX;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
      }
    };

    // ── Draw ─────────────────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > CONNECTION_DIST) continue;

          const alpha = (1 - dist / CONNECTION_DIST) * 0.18;
          // Gradient line: primary → accent
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, `rgba(99,102,241,${alpha})`);
          grad.addColorStop(1, `rgba(14,165,233,${alpha})`);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Particles
      for (const p of particles) {
        // Outer glow ring
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0,   `rgba(99,102,241,${p.opacity * 0.35})`);
        glow.addColorStop(0.5, `rgba(14,165,233,${p.opacity * 0.15})`);
        glow.addColorStop(1,   `rgba(99,102,241,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${p.opacity})`;
        ctx.fill();
      }
    };

    const loop = () => { tick(); draw(); raf = requestAnimationFrame(loop); };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onResize     = () => buildParticles();

    buildParticles();
    loop();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize',    onResize);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize',    onResize);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <>
      {/* CSS aurora orbs layer */}
      <div className={`aurora-layer ${hideCanvas ? 'aurora-layer--doctor' : ''}`} aria-hidden="true">
        <div className="aurora-orb orb-1" />
        <div className="aurora-orb orb-2" />
        <div className="aurora-orb orb-3" />
        <div className="aurora-orb orb-4" />
      </div>

      {/* Canvas constellation layer */}
      {!hideCanvas && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width:  '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      <style>{`
        .aurora-layer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .aurora-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0;
          animation: orbFloat 18s ease-in-out infinite;
        }
        .orb-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.08) 70%, transparent 100%);
          top: -180px; left: -100px;
          animation-delay: 0s; animation-duration: 20s;
        }
        .orb-2 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(14,165,233,0.18) 0%, rgba(6,182,212,0.06) 70%, transparent 100%);
          top: 30%; right: -120px;
          animation-delay: -6s; animation-duration: 24s;
        }
        .orb-3 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(99,102,241,0.05) 70%, transparent 100%);
          bottom: -100px; left: 20%;
          animation-delay: -12s; animation-duration: 22s;
        }
        .orb-4 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.04) 70%, transparent 100%);
          bottom: 20%; right: 10%;
          animation-delay: -4s; animation-duration: 26s;
        }
        @keyframes orbFloat {
          0%   { opacity: 0;    transform: translate(0px, 0px)    scale(1); }
          15%  { opacity: 1; }
          50%  { opacity: 0.85; transform: translate(30px, -40px) scale(1.08); }
          85%  { opacity: 1; }
          100% { opacity: 0;    transform: translate(0px, 0px)    scale(1); }
        }

        /* Extremely light & soft styling for Doctors Dashboard background */
        .aurora-layer--doctor .aurora-orb {
          opacity: 0 !important;
          filter: blur(120px);
          animation: orbFloatDoctor 25s ease-in-out infinite;
        }
        .aurora-layer--doctor .orb-1 {
          background: radial-gradient(circle, rgba(224, 231, 255, 0.14) 0%, rgba(224, 231, 255, 0.04) 70%, transparent 100%) !important;
        }
        .aurora-layer--doctor .orb-2 {
          background: radial-gradient(circle, rgba(243, 244, 246, 0.12) 0%, rgba(243, 244, 246, 0.02) 70%, transparent 100%) !important;
        }
        .aurora-layer--doctor .orb-3 {
          background: radial-gradient(circle, rgba(219, 234, 254, 0.10) 0%, rgba(219, 234, 254, 0.02) 70%, transparent 100%) !important;
        }
        .aurora-layer--doctor .orb-4 {
          background: radial-gradient(circle, rgba(241, 245, 249, 0.12) 0%, rgba(241, 245, 249, 0.02) 70%, transparent 100%) !important;
        }
        @keyframes orbFloatDoctor {
          0%   { opacity: 0;    transform: translate(0px, 0px) scale(1); }
          15%  { opacity: 0.45; }
          50%  { opacity: 0.35; transform: translate(15px, -20px) scale(1.04); }
          85%  { opacity: 0.45; }
          100% { opacity: 0;    transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </>
  );
};

export default AuroraGrid;
