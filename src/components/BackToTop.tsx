import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === 'true';

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Don't render in modal mode
  if (isModal) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 z-[9999] p-3 rounded-full bg-primary backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:scale-105 hover:bg-primary/90 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-6 h-6 text-primary-foreground" />
    </button>
  );
};
