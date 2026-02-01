'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      numberKey: 'step1.number',
      icon: '🚗',
      titleKey: 'step1.title',
      subtitleKey: 'step1.subtitle',
      descriptionKey: 'step1.description',
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      image: '/images/step1-plate.png',
    },
    {
      numberKey: 'step2.number',
      icon: '💬',
      titleKey: 'step2.title',
      subtitleKey: 'step2.subtitle',
      descriptionKey: 'step2.description',
      gradient: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
      image: '/images/step2-message.png',
    },
    {
      numberKey: 'step3.number',
      icon: '✓',
      titleKey: 'step3.title',
      subtitleKey: 'step3.subtitle',
      descriptionKey: 'step3.description',
      gradient: 'from-blue-600 to-orange-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-orange-50',
      image: '/images/step3-done.png',
    },
  ];

  return (
    <section id="how-it-works" ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <h2
            className={`text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            {t('title')}
          </h2>
        </div>

        {/* Step Cards */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${300 + index * 150}ms` }}
            >
              {/* Gradient Background on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 rounded-2xl sm:rounded-3xl transition-opacity duration-500`}
              ></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <span
                    className={`text-4xl sm:text-6xl font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}
                  >
                    {t(step.numberKey)}
                  </span>
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 ${step.bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-500`}
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Step Image */}
                <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-50">
                  <Image
                    src={step.image}
                    alt={t(step.titleKey)}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {t(step.titleKey)}
                </h3>

                {/* Subtitle */}
                <p
                  className={`text-base sm:text-lg font-semibold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent mb-2 sm:mb-3`}
                >
                  {t(step.subtitleKey)}
                </p>

                {/* Divider */}
                <div
                  className={`w-12 h-1 bg-gradient-to-r ${step.gradient} rounded-full mb-3 sm:mb-4`}
                ></div>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {t(step.descriptionKey)}
                </p>
              </div>

              {/* Decorative Element */}
              <div
                className={`absolute -bottom-2 -right-2 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${step.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
              ></div>
            </div>
          ))}
        </div>

        {/* Bottom Badge */}
        <div
          className={`mt-16 sm:mt-20 text-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <i className="ri-shield-check-line text-lg sm:text-xl"></i>
            <span className="font-medium text-sm sm:text-base">{t('badge2')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
