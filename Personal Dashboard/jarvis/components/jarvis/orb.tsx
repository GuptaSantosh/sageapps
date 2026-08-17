"use client";

export type OrbState = 'idle' | 'thinking' | 'done';

interface JarvisOrbProps {
  state: OrbState;
}

/**
 * JarvisOrb — a restrained animated sphere representing the Jarvis intelligence layer.
 *
 * Design intent:
 *   - Feels like a living system indicator, not a sci-fi prop
 *   - Three states: idle (slow breath), thinking (faster pulse + rotating arc), done (brief flash)
 *   - Emerald accent consistent with the rest of the interface
 *   - No canvas, no WebGL — pure CSS animations via globals.css keyframes
 */
export function JarvisOrb({ state }: JarvisOrbProps) {
  const isThinking = state === 'thinking';

  return (
    <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>

      {/* ── Outer rotating arc — only visible when thinking ─────────────── */}
      {isThinking && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -3,
            border: '1px solid transparent',
            borderTopColor: 'rgba(45,212,160,0.45)',
            borderRightColor: 'rgba(45,212,160,0.20)',
            animation: 'orb-ring-spin 2.2s linear infinite',
          }}
        />
      )}

      {/* ── Sphere body ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 38% 34%, rgba(45,212,160,0.14) 0%, rgba(45,212,160,0.05) 38%, rgba(10,15,30,0.97) 72%, rgba(10,15,30,1) 100%)',
          border: '1px solid rgba(45,212,160,0.18)',
          animation: isThinking
            ? 'orb-thinking-pulse 1.8s ease-in-out infinite'
            : 'orb-idle-breath 7s ease-in-out infinite',
        }}
      />

      {/* ── Top-left highlight for sphere dimensionality ─────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: 6,
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.09) 0%, transparent 58%)',
          animation: isThinking
            ? 'orb-highlight-drift 1.8s ease-in-out infinite'
            : 'orb-highlight-drift 7s ease-in-out infinite',
        }}
      />

      {/* ── Second inner gradient layer — adds depth ─────────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: 12,
          background:
            'radial-gradient(circle at 60% 65%, rgba(45,212,160,0.08) 0%, transparent 70%)',
        }}
      />

      {/* ── Centre dot ───────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: isThinking
              ? 'rgba(45,212,160,0.85)'
              : 'rgba(45,212,160,0.50)',
            boxShadow: isThinking
              ? '0 0 8px rgba(45,212,160,0.6), 0 0 2px rgba(45,212,160,0.8)'
              : '0 0 5px rgba(45,212,160,0.35)',
            transition: 'all 0.4s ease',
          }}
        />
      </div>

    </div>
  );
}
