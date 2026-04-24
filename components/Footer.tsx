export function Footer() {
  return (
    <footer className="py-10 px-6 md:px-16 border-t border-rust/10 bg-espresso md:snap-start">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-cream/25 text-sm tracking-widest font-light">
          The View — Los Angeles
        </span>
        <span className="font-body text-cream/15 text-[10px] tracking-[0.28em] uppercase">
          © 2025
        </span>
        <a
          href="https://instagram.com/theview.losangeles"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-tan/30 text-[10px] tracking-[0.28em] uppercase hover:text-tan/60 transition-colors"
        >
          @theview.losangeles
        </a>
      </div>
    </footer>
  );
}
