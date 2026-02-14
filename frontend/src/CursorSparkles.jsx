import { useEffect, useRef } from 'react';

const CursorSparkles = () => {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const cursor = useRef({ x: 0, y: 0 });
  const lastCursor = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef(null);

  // Configuration
  const PARTICLE_LIFETIME = 0.8; // How long sparks last (seconds)
  const MAX_PARTICLES = 150;     // Performance limit

  // Colors for Light/Dark modes (Gold & Blue for "Grand" feel)
  const COLORS = [
    '#3B82F6', // Blue-500
    '#60A5FA', // Blue-400
    '#8B5CF6', // Violet-500
    '#F59E0B', // Amber-500 (Gold)
    '#FFFFFF'  // White
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set Canvas Size
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init size

    // Track Mouse
    const handleMouseMove = (e) => {
      cursor.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Particle Class
    class Particle {
      constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx; // Velocity X
        this.vy = vy; // Velocity Y
        this.life = 1.0; // Starts at 100% life
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.size = Math.random() * 2 + 1; // Size between 1px and 3px
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02; // Decay rate
        this.size -= 0.05; // Shrink
      }

      draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life); // Fade out
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0; // Reset alpha
      }
    }

    // Animation Loop
    const animate = () => {
      // Clear canvas (with slight trail effect option, but clean clear looks sharper for sparks)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Calculate Velocity
      const dx = cursor.current.x - lastCursor.current.x;
      const dy = cursor.current.y - lastCursor.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 2. Spawn Particles based on Speed
      // Only spawn if moving fast enough (velocity > 2)
      if (dist > 2) {
        const numParticles = Math.min(Math.floor(dist / 5), 5); // Cap per frame

        for (let i = 0; i < numParticles; i++) {
          // Add randomness to spread
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5; // Spread cone
          const speed = Math.random() * 2; // Random speed

          // Velocity opposes movement direction (trail effect)
          const vx = -Math.cos(angle) * speed;
          const vy = -Math.sin(angle) * speed;

          particles.current.push(new Particle(
            cursor.current.x + (Math.random() - 0.5) * 10,
            cursor.current.y + (Math.random() - 0.5) * 10,
            vx,
            vy
          ));
        }
      }

      // Update Last Cursor Position
      lastCursor.current = { ...cursor.current };

      // 3. Update & Draw Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.update();
        p.draw(ctx);

        // Remove dead particles
        if (p.life <= 0 || p.size <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // Limit array size for safety
      if (particles.current.length > MAX_PARTICLES) {
        particles.current = particles.current.slice(particles.current.length - MAX_PARTICLES);
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50 mix-blend-screen"
    />
  );
};

export default CursorSparkles;