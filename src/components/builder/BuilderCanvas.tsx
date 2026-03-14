import { ReactNode, useRef } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';

interface BuilderCanvasProps {
  children: ReactNode;
}

export const BuilderCanvas = ({ children }: BuilderCanvasProps) => {
  const { viewport, viewportDimensions } = useBuilder();
  const containerRef = useRef<HTMLDivElement>(null);

  const isFullWidth = viewport === 'desktop';

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex justify-center p-4"
      style={{ background: '#14171c' }}
    >
      <div
        className="shadow-2xl transition-all duration-300 ease-out overflow-auto bg-white"
        style={
          isFullWidth
            ? { width: '100%', height: '100%' }
            : {
                width: `${viewportDimensions.width}px`,
                maxHeight: '100%',
                minHeight: `${Math.min(viewportDimensions.height, 600)}px`,
                borderRadius: '8px',
                marginTop: 'auto',
                marginBottom: 'auto',
              }
        }
      >
        {children}
      </div>
    </div>
  );
};
