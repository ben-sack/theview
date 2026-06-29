import Image from "next/image";

export default function ConfirmedPage() {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-svh bg-oxblood overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

      <div className="relative z-10 flex flex-col items-center gap-10 text-center px-6">
        <Image
          src="/logo.png"
          alt=""
          aria-hidden="true"
          width={120}
          height={90}
          className="w-16 md:w-20 h-auto select-none opacity-70"
          priority
        />

        <div className="space-y-4 max-w-sm">
          <p className="font-body text-[10px] tracking-[0.36em] uppercase text-tan/50">
            Request Received
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-ivory font-light leading-snug">
            Your request has been received.
          </h1>
          <p className="font-display italic text-cream/40 text-lg font-light leading-relaxed">
            We'll be in touch when the time is right.
          </p>
        </div>

        <a
          href="https://www.instagram.com/theview.la/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-[9px] tracking-[0.36em] uppercase text-tan/40 hover:text-tan/70 transition-colors mt-4"
        >
          Follow on Instagram
        </a>
      </div>
    </div>
  );
}
