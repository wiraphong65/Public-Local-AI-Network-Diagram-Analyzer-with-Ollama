import React from 'react';
import { marked } from 'marked';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDate } from '@/utils/ai-panel-utils';

interface AnalysisResultModalProps {
  open: boolean;
  onClose: () => void;
  result: string;
  metadata?: {
    created_at: string;
    model_used: string;
    total_device_count: number;  // Updated from device_count
    execution_time_seconds?: number;
  };
}

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  open,
  onClose,
  result,
  metadata,
}) => {
  const copyToClipboardFallback = (text: string) => {
    // Fallback method using deprecated document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result);
        toast.success('คัดลอกไปยัง clipboard แล้ว');
      } else {
        // Fallback to older method
        const success = copyToClipboardFallback(result);
        if (success) {
          toast.success('คัดลอกไปยัง clipboard แล้ว');
        } else {
          throw new Error('คัดลอกไม่สำเร็จ');
        }
      }
    } catch (error) {
      //consle.error('Error copying to clipboard:', error);
      toast.error('เกิดข้อผิดพลาดในการคัดลอก');
    }
  };



  const formatElapsedTime = (seconds: number) => {
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} นาที`;
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Modal */}
          <motion.div
            className="relative w-full max-w-4xl h-[90vh] bg-white border border-gray-200 shadow-xl rounded-2xl flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.18 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">ผลการวิเคราะห์</h2>
                  {metadata && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(metadata.created_at)}</span>
                      <span>{metadata.model_used}</span>
                      <span>{metadata.total_device_count} อุปกรณ์</span>
                      {metadata.execution_time_seconds && (
                        <span>เวลา: {formatElapsedTime(metadata.execution_time_seconds)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  คัดลอก
                </Button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-start px-2 py-6 sm:px-6">
              <div className="w-full max-w-3xl">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="max-h-[60vh] min-h-[200px] overflow-y-auto p-4 sm:p-6">
                    <div
                      className="prose max-w-none text-gray-900 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: marked(result) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex justify-end">
                <Button onClick={onClose} className="bg-blue-600 text-white hover:bg-blue-700">
                  ปิด
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnalysisResultModal;