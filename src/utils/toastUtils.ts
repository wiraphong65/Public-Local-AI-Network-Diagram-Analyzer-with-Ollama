import { toast } from 'sonner';

// Utility to safely convert any value to string for toast display
const sanitizeMessage = (message: any): string => {
  if (typeof message === 'string') return message;
  if (typeof message === 'object' && message !== null) {
    // Handle validation errors from FastAPI (Pydantic)
    if (Array.isArray(message)) {
      return message.map((err: any) => {
        if (typeof err === 'object' && err.msg) {
          // Handle field-specific validation errors
          const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : '';
          const fieldName = getFieldDisplayName(field);
          const errorMsg = translateValidationMessage(err.msg, fieldName);
          return fieldName ? `${fieldName}: ${errorMsg}` : errorMsg;
        }
        return typeof err === 'string' ? err : String(err);
      }).join(', ');
    }
    if (message.detail && Array.isArray(message.detail)) {
      return sanitizeMessage(message.detail);
    }
    if (message.detail) return String(message.detail);
    if (message.msg) return String(message.msg);
    if (message.message) return String(message.message);
    // Fallback for unknown objects
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
  return String(message || 'ไม่ทราบข้อผิดพลาด');
};

// Helper function to get Thai field names
const getFieldDisplayName = (field: string): string => {
  const fieldMap: Record<string, string> = {
    'email': 'อีเมล',
    'password': 'รหัสผ่าน',
    'username': 'ชื่อผู้ใช้',
    'name': 'ชื่อ',
    'description': 'คำอธิบาย',
    'current_password': 'รหัสผ่านเดิม',
    'new_password': 'รหัสผ่านใหม่',
  };
  return fieldMap[field] || field;
};

// Helper function to translate validation messages to Thai
const translateValidationMessage = (msg: string, _fieldName: string): string => {
  // Email validation errors
  if (msg.includes('value is not a valid email address')) {
    if (msg.includes('not within a valid top-level domain')) {
      return 'รูปแบบอีเมลไม่ถูกต้อง (.th, .com, .net เป็นต้น)';
    }
    return 'รูปแบบอีเมลไม่ถูกต้อง';
  }
  
  // Password validation errors
  if (msg.includes('at least') && msg.includes('characters')) {
    const match = msg.match(/at least (\d+)/);
    const minLength = match ? match[1] : '6';
    return `ต้องมีอย่างน้อย ${minLength} ตัวอักษร`;
  }
  
  // Required field errors
  if (msg.includes('field required') || msg.includes('none is not an allowed value')) {
    return 'จำเป็นต้องกรอก';
  }
  
  // String validation
  if (msg.includes('str type expected')) {
    return 'ต้องเป็นข้อความ';
  }
  
  // Default fallback
  return msg;
};

// Enhanced toast utilities with consistent styling and behavior
export const toastUtils = {
  success: (message: any, options?: any) => {
    toast.success(sanitizeMessage(message), {
      duration: 3000,
      ...options,
    });
  },

  error: (message: any, options?: any) => {
    toast.error(sanitizeMessage(message), {
      duration: 5000,
      ...options,
    });
  },

  warning: (message: any, options?: any) => {
    toast.warning(sanitizeMessage(message), {
      duration: 4000,
      ...options,
    });
  },

  info: (message: any, options?: any) => {
    toast.info(sanitizeMessage(message), {
      duration: 3000,
      ...options,
    });
  },

  loading: (message: string = 'กำลังดำเนินการ...', options?: any) => {
    return toast.loading(message, {
      ...options,
    });
  },

  // Utility for handling async operations with toast feedback
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: Error) => string);
    }
  ) => {
    toast.promise(promise, {
      loading: options.loading || 'กำลังดำเนินการ...',
      success: options.success || 'สำเร็จ',
      error: options.error || 'เกิดข้อผิดพลาด',
    });
    return promise;
  },

  // Network error specific toasts
  networkError: () => {
    toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', {
      duration: 5000,
      description: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    });
  },

  authError: () => {
    toast.error('กรุณาเข้าสู่ระบบใหม่', {
      duration: 4000,
      description: 'Session ของคุณหมดอายุแล้ว',
    });
  },

  permissionError: () => {
    toast.error('ไม่มีสิทธิ์เข้าถึง', {
      duration: 4000,
      description: 'คุณไม่มีสิทธิ์ในการทำงานนี้',
    });
  },

  validationError: (message: string) => {
    toast.error('ข้อมูลไม่ถูกต้อง', {
      duration: 4000,
      description: message,
    });
  },

  // Safe error handler for API responses
  handleApiError: (error: any, fallbackMessage: string = 'เกิดข้อผิดพลาด') => {
    const message = sanitizeMessage(error.response?.data?.detail || error.response?.data || error.message || fallbackMessage);
    toast.error(message, {
      duration: 5000,
    });
  },
};

export default toastUtils;