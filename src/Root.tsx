import {Composition} from 'remotion';
import {Timeline, TIMELINE_DURATION} from './Timeline';
import {RetroTimeline, RETRO_DURATION} from './RetroTimeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Timeline"
        component={Timeline}
        durationInFrames={TIMELINE_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RetroTimeline"
        component={RetroTimeline}
        durationInFrames={RETRO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
