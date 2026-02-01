'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppStoreButton, GooglePlayButton } from './DownloadButtons';

export default function CTASection() {
  const t = useTranslations('cta');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <h2
          className={`text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 transition-all duration-800 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {t('title')}
        </h2>
        <p
          className={`text-lg sm:text-xl text-white/90 mb-8 sm:mb-10 transition-all duration-800 whitespace-pre-line ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {t('subtitle')}
        </p>
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <AppStoreButton />
          <GooglePlayButton />
        </div>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-0 left-0 w-72 h-72 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl"></div>
    </section>
  );
}
