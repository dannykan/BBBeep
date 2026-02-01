'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function UseCasesSection() {
  const t = useTranslations('useCases');
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

  const useCases = [
    {
      // Video placeholder - will be replaced with actual video
      video: '/videos/case1-thanks.mp4',
      titleKey: 'case1.title',
      descriptionKey: 'case1.description',
      tagKey: 'case1.tag',
      tagEmoji: '💙',
      tagColor: 'bg-blue-100 text-blue-700',
      placeholderEmoji: '🙏',
      placeholderBg: 'from-blue-400 to-blue-600',
    },
    {
      video: '/videos/case2-safety.mp4',
      titleKey: 'case2.title',
      descriptionKey: 'case2.description',
      tagKey: 'case2.tag',
      tagEmoji: '⚠️',
      tagColor: 'bg-orange-100 text-orange-700',
      placeholderEmoji: '🚨',
      placeholderBg: 'from-orange-400 to-orange-600',
    },
    {
      video: '/videos/case3-express.mp4',
      titleKey: 'case3.title',
      descriptionKey: 'case3.description',
      tagKey: 'case3.tag',
      tagEmoji: '😤',
      tagColor: 'bg-purple-100 text-purple-700',
      placeholderEmoji: '💬',
      placeholderBg: 'from-purple-400 to-purple-600',
    },
  ];

  return (
    <section id="use-cases" ref={sectionRef} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2
          className={`text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 text-center mb-12 sm:mb-16 transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          {t('title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              {/* Video Area */}
              <div className="relative overflow-hidden h-56 sm:h-64 w-full">
                <video
                  src={useCase.video}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4 ${useCase.tagColor}`}
                >
                  {useCase.tagEmoji} {t(useCase.tagKey)}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {t(useCase.titleKey)}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {t(useCase.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
