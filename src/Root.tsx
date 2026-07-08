import {Composition} from 'remotion';
import {Timeline, TIMELINE_DURATION} from './Timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Timeline"
      component={Timeline}
      durationInFrames={TIMELINE_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
