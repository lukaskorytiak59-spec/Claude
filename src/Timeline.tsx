import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------------------------------------------------------------------------
// Scene layout
// ---------------------------------------------------------------------------

const SCENE_WIDTH = 3500;
const VIEW_WIDTH = 1920;
const TIMELINE_Y = 540;

const LINE_START_X = 120;
const LINE_END_X = 3280;

export const TIMELINE_DURATION = 300;

type Side = 'up' | 'down';

type TimelineEvent = {
  x: number;
  at: number; // frame at which the line tip arrives at this node
  year: string;
  side: Side;
  img?: string; // file in public/ shown clipped inside the circle
  labelDy?: number; // small vertical nudge for the label
  labelAt?: 'circle' | 'line'; // where the text is written (default circle)
};

const EVENTS: TimelineEvent[] = [
  {x: 520, at: 25, year: 'MAY 1945', side: 'up', img: 'may1945.png'},
  {x: 1270, at: 88, year: 'DESTROYED EUROPE', side: 'down', labelDy: 8},
  {x: 2020, at: 150, year: '60 MILLION DEAD', side: 'up', labelAt: 'line'},
  {x: 2770, at: 212, year: '', side: 'down'},
];

// The tip of the yellow line pauses at every node for ~1.5 s, then speeds
// off to the next one. Pairs of identical x values are the pauses.
const TIP_KEYFRAMES: {frame: number; x: number}[] = [
  {frame: 0, x: LINE_START_X},
  {frame: 25, x: 520},
  {frame: 62, x: 520},
  {frame: 88, x: 1270},
  {frame: 125, x: 1270},
  {frame: 150, x: 2020},
  {frame: 188, x: 2020},
  {frame: 212, x: 2770},
  {frame: 250, x: 2770},
  {frame: 275, x: LINE_END_X},
];

const tipXAt = (frame: number): number => {
  const first = TIP_KEYFRAMES[0];
  const last = TIP_KEYFRAMES[TIP_KEYFRAMES.length - 1];
  if (frame <= first.frame) return first.x;
  if (frame >= last.frame) return last.x;

  for (let i = 0; i < TIP_KEYFRAMES.length - 1; i++) {
    const a = TIP_KEYFRAMES[i];
    const b = TIP_KEYFRAMES[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      // Ease each travel segment: slow start out of the pause, fast middle
      const eased = Easing.inOut(Easing.cubic)(t);
      return a.x + (b.x - a.x) * eased;
    }
  }
  return last.x;
};

// Placeholder circles that held the images in the original composition
const CIRCLE_RADIUS = 115;
const CIRCLE_OFFSET_X = 560; // horizontal distance from node to circle centre
const CIRCLE_OFFSET_Y = 218; // vertical distance from the timeline

const glow = (color: string, size: number) =>
  `drop-shadow(0 0 ${size}px ${color})`;

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const Node: React.FC<{event: TimelineEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - event.at;

  const scale = spring({
    frame: local,
    fps,
    config: {damping: 12, stiffness: 180},
    durationInFrames: 30,
  });

  if (local < 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: event.x - 26,
        top: TIMELINE_Y - 26,
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: '9px solid #fff',
        backgroundColor: '#000',
        transform: `scale(${scale})`,
        filter: glow('rgba(255,255,255,0.85)', 12),
      }}
    />
  );
};

const YearLabel: React.FC<{event: TimelineEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const onLine = event.labelAt === 'line';
  // Circle labels start typing once the elbow connector has been drawn;
  // line labels start right away, written out from the yellow line
  const local = frame - event.at - (onLine ? 6 : 22);

  if (local < 0) return null;

  // Typewriter: characters appear one by one
  const charsShown = Math.floor(
    interpolate(local, [0, 14], [0, event.year.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const visible = event.year.slice(0, charsShown);

  const dir = event.side === 'up' ? -1 : 1;
  const elbowY = TIMELINE_Y + dir * CIRCLE_OFFSET_Y;
  // Circle labels sit above the horizontal connector segment, between
  // the elbow corner and the circle — sized so the full text fits there
  const available = CIRCLE_OFFSET_X - CIRCLE_RADIUS - 100;
  const fontSize = onLine
    ? 64
    : Math.min(84, Math.floor(available / (0.66 * event.year.length)));
  const left = onLine ? event.x + 48 : event.x + 35;
  const top = onLine
    ? TIMELINE_Y - 90 + (event.labelDy ?? 0)
    : elbowY - fontSize - 16 + (event.labelDy ?? 0);

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize,
        color: '#fff',
        letterSpacing: 2,
        filter: glow('rgba(255,255,255,0.7)', 10),
        whiteSpace: 'pre',
      }}
    >
      {visible}
    </div>
  );
};

/**
 * Elbow connector drawn on with strokeDashoffset, plus the empty
 * placeholder circle at its end.
 */
