'use client';

import { useEffect, useState } from 'react';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import UseCasesSection from '@/components/UseCasesSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

export default function HomePage() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <CTASection />
      <Footer />
      <BackToTop show={showBackToTop} onClick={scrollToTop} />
    </div>
  );
}
