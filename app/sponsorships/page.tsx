"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useInView } from "@/hooks/useInView";
import { WordmarkSVG } from "@/components/WordmarkSVG";

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-body text-[10px] tracking-[0.36em] uppercase text-tan/60 ${className}`}>
      {children}
    </p>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-2">
      <p className="font-display text-3xl md:text-4xl text-cream font-light">{value}</p>
      <p className="font-body text-xs text-tan/50 leading-snug">{label}</p>
    </div>
  );
}

function ExperienceColumn({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-3">
      <Eyebrow>{title}</Eyebrow>
      <p className="font-body text-cream/55 text-sm leading-loose font-light">{text}</p>
    </div>
  );
}

function GrowthStep({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex gap-4 items-start">
      <span className="font-display text-xl text-amber/70 font-light shrink-0">{n}</span>
      <p className="font-body text-cream/55 text-sm leading-relaxed font-light">{text}</p>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-4 items-baseline border-t border-rust/10 py-4 first:border-t-0 first:pt-0">
      <span className="text-rust/50 shrink-0">—</span>
      <span className="font-body text-cream/55 text-sm leading-relaxed font-light">{children}</span>
    </li>
  );
}

export default function SponsorshipsPage() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);  // logo + tagline
    const t2 = setTimeout(() => setPhase(2), 600);  // wordmark
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const concept = useInView<HTMLElement>();
  const trackRecord = useInView<HTMLElement>();
  const experience = useInView<HTMLElement>();
  const partnership = useInView<HTMLElement>();
  const cta = useInView<HTMLElement>();

  const c = concept.inView ? "in-view" : "";
  const t = trackRecord.inView ? "in-view" : "";
  const e = experience.inView ? "in-view" : "";
  const p = partnership.inView ? "in-view" : "";
  const x = cta.inView ? "in-view" : "";

  return (
    <div className="bg-oxblood">
      {/* ── Wayfinding ── */}
      <a
        href="/"
        className="fixed top-6 left-6 z-50 font-body text-[10px] tracking-[0.28em] uppercase text-cream/40 hover:text-cream/80 transition-colors"
      >
        ← theview.la
      </a>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-28" style={{ minHeight: "100svh" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 18% 72%, rgba(140,60,24,0.28) 0%, transparent 70%), " +
              "radial-gradient(ellipse 40% 40% at 78% 25%, rgba(90,28,14,0.18) 0%, transparent 65%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espresso/50 via-transparent to-espresso/70" />

        <div className="relative z-10 flex flex-col items-center text-center gap-7 max-w-lg">
          <div
            className={`transition-all duration-1000 ${
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Image src="/logo.png" alt="" aria-hidden width={120} height={90} className="w-16 md:w-20 h-auto opacity-80" priority />
          </div>

          <div
            className={`text-center transition-all duration-1000 delay-100 ${
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Eyebrow>Los Angeles</Eyebrow>
          </div>

          <div className={`w-full max-w-[280px] md:max-w-sm transition-opacity duration-700 ${phase >= 2 ? "opacity-100" : "opacity-0"}`}>
            <WordmarkSVG animate={phase >= 2} className="w-full h-auto" />
          </div>

          <div
            className={`space-y-7 transition-all duration-1000 ${
              phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <p className="font-display italic text-cream/45 text-lg md:text-xl font-light">
              A gathering. By invitation.
            </p>

            <div className="section-rule mx-auto" />

            <div className="space-y-2">
              <p className="font-body text-[10px] tracking-[0.3em] uppercase text-amber/70">
                Sponsorship Partnership — Santa Monica, CA
              </p>
              <p className="font-body text-cream/50 text-sm">
                Opening Saturday, August 15, 2026
              </p>
            </div>
          </div>
        </div>

        <p className="absolute bottom-8 font-body text-[9px] tracking-[0.28em] uppercase text-tan/30">
          ClubView Records LLC · Est. 2025
        </p>
      </section>

      {/* ── THE CONCEPT & THE AUDIENCE ── */}
      <section ref={concept.ref} className="px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-rust/10">
        <div className="max-w-3xl mx-auto">
          <Eyebrow className={`reveal ${c}`}>The Concept &amp; The Audience</Eyebrow>

          <div className={`mt-6 space-y-2 reveal reveal-d1 ${c}`}>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.25]">
              A recurring evening, built around music.
            </h2>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream/55 font-light leading-[1.25] italic">
              Kept small. Kept curated.
            </h2>
          </div>

          <p className={`mt-8 font-body text-cream/55 text-base md:text-lg leading-loose font-light max-w-xl reveal reveal-d2 ${c}`}>
            The View is a private, invitation-based event community based in Los Angeles. Hosted
            in intimate spaces, entered by introduction, and shaped around a single point of view
            each night — one arc of sound, one room.
          </p>

          <blockquote className={`mt-8 border-l-2 border-rust/40 pl-5 reveal reveal-d3 ${c}`}>
            <p className="font-display italic text-cream/60 text-xl md:text-2xl font-light leading-snug">
              "The crowd is curated. The nights are hard to forget."
            </p>
          </blockquote>

          <div className={`mt-16 reveal reveal-d4 ${c}`}>
            <Eyebrow className="mb-2">Who's in the Room</Eyebrow>
            <ul className="mt-4">
              <ListItem>
                Ages 24–35 — young professionals and artists, largely music-industry and adjacent
                creative circles
              </ListItem>
              <ListItem>
                Drawn from ClubView Records' existing community: the Wurstkuche residency and
                Santa Monica Warehouse events
              </ListItem>
              <ListItem>
                Entry by private invitation and member approval only — not a public draw
              </ListItem>
            </ul>
          </div>
        </div>
      </section>

      {/* ── TRACK RECORD & THE VENUE ── */}
      <section ref={trackRecord.ref} className="px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-rust/10">
        <div className="max-w-3xl mx-auto">
          <Eyebrow className={`reveal ${t}`}>Track Record &amp; The Venue</Eyebrow>

          <div className={`mt-6 space-y-2 reveal reveal-d1 ${t}`}>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.25]">
              A staple of the Westside scene,
            </h2>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream/55 font-light leading-[1.25] italic">
              now opening its own room.
            </h2>
          </div>

          <div className={`mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 reveal reveal-d2 ${t}`}>
            <StatTile value="25+" label="Events on the Westside" />
            <StatTile value="$100–150K" label="Annual event revenue" />
            <StatTile value="350" label="Tickets sold monthly at Wurstkuche" />
            <StatTile value="45" label="Releases, 500K+ streams" />
          </div>

          <div className={`mt-16 space-y-6 reveal reveal-d3 ${t}`}>
            <Eyebrow>The Former — ClubView Records 2023–Present</Eyebrow>
            <p className="font-body text-cream/55 text-base leading-loose font-light">
              ClubView Records has established its presence in the West LA scene for the last
              three years throwing 25+ events across multiple venues on the west side of Los
              Angeles, including a solidified monthly residency at Wurstküche bringing in
              high-profile DJs from across the world. Our residency is sold out every single
              month and is quickly becoming a niche of its own among Santa Monica/Venice locals.
              With a mailing list of over 3,500 dedicated fans and attendees, ClubView Records is
              quickly becoming a staple of the Los Angeles dance music community.
            </p>
            <p className="font-body text-cream/40 text-sm leading-loose font-light">
              This is our next step. The View introduces our first ever space completely
              conceptualized by the founders of ClubView for the closer members of our
              community, encompassing young professionals, artists, and visionaries within our
              inner circle.
            </p>
          </div>
        </div>
      </section>

      {/* ── THE EXPERIENCE ── */}
      <section ref={experience.ref} className="px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-rust/10">
        <div className="max-w-3xl mx-auto">
          <Eyebrow className={`reveal ${e}`}>The Experience</Eyebrow>

          <div className={`mt-6 reveal reveal-d1 ${e}`}>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.25]">
              Private entry. Curated sound.
              <br />
              A considered bar.
            </h2>
          </div>

          <div className={`mt-14 grid md:grid-cols-3 gap-10 reveal reveal-d2 ${e}`}>
            <ExperienceColumn
              title="Entry"
              text="Most guests arrive by introduction — someone in the community vouches for them. Membership is free at launch, to build demand before any paywall. Comparable model: The Living Room (Hollywood), a private members-only listening lounge — The View brings that concept to the Westside, without the Living Room's upfront investment."
            />
            <ExperienceColumn
              title="Music"
              text="House music from the Los Angeles scene — local selectors, label signees, and resident DJs from the ClubView circle."
            />
            <ExperienceColumn
              title="Bar"
              text="Cocktail-forward menu, $18–24. A small, tightly curated beer and soft drink selection. No wine program yet — open to the right partner."
            />
          </div>
        </div>
      </section>

      {/* ── PARTNERSHIP ── */}
      <section ref={partnership.ref} className="px-6 md:px-16 lg:px-24 py-24 md:py-32 border-t border-rust/10">
        <div className="max-w-3xl mx-auto">
          <Eyebrow className={`reveal ${p}`}>Partnership</Eyebrow>

          <div className={`mt-6 reveal reveal-d1 ${p}`}>
            <h2 className="font-display text-[1.75rem] md:text-[2.25rem] text-cream font-light leading-[1.25] italic">
              A small trade in, with room to grow.
            </h2>
          </div>

          <div className={`mt-14 grid md:grid-cols-2 gap-12 reveal reveal-d2 ${p}`}>
            <div className="space-y-3">
              <Eyebrow>What We Need</Eyebrow>
              <p className="font-body text-cream/55 text-sm leading-loose font-light">
                In-kind product only — roughly 150–200 units of beer per monthly event
                to start. No cash sponsorship required. As The View scales toward a full liquor
                license and a weekly Friday/Saturday bar, product needs scale with it.
              </p>
            </div>
            <div className="space-y-3">
              <Eyebrow>What Else We Can Offer</Eyebrow>
              <ul>
                <ListItem>Menu exclusivity — the only beer</ListItem>
                <ListItem>Category exclusivity across our events</ListItem>
                <ListItem>
                  A relationship with The View from day one, ahead of any future formal tiers
                </ListItem>
              </ul>
            </div>
          </div>

          <div className={`mt-16 reveal reveal-d3 ${p}`}>
            <Eyebrow className="mb-8">Growth Trajectory</Eyebrow>
            <div className="grid md:grid-cols-3 gap-8">
              <GrowthStep n="1" text="Now — monthly private events, 150-cap" />
              <GrowthStep n="2" text="Increased frequency of exclusive events" />
              <GrowthStep n="3" text="Full license — open Fri &amp; Sat, every weekend" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSING / CTA ── */}
      <section
        ref={cta.ref}
        className="relative flex flex-col items-center justify-center text-center overflow-hidden px-6 py-28 border-t border-rust/10"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 82% 30%, rgba(140,60,24,0.24) 0%, transparent 70%), " +
              "radial-gradient(ellipse 40% 40% at 15% 75%, rgba(90,28,14,0.16) 0%, transparent 65%)",
          }}
        />

        <div className={`relative z-10 flex flex-col items-center gap-8 reveal ${x}`}>
          <h2 className="font-display italic text-3xl md:text-5xl text-cream font-light">
            Let's build something together.
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
            <a
              href="mailto:info@theview.la"
              className="font-body text-[11px] tracking-[0.25em] uppercase text-tan/60 hover:text-tan transition-colors"
            >
              Email — info@theview.la
            </a>
            <a
              href="https://theview.la"
              className="font-body text-[11px] tracking-[0.25em] uppercase text-tan/60 hover:text-tan transition-colors"
            >
              Web — theview.la
            </a>
            <a
              href="https://www.instagram.com/theview.la/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-[11px] tracking-[0.25em] uppercase text-tan/60 hover:text-tan transition-colors"
            >
              Instagram — @theview.la
            </a>
          </div>

          <p className="mt-4 font-body text-[9px] tracking-[0.28em] uppercase text-tan/30">
            ClubView Records LLC · Est. 2025
          </p>
        </div>
      </section>
    </div>
  );
}
