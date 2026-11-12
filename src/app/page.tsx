import { Nav, Silence, Tension, Chaos, Discovery, VaultSection, Calm } from "@/components/noir/Sections";
import { Choreography } from "@/components/noir/Choreography";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Silence />
        <Tension />
        <Chaos />
        <Discovery />
        <VaultSection />
      </main>
      <Calm />
      <Choreography />
    </>
  );
}
