import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Activity, 
  Layers, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  Zap,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NetworkStatusIndicatorProps {
  // Undo/Redo Status
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  maxHistorySize: number;
  isExecuting: boolean;
  
  // Recent Activity
  lastCommand?: string;
  nextCommand?: string;
  recentCommands: string[];
  
  // Network State
  nodeCount: number;
  edgeCount: number;
  selectedNodeCount?: number;
  selectedEdgeCount?: number;
  
  // Performance Metrics
  commandsPerSecond?: number;
  memoryUsage?: number;
  
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  maxHistorySize,
  isExecuting,
  lastCommand,
  nextCommand,
  recentCommands,
  nodeCount,
  edgeCount,
  selectedNodeCount = 0,
  selectedEdgeCount = 0,
  commandsPerSecond = 0,
  memoryUsage = 0,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const historyUsagePercent = Math.round((undoCount / maxHistorySize) * 100);
  const getHistoryColor = () => {
    if (historyUsagePercent > 80) return 'text-red-500';
    if (historyUsagePercent > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card className={cn(
      "transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      isExpanded ? "shadow-lg" : "shadow-sm",
      className
    )}>
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className={cn(
              "flex items-center gap-2",
              isExecuting ? "animate-pulse" : ""
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isExecuting ? "bg-blue-500 animate-pulse" : 
                canUndo || canRedo ? "bg-green-500" : "bg-gray-400"
              )} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isExecuting ? 'กำลังดำเนินการ' : 'พร้อมใช้งาน'}
              </span>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>{nodeCount} โหนด</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>{edgeCount} การเชื่อมต่อ</span>
              </div>
              {(selectedNodeCount > 0 || selectedEdgeCount > 0) && (
                <Badge variant="secondary" className="text-xs">
                  เลือก: {selectedNodeCount + selectedEdgeCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={canUndo ? "outline" : "ghost"}
              size="sm"
              disabled={!canUndo || isExecuting}
              className={cn(
                "relative h-8 px-2",
                !canUndo && "opacity-50 cursor-not-allowed"
              )}
              title={lastCommand ? `ยกเลิก: ${lastCommand}` : 'ไม่มีประวัติให้ยกเลิก'}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              <span className="text-xs">{undoCount}</span>
            </Button>

            <Button
              variant={canRedo ? "outline" : "ghost"}
              size="sm"
              disabled={!canRedo || isExecuting}
              className={cn(
                "relative h-8 px-2",
                !canRedo && "opacity-50 cursor-not-allowed"
              )}
              title={nextCommand ? `ทำซ้ำ: ${nextCommand}` : 'ไม่มีประวัติให้ทำซ้ำ'}
            >
              <span className="text-xs">{redoCount}</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
            {/* History Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">ประวัติการใช้งาน</span>
                <span className={getHistoryColor()}>
                  {undoCount}/{maxHistorySize} ({historyUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    historyUsagePercent > 80 ? "bg-red-500" :
                    historyUsagePercent > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${historyUsagePercent}%` }}
                />
              </div>
            </div>

            {/* Recent Commands */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>คำสั่งล่าสุด</span>
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {recentCommands.length > 0 ? (
                  recentCommands.slice(0, 3).map((cmd, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-xs px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
                        index === 0 && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      )}
                    >
                      {cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    ไม่มีคำสั่งล่าสุด
                  </div>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            {(commandsPerSecond > 0 || memoryUsage > 0) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Zap className="w-3 h-3" />
                  <span>ประสิทธิภาพ</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400">คำสั่ง/วินาที</div>
                    <div className="font-mono text-gray-700 dark:text-gray-300">
                      {commandsPerSecond.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-500 dark:text-gray-400">หน่วยความจำ</div>
                    <div className="font-mono text-gray-700 dark:text-gray-300">
                      {memoryUsage.toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                disabled={!canUndo}
              >
                <Info className="w-3 h-3 mr-1" />
                ดูประวัติทั้งหมด
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-red-600 hover:text-red-700"
                disabled={undoCount === 0}
              >
                ล้างประวัติ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkStatusIndicator;