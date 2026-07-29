/**
 * Auth layout — shared background for all routes in (auth)/.
 * Renders a full-screen gradient with floating particle decorations.
 * The actual card is centred by a flex container.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="auth-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blurred orbs */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, hsl(255 82% 45% / 0.18) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(2px)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-5%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, hsl(280 70% 40% / 0.15) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(2px)",
        }}
      />

      {/* Page content (the card) */}
      {children}
    </div>
  );
}
