import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  defaultMessage?: string;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { showToast = true, defaultMessage = 'เกิดข้อผิดพลาดที่ไม่คาดคิด' } = options;

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const finalMessage = customMessage || defaultMessage;

    setError(error instanceof Error ? error : new Error(errorMessage));

    if (showToast) {
      // Check if it's a network error
      if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        toast.error('กรุณาเข้าสู่ระบบใหม่');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        toast.error('ไม่พบข้อมูลที่ต้องการ');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        toast.error('เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
      } else {
        toast.error(finalMessage);
      }
    }

    //consle.error('Error caught by useErrorHandler:', error);
  }, [showToast, defaultMessage]);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    customMessage?: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await asyncFn();
      return result;
    } catch (error) {
      handleError(error, customMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    handleError,
    executeAsync,
    clearError,
  };
};

export default useErrorHandler;