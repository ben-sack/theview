// Cheap on-page preview of the watermark — matches the proportions the server
// uses when actually baking it into a downloaded photo (see lib/watermark-server.ts).
export function WatermarkOverlay() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/watermark-mark.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute pointer-events-none select-none"
      style={{ width: "20%", height: "auto", top: "2.5%", left: "50%", transform: "translateX(-50%)" }}
    />
  );
}
