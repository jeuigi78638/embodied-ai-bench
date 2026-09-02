import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CompareWorkbench from "@/components/CompareWorkbench";
import BenchmarkSection from "@/components/BenchmarkSection";
import RadarSection from "@/components/RadarSection";
import DecisionHelper from "@/components/DecisionHelper";
import CostSection from "@/components/CostSection";
import CommunitySection from "@/components/CommunitySection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <CompareWorkbench />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bg-border to-transparent" />
      </div>
      <BenchmarkSection />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bg-border to-transparent" />
      </div>
      <RadarSection />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bg-border to-transparent" />
      </div>
      <DecisionHelper />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bg-border to-transparent" />
      </div>
      <CostSection />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-bg-border to-transparent" />
      </div>
      <CommunitySection />
      <Footer />
    </main>
  );
}
