import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Concept } from "@/components/Concept";
import { Music } from "@/components/Music";
import { HowAccess } from "@/components/HowAccess";
import { AccessForm } from "@/components/AccessForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <div className="h-dvh overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        <main>
          <Hero />
          <Concept />
          <Music />
          <HowAccess />
        </main>
        <div className="min-h-dvh md:min-h-0 flex flex-col md:block snap-start">
          <Suspense>
            <AccessForm />
          </Suspense>
          <Footer />
        </div>
      </div>
    </>
  );
}
