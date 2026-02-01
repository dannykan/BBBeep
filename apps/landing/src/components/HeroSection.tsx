'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { AppStoreButton, GooglePlayButton } from './DownloadButtons';

// Count-up animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, start: () => setHasStarted(true) };
}

export default function HeroSection() {
  const t = useTranslations('hero');
  const navT = useTranslations('nav');
  const [isVisible, setIsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Count-up animations
  const drivers = useCountUp(250);
  const riders = useCountUp(80);
  const cyclists = useCountUp(120);
  const pedestrians = useCountUp(50);

  useEffect(() => {
    setIsVisible(true);

    // Delay starting number animations
    const timer = setTimeout(() => {
      drivers.start();
      riders.start();
      cyclists.start();
      pedestrians.start();
    }, 800);

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/images/logo.png"
                alt="UBeep Logo"
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">
                UBeep
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center">
              <a
                href="#cta"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer whitespace-nowrap"
              >
                {navT('download')}
              </a>
            </div>

            {/* Mobile Download Button */}
            <a
              href="#cta"
              className="md:hidden px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              {navT('download')}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50 pt-16 sm:pt-20">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-orange-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-blue-300/10 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              {/* Badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 rounded-full transition-all duration-800 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-5'
                }`}
              >
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                <span className="text-xs sm:text-sm font-semibold text-blue-700">
                  {t('badge')}
                </span>
              </div>

              {/* Main Title */}
              <h1
                className={`text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight transition-all duration-1000 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <span className="text-gray-900">{t('title1')}</span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-orange-500 bg-clip-text text-transparent">
                  {t('title2')}
                </span>
              </h1>

              {/* Subtitle */}
              <p
                className={`text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed transition-all duration-1000 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: '400ms' }}
              >
                {t('subtitle1')}
                <br />
                {t('subtitle2')}
              </p>

              {/* Stats */}
              <div
                className={`grid grid-cols-2 gap-3 sm:gap-4 transition-all duration-1000 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: '600ms' }}
              >
                <StatCard emoji="🚗" count={drivers.count} label={t('drivers')} bgColor="bg-blue-100" />
                <StatCard emoji="🏍️" count={riders.count} label={t('riders')} bgColor="bg-orange-100" />
                <StatCard emoji="🚴" count={cyclists.count} label={t('cyclists')} bgColor="bg-purple-100" />
                <StatCard emoji="🚶" count={pedestrians.count} label={t('pedestrians')} bgColor="bg-green-100" />
              </div>

              {/* Download Buttons */}
              <div
                className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-all duration-1000 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: '800ms' }}
              >
                <AppStoreButton />
                <GooglePlayButton />
              </div>
            </div>

            {/* Right Visual Area */}
            <div
              className={`relative transition-all duration-1000 mt-8 lg:mt-0 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              {/* Main Image */}
              <div className="relative group">
                <Image
                  src="/images/hero-intersection.jpg"
                  alt="道路俯瞰場景"
                  width={800}
                  height={900}
                  className="w-full h-auto rounded-2xl sm:rounded-3xl shadow-2xl group-hover:shadow-3xl transition-shadow duration-500"
                  priority
                />

                {/* Floating Message Bubble 1 - Thanks */}
                <div
                  className="absolute top-[18%] left-[5%] bg-white rounded-xl sm:rounded-2xl shadow-xl p-2 sm:p-4 animate-float hover:scale-110 transition-transform duration-300 cursor-pointer"
                  style={{ animationDelay: '0s' }}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg">👍</span>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">
                        感謝禮讓！
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        剛剛 • 駕駛
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Message Bubble 2 - Warning */}
                <div
                  className="absolute top-[38%] right-[3%] bg-white rounded-xl sm:rounded-2xl shadow-xl p-2 sm:p-4 animate-float hover:scale-110 transition-transform duration-300 cursor-pointer"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg">⚠️</span>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">
                        請注意安全
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        1分鐘前 • 騎士
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Message Bubble 3 - Greeting */}
                <div
                  className="absolute bottom-[25%] left-[8%] bg-white rounded-xl sm:rounded-2xl shadow-xl p-2 sm:p-4 animate-float hover:scale-110 transition-transform duration-300 cursor-pointer"
                  style={{ animationDelay: '2s' }}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg">👋</span>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-gray-900">
                        路上小心
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                        2分鐘前 • 腳踏車
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Indicator Dots */}
                <div className="absolute top-[28%] left-[35%] w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full border-2 sm:border-4 border-white shadow-lg animate-pulse hover:scale-125 transition-transform duration-300 cursor-pointer"></div>
                <div
                  className="absolute top-[48%] right-[35%] w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 rounded-full border-2 sm:border-4 border-white shadow-lg animate-pulse hover:scale-125 transition-transform duration-300 cursor-pointer"
                  style={{ animationDelay: '0.5s' }}
                ></div>
                <div
                  className="absolute bottom-[18%] left-[40%] w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-full border-2 sm:border-4 border-white shadow-lg animate-pulse hover:scale-125 transition-transform duration-300 cursor-pointer"
                  style={{ animationDelay: '1s' }}
                ></div>

              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute -bottom-8 -left-8 w-24 h-24 sm:w-32 sm:h-32 bg-orange-400/30 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: '1s' }}
              ></div>
              <div
                className="absolute top-1/2 -right-12 w-20 h-20 sm:w-24 sm:h-24 bg-purple-400/20 rounded-full blur-2xl animate-pulse"
                style={{ animationDelay: '1.5s' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-5 h-8 sm:w-6 sm:h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-1.5 sm:p-2 hover:border-blue-600 transition-colors duration-300 cursor-pointer">
            <div className="w-1 h-2 sm:w-1.5 sm:h-3 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </section>
    </>
  );
}

// Stat Card Component
function StatCard({
  emoji,
  count,
  label,
  bgColor,
}: {
  emoji: string;
  count: number;
  label: string;
  bgColor: string;
}) {
  return (
    <div className="group flex items-center gap-2 sm:gap-3 bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
      >
        {emoji}
      </div>
      <div>
        <div className="text-lg sm:text-2xl font-bold text-gray-900">
          {count}萬+
        </div>
        <div className="text-xs sm:text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}
