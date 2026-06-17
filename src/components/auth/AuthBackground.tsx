"use client";

export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft gradient orbs */}
      <div className="absolute -left-40 -top-40 size-[500px] rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-primary/25 blur-[100px]" />
      <div className="absolute left-1/2 top-1/3 size-[400px] -translate-x-1/2 rounded-full bg-primary/15 blur-[90px]" />

      {/* Subtle dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at center, hsl(var(--foreground)) 1.5px, transparent 1.5px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Fine grain texture */}
      <svg className="absolute inset-0 size-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Top-left decorative arc */}
      <svg
        className="absolute -left-20 -top-20 size-[400px] text-primary/15"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
        <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 12" />
      </svg>

      {/* Bottom-right decorative arc */}
      <svg
        className="absolute -bottom-20 -right-20 size-[400px] text-primary/15"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
        <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 12" />
      </svg>
    </div>
  );
}
