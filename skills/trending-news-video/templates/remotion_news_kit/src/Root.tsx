import React from 'react';
import {Composition, Still} from 'remotion';
import {CoverDesign, DEFAULT_COVER} from './Cover';
import {NewsBurstVideo, NewsBurstVideoProps} from './NewsBurstVideo';

const defaultProps: NewsBurstVideoProps = {
  totalDurationSec: 56,
  cover: DEFAULT_COVER,
  cues: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still
        id="CoverStill"
        component={CoverDesign}
        width={1080}
        height={1440}
        defaultProps={{mode: '3x4', cover: DEFAULT_COVER}}
      />
      <Still
        id="Cover16x9"
        component={CoverDesign}
        width={1920}
        height={1080}
        defaultProps={{mode: '16x9', cover: DEFAULT_COVER}}
      />
      <Composition
        id="NewsBurstVideo"
        component={NewsBurstVideo}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={1680}
        defaultProps={defaultProps}
        calculateMetadata={({props}) => ({
          durationInFrames: Math.max(30, Math.round((props.totalDurationSec || 56) * 30)),
        })}
      />
      {/* 向后兼容别名 */}
      <Composition
        id="JensenHotVideo"
        component={NewsBurstVideo}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={1680}
        defaultProps={defaultProps}
        calculateMetadata={({props}) => ({
          durationInFrames: Math.max(30, Math.round((props.totalDurationSec || 56) * 30)),
        })}
      />
    </>
  );
};
