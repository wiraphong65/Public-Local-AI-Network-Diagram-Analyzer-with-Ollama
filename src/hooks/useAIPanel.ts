import { useState, useEffect, useCallback } from 'react';
import { aiAPI } from '@/services/api';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';
import type { Project, FloatingPosition, DragOffset } from '@/types/ai-panel';

export const useAIPanel = (
  open: boolean,
  nodes: Node[],
  edges: Edge[],
  currentProject: Project | null | undefined
) => {
  // Core analysis state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aiHealth, setAiHealth] = useState<boolean | null>(null);

  // Fixed model state
  const currentModel = 'gpt-oss:latest'; // Fixed model, cannot be changed

  // Analysis control
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Network status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Floating notification state
  const [showFloatingNotification, setShowFloatingNotification] = useState(false);
  const [floatingPosition, setFloatingPosition] = useState<FloatingPosition>({ 
    x: window.innerWidth - 260, // Updated for smaller notification
    y: 80 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  // Project context tracking
  const [previousProjectId, setPreviousProjectId] = useState<number | null>(null);

  // AI Health Check
  const checkAIHealth = useCallback(async () => {
    try {
      const response = await aiAPI.checkHealth();
      setAiHealth(response.data.ollama_connected);
      // Model is fixed, no need to update currentModel state
    } catch (error) {
      setAiHealth(false);
      //consle.error('AI health check failed:', error);
    }
  }, []);



  // Handle Analysis
  const handleAnalyze = useCallback(async () => {
    if (!currentProject) {
      toast.error('กรุณาเลือกโปรเจกต์ก่อนทำการวิเคราะห์');
      return;
    }

    if (nodes.length === 0) {
      toast.error('ไม่มีอุปกรณ์ให้วิเคราะห์');
      return;
    }

    if (!aiHealth) {
      toast.error('บริการ AI ไม่พร้อมใช้งาน');
      return;
    }

    setLoading(true);
    setResult(null);
    const startTime = new Date();
    setAnalysisStartTime(startTime);

    const controller = new AbortController();
    setAbortController(controller);

    // Show floating notification
    setShowFloatingNotification(true);

    try {
      const response = await aiAPI.analyzeEnhanced({
        nodes,
        edges,
        project_id: currentProject.id
      }, controller.signal);

      if (controller.signal.aborted) {
        setShowFloatingNotification(false);
        return;
      }

      setResult(response.data.analysis);

      // Calculate analysis duration
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      const minutes = duration / 60;
      const durationText = `${minutes.toFixed(2)} นาที`;

      // Hide floating notification and show success toast
      setShowFloatingNotification(false);
      toast.success(`การวิเคราะห์เสร็จสิ้น (${durationText}) - ${currentProject.name}`, {
        position: 'bottom-right',
        duration: 5000,
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        setShowFloatingNotification(false);
        return;
      }

      //consle.error('การวิเคราะห์ล้มเหลว:', error);
      const errorMessage = error.response?.data?.detail || 'การวิเคราะห์ AI ล้มเหลว';
      setResult(`Error: ${errorMessage}`);

      // Calculate analysis duration for error case
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      const minutes = duration / 60;
      const durationText = `${minutes.toFixed(2)} นาที`;

      // Hide floating notification and show error toast
      setShowFloatingNotification(false);
      toast.error(`การวิเคราะห์ล้มเหลว (${durationText}) - ${currentProject.name}`, {
        position: 'bottom-right',
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setAbortController(null);
      setAnalysisStartTime(null);
      setElapsedTime(0);
    }
  }, [currentProject, nodes, edges, aiHealth]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && analysisStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - analysisStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, analysisStartTime]);

  // Initialize AI health when panel opens
  useEffect(() => {
    if (open) {
      checkAIHealth();
    }
  }, [open, checkAIHealth]);

  // Handle project context changes
  useEffect(() => {
    const currentProjectId = currentProject?.id || null;

    if (previousProjectId !== currentProjectId) {
      // Clear previous results when switching projects
      if (previousProjectId !== null && currentProjectId !== previousProjectId) {
        setResult(null);
      }

      // Cancel ongoing analysis when switching projects
      if (loading && abortController) {
        abortController.abort();
        setLoading(false);
        setAbortController(null);
        setAnalysisStartTime(null);
        setElapsedTime(0);
        setShowFloatingNotification(false);
        toast.info('Analysis cancelled due to project change');
      }

      setPreviousProjectId(currentProjectId);
    }
  }, [currentProject, previousProjectId, loading, abortController]);

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    // Core states
    loading,
    result,
    aiHealth,
    isOnline,
    
    // Fixed model state
    currentModel, 
    
    // Analysis control
    abortController,
    analysisStartTime,
    elapsedTime,
    
    // Floating notification
    showFloatingNotification,
    floatingPosition,
    isDragging,
    dragOffset,
    
    // Setters
    setLoading,
    setResult,
    setAiHealth,
    setAbortController,
    setAnalysisStartTime,
    setElapsedTime,
    setShowFloatingNotification,
    setFloatingPosition,
    setIsDragging,
    setDragOffset,
    
    // Functions
    checkAIHealth,
    handleAnalyze
  };
};