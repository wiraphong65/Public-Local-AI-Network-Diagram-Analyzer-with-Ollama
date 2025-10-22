import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Cpu, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Project, FloatingPosition, DragOffset } from '@/types/ai-panel';

interface FloatingNotificationProps {
  show: boolean;
  position: FloatingPosition;
  isDragging: boolean;
  dragOffset: DragOffset;
  elapsedTime: number;
  currentProject: Project | null | undefined;
  onCancel: () => void;
  onClose: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
  onPositionChange: (position: FloatingPosition) => void;
}

const FloatingNotification: React.FC<FloatingNotificationProps> = ({
  show,
  position,
  isDragging,
  dragOffset,
  elapsedTime,
  currentProject,
  onCancel,
  onClose,
  onDragStart,
  onDragEnd,
  onPositionChange
}) => {
  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };

      // Keep within viewport bounds
      const maxX = window.innerWidth - 240; // Updated for smaller width (w-56)
      const maxY = window.innerHeight - 100; // Updated for smaller height
      
      newPosition.x = Math.max(0, Math.min(maxX, newPosition.x));
      newPosition.y = Math.max(0, Math.min(maxY, newPosition.y));

      onPositionChange(newPosition);
    };

    const handleMouseUp = () => {
      onDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange, onDragEnd]);

  const formatElapsedTime = (seconds: number) => {
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} นาที`;
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className="select-none"
    >
      <Card className="w-56 bg-white shadow-lg border border-gray-200">
        {/* Header - Draggable */}
        <div
          className="p-3 border-b border-gray-100 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <Cpu className="w-3 h-3 text-blue-600" />
              </motion.div>
              <div>
                <h4 className="font-medium text-xs text-gray-900">การวิเคราะห์ AI</h4>
                <p className="text-xs text-gray-500">กำลังประมวลผล...</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-5 w-5 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {currentProject && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-900 truncate">
                {currentProject.name}
              </div>
            </div>
          )}

          <div className="mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-700">
                {formatElapsedTime(elapsedTime)}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="w-full text-red-600 hover:text-red-700 h-7 text-xs"
          >
            <Square className="w-3 h-3 mr-1" />
            ยกเลิก
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default FloatingNotification;