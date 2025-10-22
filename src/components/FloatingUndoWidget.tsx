import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Undo, Redo, Settings, Eye, EyeOff, Move } from 'lucide-react';
import { cn } from '../lib/utils';

interface FloatingUndoWidgetProps {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastCommand?: string;
  isExecuting?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowHistory?: () => void;
  className?: string;
  initialPosition?: { x: number; y: number };
}

export const FloatingUndoWidget: React.FC<FloatingUndoWidgetProps> = ({
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  lastCommand,
  isExecuting = false,
  onUndo,
  onRedo,
  onShowHistory,
  className,
  initialPosition = { x: 20, y: 20 }
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!widgetRef.current) return;
    
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - 200; // Approximate widget width
      const maxY = window.innerHeight - 100; // Approximate widget height
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        title="แสดง Undo/Redo Controls"
      >
        <Eye className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-200",
        isDragging ? "cursor-grabbing shadow-xl scale-105" : "cursor-grab",
        isMinimized ? "w-auto" : "w-64",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        userSelect: 'none'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Undo/Redo
          </span>
          {isExecuting && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <EyeOff className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3 space-y-3">
          {/* Main Buttons */}
          <div className="flex gap-2">
            <Button
              variant={canUndo ? "default" : "secondary"}
              size="sm"
              onClick={onUndo}
              disabled={!canUndo || isExecuting}
              className={cn(
                "flex-1 relative transition-all duration-200",
                canUndo ? "hover:scale-105" : "opacity-50 cursor-not-allowed"
              )}
              title={canUndo ? `ยกเลิก: ${lastCommand}` : 'ไม่มีประวัติให้ยกเลิก'}
            >
              <Undo className="w-4 h-4 mr-2" />
              ยกเลิก ({undoCount})
              {isExecuting && (
                <div className="absolute inset-0 bg-blue-500/20 rounded animate-pulse" />
              )}
            </Button>

            <Button
              variant={canRedo ? "default" : "secondary"}
              size="sm"
              onClick={onRedo}
              disabled={!canRedo || isExecuting}
              className={cn(
                "flex-1 relative transition-all duration-200",
                canRedo ? "hover:scale-105" : "opacity-50 cursor-not-allowed"
              )}
              title="ทำซ้ำ"
            >
              <Redo className="w-4 h-4 mr-2" />
              ทำซ้ำ ({redoCount})
            </Button>
          </div>

          {/* Last Command Info */}
          {lastCommand && (
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
              <div className="text-gray-500 dark:text-gray-400 mb-1">คำสั่งล่าสุด:</div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                {lastCommand.length > 35 ? lastCommand.substring(0, 35) + '...' : lastCommand}
              </div>
            </div>
          )}

          {/* History Button */}
          {onShowHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowHistory}
              className="w-full text-xs"
            >
              แสดงประวัติทั้งหมด
            </Button>
          )}

          {/* Quick Stats */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
            <span>Ctrl+Z / Ctrl+Y</span>
            <span>{undoCount + redoCount} การดำเนินการ</span>
          </div>
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo || isExecuting}
            className="h-8 w-8 p-0"
            title={`ยกเลิก (${undoCount})`}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo || isExecuting}
            className="h-8 w-8 p-0"
            title={`ทำซ้ำ (${redoCount})`}
          >
            <Redo className="w-4 h-4" />
          </Button>
          {isExecuting && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingUndoWidget;