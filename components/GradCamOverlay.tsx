"use client";

interface GradCamOverlayProps {
  size?: number;
  x?: string;
  y?: string;
}

export default function GradCamOverlay({
  size = 80,
  x = "55%",
  y = "45%",
}: GradCamOverlayProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
      }}
    >
      <div
        className="w-full h-full rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(230,57,70,0.7) 0%, rgba(249,158,11,0.4) 40%, rgba(249,158,11,0.1) 70%, transparent 100%)",
        }}
      />
      <div className="absolute -bottom-5 right-0 bg-dark/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
        Grad-CAM
      </div>
    </div>
  );
}