const Connector: React.FC<{event: TimelineEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - event.at - 8;

  const dir = event.side === 'up' ? -1 : 1;
  const nodeY = TIMELINE_Y + dir * 26;
  const elbowY = TIMELINE_Y + dir * CIRCLE_OFFSET_Y;
  const circleCx = event.x + CIRCLE_OFFSET_X;
  const circleCy = elbowY;

  const vertical = Math.abs(elbowY - nodeY);
  const horizontal = circleCx - CIRCLE_RADIUS - event.x;
  const totalLength = vertical + horizontal;

  const draw = interpolate(local, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const circleScale = spring({
    frame: local - 18,
    fps,
    config: {damping: 13, stiffness: 160},
    durationInFrames: 30,
  });

  if (local < 0) return null;

  const path = `M ${event.x} ${nodeY} L ${event.x} ${elbowY} L ${
    circleCx - CIRCLE_RADIUS
  } ${elbowY}`;

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        overflow: 'visible',
        filter: glow('rgba(255,255,255,0.6)', 8),
      }}
      width={SCENE_WIDTH}
      height={1080}
    >
      <path
        d={path}
        stroke="#fff"
        strokeWidth={6}
        fill="none"
        strokeDasharray={totalLength}
        strokeDashoffset={totalLength * (1 - draw)}
      />
      {local >= 18 && (
        <g
          transform={`translate(${circleCx} ${circleCy}) scale(${circleScale})`}
        >
          {/* Empty placeholder circle — drop your image inside if needed */}
          <circle
            r={CIRCLE_RADIUS}
            fill="rgba(255,255,255,0.04)"
            stroke="#fff"
            strokeWidth={6}
          />
        </g>
      )}
    </svg>
  );
};

/**
 * Photo clipped inside the circle, revealed gradually: the circular
 * mask grows from the centre while the photo fades in and settles
 * from a slight zoom.
 */
const EventImage: React.FC<{event: TimelineEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const local = frame - event.at - 8;

  if (!event.img || local < 24) return null;

  const dir = event.side === 'up' ? -1 : 1;
  const cx = event.x + CIRCLE_OFFSET_X;
  const cy = TIMELINE_Y + dir * CIRCLE_OFFSET_Y;

  const reveal = interpolate(local, [24, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(local, [24, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Photo starts zoomed in and gently settles down
  const photoScale = interpolate(local, [24, 70], [1.25, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  const maskR = (CIRCLE_RADIUS - 3) * reveal;

  return (
    <div
      style={{
        position: 'absolute',
        left: cx - maskR,
        top: cy - maskR,
        width: maskR * 2,
        height: maskR * 2,
        borderRadius: '50%',
        overflow: 'hidden',
        opacity,
      }}
    >
      <Img
        src={staticFile(event.img)}
        style={{
          position: 'absolute',
          left: maskR - (CIRCLE_RADIUS - 3),
          top: maskR - (CIRCLE_RADIUS - 3),
          width: (CIRCLE_RADIUS - 3) * 2,
          height: (CIRCLE_RADIUS - 3) * 2,
          objectFit: 'cover',
          transform: `scale(${photoScale})`,
        }}
      />
    </div>
  );
};

const YellowLine: React.FC = () => {
  const frame = useCurrentFrame();
  const tipX = tipXAt(frame);

  return (
    <div
      style={{
        position: 'absolute',
        left: LINE_START_X,
        top: TIMELINE_Y - 9,
        width: tipX - LINE_START_X,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ffe600',
        filter: glow('rgba(255,230,0,0.9)', 16),
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

export const Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const tipX = tipXAt(frame);

  // Camera zoomed in on the action, following the tip of the yellow line
  const ZOOM = 1.6;
  const halfViewW = VIEW_WIDTH / 2 / ZOOM;
  const focusX = Math.min(
    Math.max(tipX + 120, halfViewW),
    SCENE_WIDTH - halfViewW
  );
  const focusY = TIMELINE_Y;

  const fade = interpolate(
    frame,
    [0, 15, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          width: SCENE_WIDTH,
          height: 1080,
          transformOrigin: '0 0',
          transform: `translate(${VIEW_WIDTH / 2 - focusX * ZOOM}px, ${
            540 - focusY * ZOOM
          }px) scale(${ZOOM})`,
        }}
      >
        {EVENTS.map((e, i) => (
          <Connector key={`c-${i}`} event={e} />
        ))}
        {EVENTS.map((e, i) => (
          <EventImage key={`i-${i}`} event={e} />
        ))}
        <YellowLine />
        {EVENTS.map((e, i) => (
          <Node key={`n-${i}`} event={e} />
        ))}
        {EVENTS.filter((e) => e.year).map((e, i) => (
          <YearLabel key={`y-${i}`} event={e} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
