'use client';

interface BackToTopProps {
  show: boolean;
  onClick: () => void;
}

export default function BackToTop({ show, onClick }: BackToTopProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 cursor-pointer z-40 ${
        show
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      aria-label="回到頂部"
    >
      <i className="ri-arrow-up-line text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
    </button>
  );
}
