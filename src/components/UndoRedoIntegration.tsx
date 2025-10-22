import React, { useState } from 'react';
import { useNetworkUndo } from '../hooks/useNetworkUndo';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { HistoryPanel } from './HistoryPanel';
import FloatingUndoWidget from './FloatingUndoWidget';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import type { Node, Edge } from '@xyflow/react';

interface UndoRedoIntegrationProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  selectedNodes?: Node[];
  selectedEdges?: Edge[];
  onSave?: () => void;
  className?: string;
  showFloatingWidget?: boolean;
  floatingWidgetPosition?: { x: number; y: number };
}

export const UndoRedoIntegration: React.FC<UndoRedoIntegrationProps> = ({
  nodes,
  edges,
  selectedNodes = [],
  selectedEdges = [],
  onSave,
  className,
  showFloatingWidget = true,
  floatingWidgetPosition = { x: 20, y: 20 }
}) => {
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false);
  const commandsPerSecond = 0; // Placeholder for future implementation
  
  // Initialize undo/redo system
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    undoToPoint,
    getHistory,
    getHistoryInfo,
    saveProject
  } = useNetworkUndo();

  // Get history information
  const historyInfo = getHistoryInfo();
  const history = getHistory();

  // Keyboard shortcuts integration
  const keyboardShortcuts = [
    {
      key: 'z',
      ctrlKey: true,
      action: undo,
      category: 'editing',
      description: 'ยกเลิก'
    },
    {
      key: 'y',
      ctrlKey: true,
      action: redo,
      category: 'editing',
      description: 'ทำซ้ำ'
    },
    {
      key: 's',
      ctrlKey: true,
      action: onSave || (() => saveProject()),
      category: 'file',
      description: 'บันทึก'
    },
    {
      key: 'c',
      ctrlKey: true,
      action: () => {
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          //consle.log('Copy selected items:', { nodes: selectedNodes.length, edges: selectedEdges.length });
        }
      },
      category: 'editing',
      description: 'คัดลอก'
    },
    {
      key: 'v',
      ctrlKey: true,
      action: () => {
        //consle.log('Paste items');
      },
      category: 'editing',
      description: 'วาง'
    },
    {
      key: 'a',
      ctrlKey: true,
      action: () => {
        //consle.log('Select all items');
      },
      category: 'selection',
      description: 'เลือกทั้งหมด'
    },
    {
      key: 'Delete',
      action: () => {
        const selectedNodeIds = selectedNodes.map(n => n.id);
        const selectedEdgeIds = selectedEdges.map(e => e.id);
        if (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) {
          //consle.log('Delete selected items:', { nodes: selectedNodeIds.length, edges: selectedEdgeIds.length });
        }
      },
      category: 'editing',
      description: 'ลบรายการที่เลือก'
    }
  ];

  useKeyboardShortcuts(keyboardShortcuts);

  // Calculate memory usage approximation
  const memoryUsage = React.useMemo(() => {
    const nodeSize = nodes.length * 1.5;
    const edgeSize = edges.length * 0.5;
    const historySize = historyInfo.undoCount * 2;
    return nodeSize + edgeSize + historySize;
  }, [nodes.length, edges.length, historyInfo.undoCount]);

  return (
    <div className={className}>
      {/* Floating Widget */}
      {showFloatingWidget && (
        <FloatingUndoWidget
          canUndo={canUndo}
          canRedo={canRedo}
          undoCount={historyInfo.undoCount}
          redoCount={historyInfo.redoCount}
          lastCommand={historyInfo.lastCommand}
          isExecuting={historyInfo.isExecuting}
          onUndo={undo}
          onRedo={redo}
          onShowHistory={() => setHistoryPanelVisible(true)}
          initialPosition={floatingWidgetPosition}
        />
      )}

      {/* Advanced Status Indicator */}
      <div className="absolute top-4 right-4 z-40">
        <NetworkStatusIndicator
          canUndo={canUndo}
          canRedo={canRedo}
          undoCount={historyInfo.undoCount}
          redoCount={historyInfo.redoCount}
          maxHistorySize={historyInfo.stackSizes.max}
          isExecuting={historyInfo.isExecuting}
          lastCommand={historyInfo.lastCommand}
          nextCommand={historyInfo.nextCommand}
          recentCommands={historyInfo.recentCommands}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          selectedNodeCount={selectedNodes.length}
          selectedEdgeCount={selectedEdges.length}
          commandsPerSecond={commandsPerSecond}
          memoryUsage={memoryUsage}
        />
      </div>

      {/* History Panel Modal */}
      {historyPanelVisible && (
        <HistoryPanel
          undoStack={history.filter((_, index) => index < historyInfo.undoCount)}
          redoStack={history.filter((_, index) => index >= historyInfo.undoCount)}
          onUndo={undo}
          onRedo={redo}
          onUndoToIndex={undoToPoint}
          canUndo={canUndo}
          canRedo={canRedo}
          isVisible={historyPanelVisible}
          onClose={() => setHistoryPanelVisible(false)}
        />
      )}
    </div>
  );
};

export default UndoRedoIntegration;