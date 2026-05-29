import { TopNavBar } from "@/components/layout/TopNavBar";
import { Footer } from "@/components/layout/Footer";
import { HeroFold } from "@/components/landing/HeroFold";
import { StatBar, type StatBarStats } from "@/components/landing/StatBar";
import { LiveMarketsTicker } from "@/components/landing/LiveMarketsTicker";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TheElevenFormationScene } from "@/components/regista/the-eleven";
import { ArchitectureStack } from "@/components/landing/ArchitectureStack";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { TournamentBadge } from "@/components/wc/TournamentBadge";
import { WCStripe } from "@/components/wc/WCStripe";

const INITIAL_STATS: StatBarStats = {
  totalMarkets: null,
  activeAgents: null,
  totalVolume: { amount: null, symbol: "USDT0" },
  liveMatch: null,
};

/**
 * Landing — P22 final flow with full-bleed hero:
 *   S0  TopNavBar      fixed/overlay, transparent above-fold on dark hero
 *   S1  HeroFold       100vh Ballpit backdrop · ghost-white text on plum
 *   [WCStripe]         tri-color separator (orange · ghost · plum)
 *   S1a TournamentBadge Jun 11 – Jul 9 + USA/CAN/MEX flag chips
 *   S2  StatBar
 *   S3  LiveMarketsTicker
 *   S4  HowItWorks
 *   S5  TheEleven
 *   S6  ArchitectureStack (BracketBackdrop behind)
 *   S7  LandingCTA
 *   [WCStripe]         tri-color separator
 *   S8  Footer
 */
export default function HomePage() {
  return (
    <>
      <TopNavBar />
      <main>
        <HeroFold />
        <WCStripe />
        <TournamentBadge />
        <StatBar stats={INITIAL_STATS} />
        <LiveMarketsTicker />
        <HowItWorks />
        <TheElevenFormationScene />
        <ArchitectureStack />
        <LandingCTA />
      </main>
      <WCStripe />
      <Footer />
    </>
  );
}
