import { useEffect } from 'react';
import type { FloatingPosition, DragOffset } from '@/types/ai-panel';

export const useFloatingNotification = (
  isDragging: boolean,
  dragOffset: DragOffset,
  setFloatingPosition: (position: FloatingPosition) => void,
  setIsDragging: (dragging: boolean) => void
) => {
  const handleMouseDown = (_e: React.MouseEvent) => {
    setIsDragging(true);
    // Note: dragOffset should be set by the parent component
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 260, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y));
      setFloatingPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
};