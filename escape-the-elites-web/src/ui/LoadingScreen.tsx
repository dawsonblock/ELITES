import type { FC } from "react";

type Props = {
  sceneName: string;
};

export const LoadingScreen: FC<Props> = ({ sceneName }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-label">Loading</div>
      <div className="loading-scene-name">{sceneName}</div>
      <div className="loading-track">
        <div className="loading-bar" />
      </div>
    </div>
  );
};
