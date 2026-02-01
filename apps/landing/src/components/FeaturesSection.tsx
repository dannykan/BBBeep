'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function FeaturesSection() {
  const t = useTranslations('features');
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

  const features = [
    {
      icon: '🕶️',
      titleKey: 'anonymous.title',
      subtitleKey: 'anonymous.subtitle',
      descriptionKey: 'anonymous.description',
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      delay: '200ms',
    },
    {
      icon: '⚡',
      titleKey: 'realtime.title',
      subtitleKey: 'realtime.subtitle',
      descriptionKey: 'realtime.description',
      gradient: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
      delay: '400ms',
    },
    {
      icon: '🕊️',
      titleKey: 'civil.title',
      subtitleKey: 'civil.subtitle',
      descriptionKey: 'civil.description',
      gradient: 'from-teal-500 to-emerald-500',
      bgColor: 'bg-teal-50',
      delay: '600ms',
    },
  ];

  return (
    <section id="features" ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <div
          className={`text-center mb-16 sm:mb-20 transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-100 hover:border-transparent hover:shadow-xl transition-[border-color,box-shadow] duration-300 ease-out ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: isVisible ? '0ms' : feature.delay,
                transitionProperty: isVisible ? 'border-color, box-shadow' : 'opacity, transform, border-color, box-shadow'
              }}
            >
              {/* Gradient Background on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl sm:rounded-3xl transition-opacity duration-300 ease-out`}
              ></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Icon */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 ${feature.bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 ease-out`}
                >
                  {feature.icon}
                </div>

                {/* Title */}
                <h3
                  className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent mb-2 sm:mb-3`}
                >
                  {t(feature.titleKey)}
                </h3>

                {/* Subtitle */}
                <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  {t(feature.subtitleKey)}
                </h4>

                {/* Divider */}
                <div
                  className={`w-12 h-1 bg-gradient-to-r ${feature.gradient} rounded-full mb-4 sm:mb-6`}
                ></div>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {t(feature.descriptionKey)}
                </p>
              </div>

              {/* Decorative Element - 移除 blur 改用較輕量的效果 */}
              <div
                className={`absolute -bottom-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${feature.gradient} rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-out`}
                style={{ filter: 'blur(40px)' }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
