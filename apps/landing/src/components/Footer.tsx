'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { AppStoreButton, GooglePlayButton } from './DownloadButtons';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-3 gap-10 sm:gap-12 mb-10 sm:mb-12">
          {/* Column 1: Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/logo.png"
                alt="UBeep Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold">UBeep</span>
            </div>
            <p className="text-white/80 mb-6 leading-relaxed text-sm sm:text-base">
              {t('description')}
            </p>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-300 cursor-pointer"
                aria-label="Facebook"
              >
                <i className="ri-facebook-fill text-xl"></i>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-300 cursor-pointer"
                aria-label="Twitter"
              >
                <i className="ri-twitter-x-fill text-xl"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-300 cursor-pointer"
                aria-label="Instagram"
              >
                <i className="ri-instagram-fill text-xl"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-4">{t('company')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-white/80 hover:text-white transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                >
                  {t('features')}
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-white/80 hover:text-white transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                >
                  {t('aboutUs')}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/80 hover:text-white transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                >
                  {t('privacyPolicy')}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-white/80 hover:text-white transition-colors duration-300 cursor-pointer text-sm sm:text-base"
                >
                  {t('terms')}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-4">{t('contact')}</h3>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <i className="ri-mail-line text-xl"></i>
                <div>
                  <div className="text-xs sm:text-sm text-white/60">{t('email')}</div>
                  <a
                    href="mailto:support@ubeep.app"
                    className="text-white hover:underline cursor-pointer text-sm sm:text-base"
                  >
                    support@ubeep.app
                  </a>
                </div>
              </div>
            </div>
            <h4 className="font-semibold mb-3 text-sm sm:text-base">{t('download')}</h4>
            <div className="flex flex-col gap-2">
              <AppStoreButton className="text-sm py-2 px-3" />
              <GooglePlayButton className="text-sm py-2 px-3" />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 pt-6 sm:pt-8 text-center">
          <p className="text-white/60 mb-2 text-sm">{t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
