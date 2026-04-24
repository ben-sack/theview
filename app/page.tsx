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
      <main>
        <Hero />
        <Concept />
        <Music />
<HowAccess />
        <AccessForm />
      </main>
      <Footer />
    </>
  );
}
