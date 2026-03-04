import Hero from "@/components/Hero";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <SocialProof />
      <CTABanner />
      <Footer />
    </div>
  );
}
