import { z } from 'zod';

// User input validation schemas
export const userValidationSchemas = {
  // Email validation
  email: z.string()
    .email('รูปแบบอีเมลไม่ถูกต้อง')
    .min(5, 'อีเมลต้องมีความยาวอย่างน้อย 5 ตัวอักษร')
    .max(100, 'อีเมลต้องมีความยาวไม่เกิน 100 ตัวอักษร'),
  
  // Username validation
  username: z.string()
    .min(3, 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร')
    .max(30, 'ชื่อผู้ใช้ต้องมีความยาวไม่เกิน 30 ตัวอักษร')
    .regex(/^[a-zA-Z0-9_]+$/, 'ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข และ _ เท่านั้น'),
  
  // Password validation
  password: z.string()
    .min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
    .max(100, 'รหัสผ่านต้องมีความยาวไม่เกิน 100 ตัวอักษร')
    .regex(/(?=.*[a-z])/, 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/(?=.*[A-Z])/, 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/(?=.*[0-9])/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
  
  // Project name validation
  projectName: z.string()
    .min(1, 'ชื่อโปรเจกต์ไม่สามารถว่างได้')
    .max(100, 'ชื่อโปรเจกต์ต้องมีความยาวไม่เกิน 100 ตัวอักษร')
    .regex(/^[a-zA-Z0-9ก-๙\s\-_()[\]{}.,!?]+$/, 'ชื่อโปรเจกต์มีตัวอักษรที่ไม่อนุญาต'),
  
  // Project description validation
  projectDescription: z.string()
    .max(500, 'คำอธิบายโปรเจกต์ต้องมีความยาวไม่เกิน 500 ตัวอักษร')
    .optional(),
  
  // Device name validation
  deviceName: z.string()
    .min(1, 'ชื่ออุปกรณ์ไม่สามารถว่างได้')
    .max(50, 'ชื่ออุปกรณ์ต้องมีความยาวไม่เกิน 50 ตัวอักษร')
    .regex(/^[a-zA-Z0-9ก-๙\s\-_.]+$/, 'ชื่ออุปกรณ์มีตัวอักษรที่ไม่อนุญาต'),
  
  // Network values validation
  bandwidth: z.string()
    .regex(/^[0-9]+(\.[0-9]+)?$/, 'ค่า Bandwidth ต้องเป็นตัวเลขเท่านั้น')
    .optional(),
  
  throughput: z.string()
    .regex(/^[0-9]+(\.[0-9]+)?$/, 'ค่า Throughput ต้องเป็นตัวเลขเท่านั้น')
    .optional(),
  
  userCapacity: z.string()
    .regex(/^[0-9]+$/, 'จำนวนผู้ใช้ต้องเป็นตัวเลขเท่านั้น')
    .optional(),
};

// Composite validation schemas
export const validationSchemas = {
  // Registration form
  register: z.object({
    email: userValidationSchemas.email,
    username: userValidationSchemas.username,
    password: userValidationSchemas.password,
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  }),
  
  // Login form
  login: z.object({
    email: userValidationSchemas.email,
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
  }),
  
  // Project creation form
  createProject: z.object({
    name: userValidationSchemas.projectName,
    description: userValidationSchemas.projectDescription,
  }),
  
  // Project update form
  updateProject: z.object({
    name: userValidationSchemas.projectName.optional(),
    description: userValidationSchemas.projectDescription,
    is_favorite: z.boolean().optional(),
  }),
  
  // Device update form
  updateDevice: z.object({
    label: userValidationSchemas.deviceName,
    maxThroughput: userValidationSchemas.throughput,
    throughputUnit: z.enum(['bps', 'Kbps', 'Mbps', 'Gbps']).optional(),
    bandwidth: userValidationSchemas.bandwidth,
    bandwidthUnit: z.enum(['bps', 'Kbps', 'Mbps', 'Gbps']).optional(),
    deviceRole: z.enum(['Core', 'Distribution', 'Access']).optional(),
    userCapacity: userValidationSchemas.userCapacity,
  }),
};

// XSS Protection utility
export const sanitizeInput = {
  // Remove potentially dangerous HTML tags and scripts
  html: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },
  
  // Remove special characters that could be used in SQL injection
  text: (input: string): string => {
    return input
      .replace(/[<>\"'%;()&+]/g, '')
      .trim();
  },
  
  // Sanitize file names
  fileName: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9ก-๙.\-_\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }
};

// CSRF Protection utility
export const csrfProtection = {
  // Generate CSRF token
  generateToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
  
  // Get CSRF token from storage or generate new one
  getToken: (): string => {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
      token = csrfProtection.generateToken();
      sessionStorage.setItem('csrf_token', token);
    }
    return token;
  },
  
  // Add CSRF token to headers
  addToHeaders: (headers: Record<string, string> = {}): Record<string, string> => {
    return {
      ...headers,
      'X-CSRF-Token': csrfProtection.getToken(),
    };
  },
};

// Rate limiting utility (client-side)
export const rateLimiter = {
  requests: new Map<string, number[]>(),
  
  // Check if request is allowed (returns true if allowed)
  checkLimit: (key: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
    const now = Date.now();
    const requests = rateLimiter.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    validRequests.push(now);
    rateLimiter.requests.set(key, validRequests);
    
    return true;
  },
  
  // Clear rate limit data for a key
  clearLimit: (key: string): void => {
    rateLimiter.requests.delete(key);
  },
};

// JWT token validation
export const tokenValidation = {
  // Check if token is expired (basic client-side check)
  isTokenExpired: (token: string): boolean => {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return true; // Invalid token format
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      
      const isExpired = now >= exp;
      return isExpired;
    } catch (error) {
      return true; // Invalid token format
    }
  },
  
  // Decode JWT payload (client-side only, don't trust this data)
  decodeToken: (token: string): any => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  },
};

// Content Security Policy helpers
export const cspHelpers = {
  // Generate nonce for inline scripts
  generateNonce: (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  },
  
  // Validate if URL is from allowed domains
  isAllowedDomain: (url: string, allowedDomains: string[]): boolean => {
    try {
      const urlObj = new URL(url);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  },
};

export default {
  validationSchemas,
  sanitizeInput,
  csrfProtection,
  rateLimiter,
  tokenValidation,
  cspHelpers,
};