import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toastUtils } from '@/utils/toastUtils';
import { Eye, EyeOff, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AboutModal from './AboutModal';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  // แยก state login/register
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // เพิ่ม state สำหรับแสดง/ซ่อนรหัสผ่าน
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
  // About Modal state
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const { login, register } = useAuth();

  // เคลียร์ฟอร์มเมื่อเปลี่ยน tab
  useEffect(() => {
    setErrors({});
    if (isLogin) {
      setRegisterEmail('');
      setRegisterUsername('');
      setRegisterPassword('');
    } else {
      setLoginEmail('');
      setLoginPassword('');
    }
  }, [isLogin]);

  // Validation helper
  // Enhanced email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    
    // Check for valid TLD
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    const tld = domain.split('.').pop()?.toLowerCase();
    const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'ac', 'co', 'th', 'cn', 'jp', 'uk', 'de', 'fr', 'it', 'es', 'ru', 'br', 'in', 'au', 'ca'];
    return validTlds.includes(tld || '');
  };

  const validate = () => {
    const newErrors: any = {};
    if (isLogin) {
      if (!loginEmail) newErrors.loginEmail = 'กรุณากรอกอีเมล';
      else if (!isValidEmail(loginEmail)) newErrors.loginEmail = 'รูปแบบอีเมลไม่ถูกต้อง เช่น example@domain.com';
      if (!loginPassword) newErrors.loginPassword = 'กรุณากรอกรหัสผ่าน';
    } else {
      if (!registerUsername) newErrors.registerUsername = 'กรุณากรอกชื่อผู้ใช้';
      else if (registerUsername.length < 3) newErrors.registerUsername = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
      if (!registerEmail) newErrors.registerEmail = 'กรุณากรอกอีเมล';
      else if (!isValidEmail(registerEmail)) newErrors.registerEmail = 'รูปแบบอีเมลไม่ถูกต้อง เช่น example@domain.com';
      if (!registerPassword) newErrors.registerPassword = 'กรุณากรอกรหัสผ่าน';
      else if (registerPassword.length < 6) newErrors.registerPassword = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    if (!validate()) {
      setLoading(false);
      return;
    }
    try {
      if (isLogin) {
        await login(loginEmail, loginPassword);
        toastUtils.success("ยินดีต้อนรับกลับมา!");
        // Navigation is handled by AuthContext
      } else {
        await register(registerEmail, registerUsername, registerPassword);
        toastUtils.success("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
        setIsLogin(true);
      }
    } catch (error: any) {
      // Handle specific login/register errors
      const errorMessage = error?.response?.data?.detail || error?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      
      if (isLogin) {
        // Login errors
        if (errorMessage.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง') || 
            errorMessage.includes('Incorrect') || 
            errorMessage.includes('401') ||
            errorMessage.includes('Unauthorized')) {
          setErrors({ 
            loginEmail: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
            loginPassword: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
          });
        } else {
          setErrors({ loginEmail: errorMessage });
        }
      } else {
        // Register errors
        if (errorMessage.includes('อีเมลนี้มีผู้ใช้แล้ว') || errorMessage.includes('email')) {
          setErrors({ registerEmail: 'อีเมลนี้มีผู้ใช้แล้ว' });
        } else if (errorMessage.includes('ชื่อผู้ใช้นี้มีผู้ใช้แล้ว') || errorMessage.includes('username')) {
          setErrors({ registerUsername: 'ชื่อผู้ใช้นี้มีผู้ใช้แล้ว' });
        } else {
          setErrors({ registerEmail: errorMessage });
        }
      }
      
      // Also show toast for better UX
      toastUtils.handleApiError(error, "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      {/* About Button - Fixed position */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAboutModalOpen(true)}
        className="fixed top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 border border-gray-200 shadow-sm z-10"
      >
        <Info className="w-4 h-4" />
        เกี่ยวกับโครงงาน
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Network Topology AI</CardTitle>
          <CardDescription className="text-center">
            เข้าสู่ระบบเพื่อจัดการโปรเจกต์ของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => !loading && setIsLogin(value === "login")}> 
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={loading}>เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="register" disabled={loading}>สมัครสมาชิก</TabsTrigger>
            </TabsList>
            <AnimatePresence mode="wait">
              {isLogin ? (
                <TabsContent value="login" forceMount>
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="login-email" className="block text-sm font-medium">อีเมล</label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="อีเมล"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                        aria-label="อีเมล"
                        className="focus:ring-2 focus:ring-blue-400 transition-shadow"
                      />
                      <AnimatePresence>
                        {errors.loginEmail && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.loginEmail}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="relative">
                      <label htmlFor="login-password" className="block text-sm font-medium">รหัสผ่าน</label>
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="รหัสผ่าน"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                        aria-label="รหัสผ่าน"
                        autoComplete="current-password"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSubmit(e);
                        }}
                        className="focus:ring-2 focus:ring-blue-400 transition-shadow"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-2 top-8 text-gray-400 hover:text-gray-700"
                        onClick={() => setShowLoginPassword(v => !v)}
                        style={{ background: 'none', border: 'none', padding: 0 }}
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <AnimatePresence>
                        {errors.loginPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.loginPassword}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <Button type="submit" className="w-full transition-transform duration-150 active:scale-95 hover:scale-105" disabled={loading} aria-label="เข้าสู่ระบบ">
                      {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </Button>
                  </motion.form>
                </TabsContent>
              ) : (
                <TabsContent value="register" forceMount>
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="register-username" className="block text-sm font-medium">ชื่อผู้ใช้</label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="ชื่อผู้ใช้"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                        disabled={loading}
                        aria-label="ชื่อผู้ใช้"
                        className="focus:ring-2 focus:ring-blue-400 transition-shadow"
                      />
                      <AnimatePresence>
                        {errors.registerUsername && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.registerUsername}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div>
                      <label htmlFor="register-email" className="block text-sm font-medium">อีเมล</label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="อีเมล"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        disabled={loading}
                        aria-label="อีเมล"
                        className="focus:ring-2 focus:ring-blue-400 transition-shadow"
                      />
                      <AnimatePresence>
                        {errors.registerEmail && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.registerEmail}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="relative">
                      <label htmlFor="register-password" className="block text-sm font-medium">รหัสผ่าน</label>
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="รหัสผ่าน"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        disabled={loading}
                        aria-label="รหัสผ่าน"
                        autoComplete="new-password"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSubmit(e);
                        }}
                        className="focus:ring-2 focus:ring-blue-400 transition-shadow"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-2 top-8 text-gray-400 hover:text-gray-700"
                        onClick={() => setShowRegisterPassword(v => !v)}
                        style={{ background: 'none', border: 'none', padding: 0 }}
                      >
                        {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <AnimatePresence>
                        {errors.registerPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.registerPassword}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <Button type="submit" className="w-full transition-transform duration-150 active:scale-95 hover:scale-105" disabled={loading} aria-label="สมัครสมาชิก">
                      {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                    </Button>
                  </motion.form>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>

      {/* About Modal */}
      <AboutModal 
        open={aboutModalOpen} 
        onOpenChange={setAboutModalOpen} 
      />
    </div>
  );
}; 