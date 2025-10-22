import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Undo, Redo, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryItem {
  description: string;
  timestamp: number;
  type: string;
}

interface HistoryPanelProps {
  undoStack: any[];
  redoStack: any[];
  onUndo: () => void;
  onRedo: () => void;
  onUndoToIndex?: (index: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  isVisible: boolean;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onUndoToIndex,
  canUndo,
  canRedo,
  isVisible,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Convert command stacks to history items with timestamps
  const undoItems: HistoryItem[] = undoStack.map((cmd, index) => ({
    description: cmd.getDescription(),
    timestamp: Date.now() - (undoStack.length - index) * 1000, // Simulate timestamps
    type: cmd.getType()
  }));

  const redoItems: HistoryItem[] = redoStack.map((cmd, index) => ({
    description: cmd.getDescription(),
    timestamp: Date.now() + (index + 1) * 1000, // Future timestamps for redo
    type: cmd.getType()
  }));

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 0) return `${seconds}s ago`;
    return 'Just now';
  };

  const getCommandIcon = (type: string) => {
    switch (type) {
      case 'ADD_NODE': return '➕';
      case 'DELETE_NODE': return '🗑️';
      case 'MOVE_NODE': return '↔️';
      case 'UPDATE_NODE': return '✏️';
      case 'ADD_EDGE': return '🔗';
      case 'DELETE_EDGE': return '❌';
      case 'UPDATE_EDGE': return '🔧';
      case 'BATCH': return '📦';
      default: return '⚡';
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed right-4 top-20 w-80 max-h-[70vh] z-50"
    >
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              History ({undoStack.length + redoStack.length})
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex-1 text-xs"
            >
              <Undo className="w-3 h-3 mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex-1 text-xs"
            >
              <Redo className="w-3 h-3 mr-1" />
              Redo
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0">
                <ScrollArea className="h-96">
                  <div className="space-y-1">
                    {/* Current state indicator */}
                    <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-md text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-700">Current State</span>
                      <Clock className="w-3 h-3 text-blue-500 ml-auto" />
                    </div>

                    {/* Redo items (future actions) */}
                    {redoItems.reverse().map((item, index) => (
                      <motion.div
                        key={`redo-${index}`}
                        className="flex items-center gap-2 py-2 px-3 rounded-md bg-gray-50 opacity-60 text-sm cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          for (let i = 0; i <= redoStack.length - 1 - index; i++) {
                            onRedo();
                          }
                        }}
                      >
                        <span className="text-lg">{getCommandIcon(item.type)}</span>
                        <div className="flex-1">
                          <div className="text-gray-600">{item.description}</div>
                          <div className="text-xs text-gray-400">Click to redo to here</div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Undo items (past actions) */}
                    {undoItems.reverse().map((item, index) => (
                      <motion.div
                        key={`undo-${index}`}
                        className="flex items-center gap-2 py-2 px-3 rounded-md bg-white border text-sm cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (onUndoToIndex) {
                            onUndoToIndex(undoStack.length - 1 - index);
                          } else {
                            for (let i = 0; i <= index; i++) {
                              onUndo();
                            }
                          }
                        }}
                      >
                        <span className="text-lg">{getCommandIcon(item.type)}</span>
                        <div className="flex-1">
                          <div className="text-gray-700">{item.description}</div>
                          <div className="text-xs text-gray-400">{formatTime(item.timestamp)}</div>
                        </div>
                      </motion.div>
                    ))}

                    {undoStack.length === 0 && redoStack.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No history available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// History Toggle Button Component
export const HistoryToggleButton: React.FC<{
  onClick: () => void;
  hasHistory: boolean;
  undoCount: number;
  redoCount: number;
}> = ({ onClick, hasHistory, undoCount, redoCount }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="relative"
      disabled={!hasHistory}
    >
      <History className="w-4 h-4 mr-1" />
      History
      {hasHistory && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
          {undoCount + redoCount}
        </span>
      )}
    </Button>
  );
};