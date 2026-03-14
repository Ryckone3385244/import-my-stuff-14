import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

export const AnimatedCounter = ({ value, className = '' }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Extract number from value string (e.g., "10,000+" -> 10000)
  const targetNumber = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const suffix = value.replace(/[0-9,]/g, '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          const duration = 2000; // 2 seconds
          const steps = 60;
          const increment = targetNumber / steps;
          const stepDuration = duration / steps;
          
          let currentStep = 0;
          const timer = setInterval(() => {
            currentStep++;
            if (currentStep <= steps) {
              setCount(Math.floor(increment * currentStep));
            } else {
              setCount(targetNumber);
              clearInterval(timer);
            }
          }, stepDuration);
          
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => observer.disconnect();
  }, [targetNumber, hasAnimated]);

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div ref={elementRef} className={className}>
      {formatNumber(count)}{suffix}
    </div>
  );
};
