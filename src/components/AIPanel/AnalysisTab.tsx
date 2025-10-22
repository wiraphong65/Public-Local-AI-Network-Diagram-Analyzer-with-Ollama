import React from 'react';
import { marked } from 'marked';
import { motion } from 'framer-motion';
import {
  Play,
  Square,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Badge import removed - not used in this component

import type { Node, Edge } from '@xyflow/react';
import type { Project } from '@/types/ai-panel';

interface AnalysisTabProps {
  nodes: Node[];
  edges: Edge[];
  currentProject: Project | null | undefined;
  aiPanelState: any;
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({
  nodes,
  edges,
  currentProject,
  aiPanelState
}) => {

  const deviceCount = nodes.length;
  const connectionCount = edges.length;
  const canAnalyze = currentProject && deviceCount > 0 && aiPanelState.aiHealth && !aiPanelState.loading;

  const formatElapsedTime = (seconds: number) => {
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} นาที`;
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-gray-100 bg-gray-50/30 p-4">
        {/* Project Info */}
        {currentProject ? (
          <Card className="p-3 mb-3 bg-white border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {currentProject.name}
                </h3>
                <p className="text-sm text-gray-500">โปรเจกต์ปัจจุบัน</p>
              </div>
            </div>

            <div className="flex gap-4 text-center">
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{deviceCount}</div>
                <div className="text-xs text-gray-500">อุปกรณ์</div>
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{connectionCount}</div>
                <div className="text-xs text-gray-500">การเชื่อมต่อ</div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-3 mb-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">ไม่ได้เลือกโปรเจกต์</span>
            </div>
          </Card>
        )}

        {/* Model Selection - Fixed to gpt-oss:20b */}
        <Card className="p-3 mb-3 bg-white border-gray-200">
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">โมเดล AI</label>
          </div>

          <div className="relative">
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 flex items-center justify-between">
              <span className="truncate">gpt-oss:latest</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              โมเดลได้รับการตั้งค่าเป็น gpt-oss:latest
            </div>
          </div>
        </Card>

        {/* Analysis Button */}
        <Card className="p-3 bg-white border-gray-200">
          {aiPanelState.loading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>กำลังวิเคราะห์... {formatElapsedTime(aiPanelState.elapsedTime)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (aiPanelState.abortController) {
                    aiPanelState.abortController.abort();
                  }
                }}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <Square className="w-4 h-4 mr-2" />
                ยกเลิก
              </Button>
            </div>
          ) : (
            <Button
              onClick={aiPanelState.handleAnalyze}
              disabled={!canAnalyze}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              เริ่มการวิเคราะห์
            </Button>
          )}

          {/* Status Messages */}
          {!currentProject && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              กรุณาเลือกโปรเจกต์
            </div>
          )}
          {currentProject && deviceCount === 0 && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              ไม่มีอุปกรณ์ให้วิเคราะห์
            </div>
          )}
          {!aiPanelState.aiHealth && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              บริการ AI ไม่พร้อมใช้งาน
            </div>
          )}
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {aiPanelState.loading ? (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <Cpu className="w-6 h-6 text-blue-600" />
              </motion.div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                กำลังวิเคราะห์เครือข่าย
              </h3>
              <p className="text-gray-600 mb-2">
                กำลังประมวลผลโครงสร้างเครือข่ายของคุณ...
              </p>
              <div className="text-sm text-gray-500 mb-3 space-y-1">
                <p>ใช้เวลาประมาณ 30-50 นาที ในการวิเคราะห์</p>
                <p>โดยผู้ใช้สามารถปิด Tab นี้ได้ การวิเคราะห์จะทำงานต่อเบื้องหลัง</p>
              </div>
              <div className="text-sm text-gray-500">
                {formatElapsedTime(aiPanelState.elapsedTime)}
              </div>
            </motion.div>
          </div>
        ) : aiPanelState.result ? (
          <div className="flex-1 flex flex-col items-center justify-start px-2 py-6 sm:px-6">
            <div className="w-full max-w-3xl">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">การวิเคราะห์เสร็จสิ้น</h3>
                </div>
                <p className="text-sm text-gray-600">ผลลัพธ์สำหรับ {currentProject?.name}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="max-h-[60vh] min-h-[200px] overflow-y-auto p-4 sm:p-6">
                  <div className="prose max-w-none text-sm text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: marked(aiPanelState.result) }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Cpu className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                พร้อมสำหรับการวิเคราะห์
              </h3>
              <p className="text-gray-600">
                คลิก "เริ่มการวิเคราะห์" เพื่อเริ่มต้น
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisTab;