'use client';

// App Store Button
export function AppStoreButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://apps.apple.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}
    >
      {/* Apple Logo */}
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div className="flex flex-col">
        <span className="text-[10px] leading-tight">立即下載</span>
        <span className="text-lg font-semibold leading-tight">App Store</span>
      </div>
    </a>
  );
}

// Google Play Button
export function GooglePlayButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://play.google.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}
    >
      {/* Google Play Logo */}
      <svg className="w-7 h-7" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M3.609 1.814L13.792 12 3.61 22.186a2.372 2.372 0 0 1-.86-1.829V3.643c0-.685.295-1.34.859-1.83z"/>
        <path fill="#FBBC04" d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.257-2.428c.796-.454.796-1.598 0-2.052l-4.257-2.43-.001.381z"/>
        <path fill="#4285F4" d="M3.609 1.814L13.792 12l3.764-3.765L6.558.422a2.382 2.382 0 0 0-2.95 1.392z"/>
        <path fill="#34A853" d="M13.792 12L3.61 22.186a2.383 2.383 0 0 0 2.95 1.391l10.997-6.277L13.792 12z"/>
      </svg>
      <div className="flex flex-col">
        <span className="text-[10px] leading-tight">立即下載</span>
        <span className="text-lg font-semibold leading-tight">Google Play</span>
      </div>
    </a>
  );
}
