import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------------------------------------------------------------------------
// Scene layout
// ---------------------------------------------------------------------------

const SCENE_WIDTH = 3400;
const VIEW_WIDTH = 1920;
const TIMELINE_Y = 540;

const LINE_START_X = 120;
const LINE_END_X = 3280;

export const TIMELINE_DURATION = 360;

type Side = 'up' | 'down';

type TimelineEvent = {
  x: number;
  at: number; // frame at which the line tip arrives at this node
  year: string;
  side: Side;
};

const EVENTS: TimelineEvent[] = [
  {x: 520, at: 30, year: 'MAY 1945', side: 'up'},
  {x: 1270, at: 105, year: '', side: 'down'},
  {x: 2020, at: 180, year: '', side: 'up'},
  {x: 2770, at: 255, year: '', side: 'down'},
];

// The tip of the yellow line pauses at every node for ~1.5 s, then speeds
// off to the next one. Pairs of identical x values are the pauses.
const TIP_KEYFRAMES: {frame: number; x: number}[] = [
  {frame: 0, x: LINE_START_X},
  {frame: 30, x: 520},
  {frame: 75, x: 520},
  {frame: 105, x: 1270},
  {frame: 150, x: 1270},
  {frame: 180, x: 2020},
  {frame: 225, x: 2020},
  {frame: 255, x: 2770},
  {frame: 300, x: 2770},
  {frame: 330, x: LINE_END_X},
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
const CIRCLE_OFFSET_X = 300; // horizontal distance from node to circle centre
const CIRCLE_OFFSET_Y = 265; // vertical distance from the timeline

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
  const local = frame - event.at - 6;

  const opacity = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shift = interpolate(local, [0, 12], [24, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: event.x + 48,
        top: TIMELINE_Y - 52,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize: 84,
        color: '#fff',
        letterSpacing: 2,
        opacity,
        transform: `translateX(${shift}px)`,
        filter: glow('rgba(255,255,255,0.7)', 10),
        whiteSpace: 'nowrap',
      }}
    >
      {event.year}
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
  const ZOOM = 1.35;
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
