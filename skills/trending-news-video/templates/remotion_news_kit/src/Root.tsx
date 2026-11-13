import React from 'react';
import { Composition, Still } from 'remotion';
import { CoverDesign, JensenHotVideo, SCENE_FRAMES } from './JensenVideo';

const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JensenHotVideo"
        component={JensenHotVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Still
        id="CoverStill"
        component={() => <CoverDesign isStill={true} />}
        width={1080}
        height={1920}
      />
    </>
  );
};
