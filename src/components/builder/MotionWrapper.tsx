import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, Variants, useInView } from 'framer-motion';

interface MotionConfig {
  effect_type: string;
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: 'load' | 'scroll' | 'hover';
  repeat?: boolean;
}

interface MotionWrapperProps {
  children: ReactNode;
  config?: MotionConfig | null;
  className?: string;
}

const getVariants = (effect: string): { initial: any; animate: any } => {
  switch (effect) {
    case 'fade-in':
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    case 'fade-up':
      return { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };
    case 'fade-down':
      return { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 } };
    case 'fade-left':
      return { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } };
    case 'fade-right':
      return { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 } };
    case 'zoom-in':
      return { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } };
    case 'zoom-out':
      return { initial: { opacity: 0, scale: 1.2 }, animate: { opacity: 1, scale: 1 } };
    case 'slide-up':
      return { initial: { y: 60, opacity: 0 }, animate: { y: 0, opacity: 1 } };
    case 'slide-down':
      return { initial: { y: -60, opacity: 0 }, animate: { y: 0, opacity: 1 } };
    case 'slide-left':
      return { initial: { x: 60, opacity: 0 }, animate: { x: 0, opacity: 1 } };
    case 'slide-right':
      return { initial: { x: -60, opacity: 0 }, animate: { x: 0, opacity: 1 } };
    case 'bounce':
      return {
        initial: { y: 40, opacity: 0 },
        animate: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.5 } },
      };
    case 'flip-x':
      return { initial: { rotateX: 90, opacity: 0 }, animate: { rotateX: 0, opacity: 1 } };
    case 'flip-y':
      return { initial: { rotateY: 90, opacity: 0 }, animate: { rotateY: 0, opacity: 1 } };
    case 'rotate':
      return { initial: { rotate: -180, opacity: 0 }, animate: { rotate: 0, opacity: 1 } };
    case 'pulse':
      return {
        initial: { scale: 1 },
        animate: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } },
      };
    case 'shake':
      return {
        initial: { x: 0 },
        animate: { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } },
      };
    default:
      return { initial: {}, animate: {} };
  }
};

const getEasing = (easing: string) => {
  switch (easing) {
    case 'ease-in': return [0.4, 0, 1, 1];
    case 'ease-out': return [0, 0, 0.2, 1];
    case 'ease-in-out': return [0.4, 0, 0.2, 1];
    case 'linear': return [0, 0, 1, 1];
    case 'spring': return undefined; // Use spring type
    default: return [0, 0, 0.2, 1];
  }
};

export const MotionWrapper = ({ children, config, className }: MotionWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: !config?.repeat, amount: 0.2 });
  const [hasAnimated, setHasAnimated] = useState(false);

  if (!config || config.effect_type === 'none') {
    return <>{children}</>;
  }

  const variants = getVariants(config.effect_type);
  const easing = getEasing(config.easing || 'ease-out');
  const trigger = config.trigger || 'scroll';

  const shouldAnimate =
    trigger === 'load' ? true :
    trigger === 'scroll' ? isInView :
    false;

  const transitionConfig: any = {
    duration: config.duration || 0.5,
    delay: config.delay || 0,
  };

  if (config.easing === 'spring') {
    transitionConfig.type = 'spring';
    transitionConfig.stiffness = 100;
    transitionConfig.damping = 15;
  } else if (easing) {
    transitionConfig.ease = easing;
  }

  if (trigger === 'hover') {
    return (
      <motion.div
        ref={ref}
        className={className}
        whileHover={variants.animate}
        transition={transitionConfig}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={variants.initial}
      animate={shouldAnimate ? variants.animate : variants.initial}
      transition={transitionConfig}
    >
      {children}
    </motion.div>
  );
};
