import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------------------------------------------------------------------------
// Retro camcorder timeline: the viewfinder rewinds through the years and
// settles on END_YEAR. Styled after a VHS/camcorder overlay — glowing
// orange screen frame, REC + timecode HUD, big typewriter year and a
// year ruler sliding underneath.
// ---------------------------------------------------------------------------

export const RETRO_DURATION = 120; // 4 s @ 30 fps

const START_YEAR = 2026;
const END_YEAR = 1947;

const W = 1920;
const H = 1080;

// Screen (viewfinder) geometry
const SCREEN_X = 225;
const SCREEN_Y = 120;
const SCREEN_W = W - SCREEN_X * 2;
const SCREEN_H = H - SCREEN_Y * 2;

const RULER_Y = SCREEN_H * 0.57; // within the screen
const YEAR_SPACING = 140; // px per year on the ruler

// Current (possibly fractional) year at a given frame
const yearAt = (frame: number): number => {
  if (frame <= 12) return START_YEAR;
  if (frame >= 78) return END_YEAR;
  const t = (frame - 12) / (78 - 12);
  const eased = Easing.inOut(Easing.cubic)(t);
  return START_YEAR + (END_YEAR - START_YEAR) * eased;
};

// Era background layers — swap these gradients for real photos by
// putting files in public/ and using <Img src={staticFile(...)}>.
type Era = {
  until: number; // active while yearValue >= until
  background: string;
};

const ERAS: Era[] = [
  {
    // present day — deep space blue
    until: 2024.5,
    background:
      'radial-gradient(ellipse 60% 80% at 50% 35%, #0d2440 0%, #06101f 55%, #020509 100%)',
  },
  {
    // 2000s–2020s — purple nebula
    until: 2005,
    background:
      'radial-gradient(ellipse 55% 70% at 52% 40%, #2a1535 0%, #140a1e 55%, #060309 100%)',
  },
  {
    // 70s–90s — cold steel gray
    until: 1975,
    background:
      'radial-gradient(ellipse 65% 80% at 50% 45%, #2c3138 0%, #16181c 55%, #08090b 100%)',
  },
  {
    // 50s–70s — warm lunar gray
    until: 1952,
    background:
      'radial-gradient(ellipse 65% 80% at 50% 55%, #3a352e 0%, #1c1915 55%, #0a0908 100%)',
  },
  {
    // 40s — dark smoky red
    until: -Infinity,
    background:
      'radial-gradient(ellipse 80% 60% at 50% 20%, #4a1410 0%, #260a08 45%, #0d0403 100%)',
  },
];

const eraIndexFor = (yearValue: number): number => {
  for (let i = 0; i < ERAS.length; i++) {
    if (yearValue >= ERAS[i].until) return i;
  }
  return ERAS.length - 1;
};

// Deterministic star field for the area around the screen
const STARS = Array.from({length: 46}, (_, i) => ({
  x: (i * 367 + 91) % W,
  y: (i * 211 + 37) % H,
  r: 1 + ((i * 13) % 3) * 0.6,
  o: 0.25 + ((i * 7) % 5) * 0.1,
  warm: i % 6 === 0,
}));

