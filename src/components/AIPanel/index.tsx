import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Activity, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Node, Edge } from '@xyflow/react';
import type { Project } from '@/types/ai-panel';

// Components
import AnalysisTab from './AnalysisTab';
import HistoryTab from './HistoryTab';
import FloatingNotification from './FloatingNotification';

// Hooks
import { useAIPanel } from '@/hooks/useAIPanel';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';

interface AIPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  currentProject: Project | null | undefined;
}

type TabType = 'analysis' | 'history';

const AIPanel: React.FC<AIPanelProps> = ({
  open,
  onClose,
  nodes,
  edges,
  currentProject
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  // Hooks
  const aiPanelState = useAIPanel(open, nodes, edges, currentProject);
  const historyState = useAnalysisHistory(currentProject, activeTab);

  // Handle tab switching
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'history') {
      historyState.loadAnalysisHistory();
    }
  };

  // Handle panel close
  const handleClose = () => {
    // ไม่ยกเลิกการวิเคราะห์เมื่อปิด modal
    // ให้การวิเคราะห์ทำงานต่อเบื้องหลัง
    onClose();
  };

  // Reset tab when panel opens
  useEffect(() => {
    if (open) {
      setActiveTab('analysis');
    }
  }, [open]);

  // Render FloatingNotification แยกจาก modal
  const renderFloatingNotification = () => (
    <FloatingNotification
      show={aiPanelState.showFloatingNotification}
      position={aiPanelState.floatingPosition}
      isDragging={aiPanelState.isDragging}
      dragOffset={aiPanelState.dragOffset}
      elapsedTime={aiPanelState.elapsedTime}
      currentProject={currentProject}
      onCancel={() => {
        if (aiPanelState.abortController) {
          aiPanelState.abortController.abort();
          aiPanelState.setShowFloatingNotification(false);
        }
      }}
      onClose={() => {
        aiPanelState.setShowFloatingNotification(false);
      }}
      onDragStart={(e) => {
        aiPanelState.setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        aiPanelState.setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }}
      onDragEnd={() => {
        aiPanelState.setIsDragging(false);
      }}
      onPositionChange={(position) => {
        aiPanelState.setFloatingPosition(position);
      }}
    />
  );

  if (!open) {
    // แสดงเฉพาะ FloatingNotification เมื่อ modal ปิด
    return renderFloatingNotification();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <div 
          className="w-full max-w-5xl h-full max-h-[750px] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Simple Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">การวิเคราะห์ AI</h2>
              {currentProject && (
                <p className="text-sm text-gray-500">{currentProject.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* AI Status */}
            <div className="flex items-center gap-2">
              {aiPanelState.aiHealth === null ? (
                <Clock className="w-4 h-4 text-gray-400 animate-spin" />
              ) : aiPanelState.aiHealth ? (
                <Activity className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {aiPanelState.aiHealth === null ? 'กำลังตรวจสอบ...' : 
                 aiPanelState.aiHealth ? 'พร้อมใช้งาน' : 'ออฟไลน์'}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleTabChange('analysis')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            การวิเคราะห์
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ประวัติ
            {historyState.analysisHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {historyState.analysisHistory.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' ? (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-hidden"
              >
                <AnalysisTab
                  nodes={nodes}
                  edges={edges}
                  currentProject={currentProject}
                  aiPanelState={aiPanelState}
                />
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <HistoryTab
                  currentProject={currentProject}
                  historyState={historyState}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>

      {/* Floating Notification - แสดงเมื่อ modal เปิดด้วย */}
      {renderFloatingNotification()}
    </>
  );
};

export default AIPanel;