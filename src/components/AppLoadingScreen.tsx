import { useEffect, useState } from "react";

interface AppLoadingScreenProps {
  isLoading: boolean;
}

export const AppLoadingScreen = ({ isLoading }: AppLoadingScreenProps) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [forceHide, setForceHide] = useState(false);

  // Fallback timeout: hide loading screen after 5 seconds regardless of styles loading
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      console.log('[AppLoadingScreen] Fallback timeout - hiding loading screen');
      setForceHide(true);
    }, 5000);

    return () => clearTimeout(fallbackTimeout);
  }, []);

  useEffect(() => {
    if (!isLoading || forceHide) {
      setIsVisible(false);
      const timeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, forceHide]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
    </div>
  );
};