const YearRuler: React.FC<{yearValue: number}> = ({yearValue}) => {
  const centerX = SCREEN_W / 2;
  const current = Math.round(yearValue);

  const years: number[] = [];
  for (
    let y = Math.floor(yearValue - 7);
    y <= Math.ceil(yearValue + 7);
    y++
  ) {
    years.push(y);
  }

  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: SCREEN_H}}>
      {/* Ruler line, fading out at the edges */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: RULER_Y,
          width: SCREEN_W,
          height: 3,
          background:
            'linear-gradient(90deg, transparent 0%, #ddd 12%, #eee 50%, #ddd 88%, transparent 100%)',
        }}
      />
      {years.map((year) => {
        // Years decrease to the right, like rewinding a tape
        const x = centerX + (yearValue - year) * YEAR_SPACING;
        if (x < -60 || x > SCREEN_W + 60) return null;

        const edgeFade = interpolate(
          Math.abs(x - centerX),
          [0, centerX - 220, centerX - 60],
          [1, 0.85, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        const isCurrent = year === current;
        // Slight per-year vertical jitter, like hand-placed labels
        const jitter = ((year * 37) % 3) * 6;

        return (
          <React.Fragment key={year}>
            <div
              style={{
                position: 'absolute',
                left: x - 1.5,
                top: RULER_Y,
                width: 3,
                height: 22,
                backgroundColor: '#ddd',
                opacity: edgeFade,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x - 60,
                top: RULER_Y + (isCurrent ? 44 : 28 + jitter),
                width: 120,
                textAlign: 'center',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: isCurrent ? 700 : 400,
                fontSize: isCurrent ? 32 : 26,
                color: isCurrent ? '#fff' : '#9c9c9c',
                opacity: isCurrent ? 1 : edgeFade * 0.9,
                textShadow: isCurrent ? '0 0 12px rgba(255,255,255,0.6)' : 'none',
              }}
            >
              {year}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const RetroTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const yearValue = yearAt(frame);
  const bigYear = Math.round(yearValue);
  const era = eraIndexFor(yearValue);

  const seconds = Math.floor(frame / fps);
  const timecode = `00:00:0${Math.min(seconds, 9)}`;

  // REC dot blinks once per second
  const recOn = frame % 30 < 20;

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 90% 90% at 50% 45%, #241207 0%, #160b04 55%, #0d0602 100%)',
      }}
    >
      {/* Star field around the screen */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: '50%',
            backgroundColor: s.warm ? '#ffb37a' : '#fff',
            opacity: s.o,
          }}
        />
      ))}

      {/* Viewfinder screen with glowing orange frame */}
      <div
        style={{
          position: 'absolute',
          left: SCREEN_X,
          top: SCREEN_Y,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: 64,
          border: '6px solid #ff9d5c',
          boxShadow:
            '0 0 26px rgba(255,122,40,0.9), 0 0 80px rgba(255,100,20,0.45), inset 0 0 30px rgba(255,122,40,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Era backgrounds, crossfaded near boundaries */}
        {ERAS.map((e, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              background: e.background,
              opacity: i === era ? 1 : 0,
            }}
          />
        ))}

        {/* Scanlines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)',
          }}
        />
        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Big typewriter year */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: RULER_Y - 235,
            width: SCREEN_W,
            textAlign: 'center',
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 700,
            fontSize: 120,
            letterSpacing: '0.32em',
            color: '#fff',
            textShadow:
              '0 0 18px rgba(255,255,255,0.75), 0 0 46px rgba(255,255,255,0.35)',
          }}
        >
          {bigYear}
        </div>

        {/* Orange arrow between the year and the ruler */}
        <svg
          style={{
            position: 'absolute',
            left: SCREEN_W / 2 - 14,
            top: RULER_Y - 72,
          }}
          width={28}
          height={62}
        >
          <path
            d="M 14 0 L 26 20 L 18 20 L 18 62 L 10 62 L 10 20 L 2 20 Z"
            fill="#f5a623"
            style={{filter: 'drop-shadow(0 0 6px rgba(245,166,35,0.8))'}}
          />
        </svg>

        <YearRuler yearValue={yearValue} />

        {/* HUD: REC + SP */}
        <div
          style={{
            position: 'absolute',
            left: 44,
            top: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: recOn ? '#ff2b2b' : '#5a1010',
              boxShadow: recOn ? '0 0 10px rgba(255,43,43,0.9)' : 'none',
            }}
          />
          <span style={{color: '#fff', fontWeight: 700, fontSize: 34, letterSpacing: 3}}>
            REC
          </span>
          <span style={{color: '#8a8a8a', fontWeight: 400, fontSize: 28, letterSpacing: 2}}>
            SP
          </span>
        </div>

        {/* HUD: HI-FI STEREO */}
        <div
          style={{
            position: 'absolute',
            left: 44,
            bottom: 36,
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#8a8a8a',
            fontSize: 28,
            letterSpacing: 4,
          }}
        >
          HI-FI STEREO
        </div>

        {/* HUD: timecode */}
        <div
          style={{
            position: 'absolute',
            right: 44,
            bottom: 36,
            fontFamily: '"Courier New", Courier, monospace',
            color: '#c9b9a5',
            fontSize: 30,
            letterSpacing: 3,
          }}
        >
          {timecode}
        </div>
      </div>
    </AbsoluteFill>
  );
};
