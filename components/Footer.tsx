export function Footer() {
  return (
    <footer className="flex-none flex flex-col justify-center py-2 md:py-4 px-6 md:px-16 md:border-t md:border-rust/10 bg-espresso">
      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-0.5 md:gap-4">
        <span className="font-display text-cream/25 text-sm tracking-widest font-light text-center md:text-left">
          The View — Los Angeles
        </span>
        <span className="font-body text-cream/15 text-[10px] tracking-[0.22em] uppercase text-center">
          ClubView Records LLC · Est. 2025
        </span>
        <a
          href="mailto:info@theview.la"
          className="font-body text-tan/30 text-[10px] tracking-[0.28em] uppercase hover:text-tan/60 transition-colors"
        >
          info@theview.la
        </a>
        <a
          href="https://www.instagram.com/theview.la/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-tan/30 text-[10px] tracking-[0.28em] uppercase hover:text-tan/60 transition-colors"
        >
          theview.la
        </a>
      </div>
    </footer>
  );
}
