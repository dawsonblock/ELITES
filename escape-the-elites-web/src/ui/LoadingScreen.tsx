import type { FC } from "react";

type Props = {
  sceneName: string;
};

export const LoadingScreen: FC<Props> = ({ sceneName }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#020205",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "#6b6b7b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading</div>
      <div style={{ marginTop: 12, fontSize: "1.25rem", fontWeight: 600 }}>{sceneName}</div>
      <div style={{ marginTop: 24, width: 200, height: 3, background: "#1f1f28", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            width: "60%",
            height: "100%",
            background: "linear-gradient(90deg, #3b82f6, #22c55e)",
            borderRadius: 2,
            animation: "loadingPulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes loadingPulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};
