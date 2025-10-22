import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisHistoryAPI } from '@/services/api';
import AnalysisResultModal from './AnalysisResultModal';
import { toast } from 'sonner';

interface AnalysisHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

interface HistoryItem {
  id: number;
  created_at: string;
  model_used: string;
  total_device_count: number;  // Updated from device_count
  analysis_result: string;
  execution_time_seconds?: number;
}

const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  open,
  onClose,
}) => {
  const [analysisHistory, setAnalysisHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Result modal states
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [selectedMetadata, setSelectedMetadata] = useState<any>(null);

  // โหลดประวัติจาก database
  const loadAnalysisHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await analysisHistoryAPI.getHistory({ limit: 50 });
      setAnalysisHistory(response.data);
    } catch (error) {
      //consle.error('Error loading history:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดประวัติ');
    } finally {
      setHistoryLoading(false);
    }
  };

  // โหลดประวัติเมื่อเปิด modal
  useEffect(() => {
    if (open) {
      loadAnalysisHistory();
    }
  }, [open]);

  const handleClearHistory = async () => {
    try {
      await analysisHistoryAPI.clearAll();
      setAnalysisHistory([]);
      toast.success('ล้างประวัติเรียบร้อยแล้ว');
    } catch (error) {
      //consle.error('Error clearing history:', error);
      toast.error('เกิดข้อผิดพลาดในการล้างประวัติ');
    }
  };

  const handleDeleteItem = async (id: number) => {
    setDeletingId(id);
    try {
      await analysisHistoryAPI.deleteById(id);
      setAnalysisHistory(prev => prev.filter(item => item.id !== id));
      toast.success('ลบประวัติเรียบร้อยแล้ว');
    } catch (error) {
      //consle.error('Error deleting history item:', error);
      toast.error('เกิดข้อผิดพลาดในการลบประวัติ');
    } finally {
      setDeletingId(null);
    }
  };

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

  const handleCopyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success('คัดลอกไปยัง clipboard แล้ว');
      } else {
        // Fallback to older method
        const success = copyToClipboardFallback(text);
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

  const handleViewHistoryItem = (item: HistoryItem) => {
    setSelectedResult(item.analysis_result);
    setSelectedMetadata({
      created_at: item.created_at,
      model_used: item.model_used,
      device_count: item.total_device_count,
      execution_time_seconds: item.execution_time_seconds
    });
    setResultModalOpen(true);
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
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
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">ประวัติการวิเคราะห์</h2>
                  <p className="text-sm text-gray-500">
                    {analysisHistory.length > 0 
                      ? `มีประวัติทั้งหมด ${analysisHistory.length} รายการ`
                      : 'ยังไม่มีประวัติการวิเคราะห์'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {analysisHistory.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearHistory}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    ล้างประวัติ
                  </Button>
                )}
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
            <div className="flex-1 overflow-y-auto bg-white p-6">
              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
                  <p className="text-sm text-gray-500">กำลังโหลดประวัติ...</p>
                </div>
              ) : analysisHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm">ยังไม่มีประวัติการวิเคราะห์</p>
                  <p className="text-xs text-gray-400 mt-1">เริ่มวิเคราะห์แผนผังเครือข่ายเพื่อสร้างประวัติ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              การวิเคราะห์เครือข่าย
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {item.total_device_count} อุปกรณ์
                          </div>
                          <div className="text-xs text-blue-600">
                            {item.model_used}
                          </div>
                          {item.execution_time_seconds && (
                            <div className="text-xs text-gray-400">
                              {formatElapsedTime(item.execution_time_seconds)}
                            </div>
                          )}
                        </div>
                      </div>
                      

                      
                      {/* Preview */}
                      <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {item.analysis_result.substring(0, 150)}...
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleViewHistoryItem(item)}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            ดู
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyToClipboard(item.analysis_result)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            คัดลอก
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {deletingId === item.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent mr-1" />
                          ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          ลบ
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Analysis Result Modal */}
      <AnalysisResultModal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        result={selectedResult}
        metadata={selectedMetadata}
      />
    </AnimatePresence>
  );
};

export default AnalysisHistoryModal;