import { useState, useEffect, useCallback } from 'react';
import { analysisHistoryAPI } from '@/services/api';
import { toast } from 'sonner';
import type { Project, AnalysisHistoryItem } from '@/types/ai-panel';

export const useAnalysisHistory = (
  currentProject: Project | null | undefined, 
  activeTab: string
) => {
  // Core state
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal states
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AnalysisHistoryItem | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);

  // Load analysis history for current project
  const loadAnalysisHistory = useCallback(async () => {
    if (!currentProject) {
      setAnalysisHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const params = {
        limit: 100, // Increased limit for better UX
        project_id: currentProject.id
      };

      const response = await analysisHistoryAPI.getHistory(params);
      const historyData = response.data || [];
      
      // Sort by creation date (newest first)
      const sortedHistory = historyData.sort((a: AnalysisHistoryItem, b: AnalysisHistoryItem) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setAnalysisHistory(sortedHistory);
    } catch (error: any) {
      //consle.error('Error loading project history:', error);
      setAnalysisHistory([]);
      toast.error(`Failed to load history for "${currentProject.name}"`);
    } finally {
      setHistoryLoading(false);
    }
  }, [currentProject]);

  // Handle delete single item
  const handleDeleteHistoryItem = useCallback((item: AnalysisHistoryItem) => {
    setItemToDelete(item);
    setDeleteConfirmModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete || !currentProject) return;

    setDeletingId(itemToDelete.id);
    try {
      await analysisHistoryAPI.deleteById(itemToDelete.id);
      setAnalysisHistory(prev => prev.filter(item => item.id !== itemToDelete.id));
      toast.success(`ลบการวิเคราะห์จาก"${currentProject.name}"`);
    } catch (error) {
      //consle.error('Error deleting history item:', error);
      toast.error('ลบการวิเคราะห์ไม่สำเร็จ');
    } finally {
      setDeletingId(null);
      setDeleteConfirmModalOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, currentProject]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmModalOpen(false);
    setItemToDelete(null);
  }, []);

  // Handle clear all history
  const handleClearAllHistory = useCallback(async () => {
    if (!currentProject || analysisHistory.length === 0) return;

    try {
      // Delete all analyses for this project
      const deletePromises = analysisHistory.map(item => 
        analysisHistoryAPI.deleteById(item.id)
      );
      
      await Promise.all(deletePromises);

      setAnalysisHistory([]);
      setClearAllModalOpen(false);
      toast.success(`ลบประวัติทั้งหมดจาก "${currentProject.name}"`);
    } catch (error) {
      toast.error('ลบประวัติทั้งหมดไม่สำเร็จ');
    }
  }, [currentProject, analysisHistory]);

  const handleCancelClearAll = useCallback(() => {
    setClearAllModalOpen(false);
  }, []);

  // Load history when project changes or history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      loadAnalysisHistory();
    }
  }, [currentProject, activeTab, loadAnalysisHistory]);

  // Clear state when no project is selected
  useEffect(() => {
    if (!currentProject) {
      setAnalysisHistory([]);
      setDeleteConfirmModalOpen(false);
      setItemToDelete(null);
      setClearAllModalOpen(false);
    }
  }, [currentProject]);

  return {
    analysisHistory,
    historyLoading,
    deletingId,
    deleteConfirmModalOpen,
    itemToDelete,
    clearAllModalOpen,
    loadAnalysisHistory,
    handleDeleteHistoryItem,
    handleConfirmDelete,
    handleCancelDelete,
    handleClearAllHistory,
    handleCancelClearAll,
    setClearAllModalOpen
  };
};