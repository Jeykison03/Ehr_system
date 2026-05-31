import React, { useRef, useEffect } from 'react';

/**
 * PhysicsGrid
 * Renders a canvas-based dot-grid where each node is anchored to a rest position
 * by a spring. The cursor exerts a repulsion force. Nodes settle back with damping.
 * Pure JS / canvas — zero dependency.
 */
const PhysicsGrid = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── config ──────────────────────────────────────────────────────────────
    const COLS = 28;          // grid columns
    const ROWS = 20;          // grid rows
    const SPRING_K = 0.08;    // spring stiffness
    const DAMPING = 0.82;     // velocity damping (lower = snappier settle)
    const REPULSE_R = 130;    // cursor influence radius (px)
    const REPULSE_F = 6.5;    // cursor repulsion strength
    const DOT_RADIUS = 1.8;   // resting dot radius
    const DOT_RADIUS_MAX = 4; // max dot radius when displaced
    const LINE_DIST = 90;     // max distance to draw connecting lines
    const PRIMARY = { r: 37, g: 99, b: 235 };   // --primary color
    const ACCENT  = { r: 14,  g: 165, b: 233 };  // --accent color

    let W = 0, H = 0;
    let nodes = [];
    let mouse = { x: -9999, y: -9999 };
    let raf;

    // ── build grid ──────────────────────────────────────────────────────────
    const buildGrid = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      nodes = [];
      const colGap = W / (COLS - 1);
      const rowGap = H / (ROWS - 1);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const rx = c * colGap;
          const ry = r * rowGap;
          nodes.push({
            rx, ry,       // rest position
            x: rx, y: ry, // current position
            vx: 0, vy: 0  // velocity
          });
        }
      }
    };

    // ── physics tick ────────────────────────────────────────────────────────
    const tick = () => {
      for (const n of nodes) {
        // spring force toward rest
        let fx = (n.rx - n.x) * SPRING_K;
        let fy = (n.ry - n.y) * SPRING_K;

        // cursor repulsion
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPULSE_R && dist > 0) {
          const strength = ((REPULSE_R - dist) / REPULSE_R) * REPULSE_F;
          fx += (dx / dist) * strength;
          fy += (dy / dist) * strength;
        }

        // integrate
        n.vx = (n.vx + fx) * DAMPING;
        n.vy = (n.vy + fy) * DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      }
    };

    // ── draw ────────────────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw connecting lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          // Only check neighbours (same row adjacent or row below)
          const dx = a.rx - b.rx, dy = a.ry - b.ry;
          const restDist = Math.sqrt(dx * dx + dy * dy);
          if (restDist > LINE_DIST) continue;

          const cdx = a.x - b.x, cdy = a.y - b.y;
          const curDist = Math.sqrt(cdx * cdx + cdy * cdy);
          const dispRatio = Math.min(curDist / restDist, 2) - 1; // 0 = no displacement
          const alpha = Math.max(0, 0.12 - dispRatio * 0.04);

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${PRIMARY.r},${PRIMARY.g},${PRIMARY.b},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const dispX = n.x - n.rx, dispY = n.y - n.ry;
        const displacement = Math.sqrt(dispX * dispX + dispY * dispY);
        const t = Math.min(displacement / 30, 1); // 0-1 blend factor

        const r = PRIMARY.r + (ACCENT.r - PRIMARY.r) * t;
        const g = PRIMARY.g + (ACCENT.g - PRIMARY.g) * t;
        const b = PRIMARY.b + (ACCENT.b - PRIMARY.b) * t;
        const alpha = 0.25 + t * 0.45;
        const radius = DOT_RADIUS + (DOT_RADIUS_MAX - DOT_RADIUS) * t;

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
        ctx.fill();
      }
    };

    // ── loop ────────────────────────────────────────────────────────────────
    const loop = () => {
      tick();
      draw();
      raf = requestAnimationFrame(loop);
    };

    // ── events ──────────────────────────────────────────────────────────────
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onResize = () => {
      buildGrid();
    };

    buildGrid();
    loop();
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default PhysicsGrid;
