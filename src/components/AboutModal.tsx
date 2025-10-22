import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface AboutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AboutModal({ open, onOpenChange }: AboutModalProps) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onOpenChange(false);
        }
        if (open) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onOpenChange]);

    return (
        <AnimatePresence>
            {open && (
                <Dialog open={open} onOpenChange={onOpenChange}>
                    {/* Animated Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                            duration: 0.3,
                            ease: "easeInOut"
                        }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
                    />
                    
                    {/* Animated Modal Content */}
                    <DialogContent className="max-w-lg p-6 rounded-lg shadow-lg bg-white">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ 
                                opacity: 0, 
                                scale: 0.9, 
                                y: -30,
                                transition: {
                                    duration: 0.25,
                                    ease: "easeIn"
                                }
                            }}
                            transition={{ 
                                duration: 0.4,
                                type: "spring",
                                stiffness: 300,
                                damping: 25
                            }}
                        >
                            <DialogHeader>
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ 
                                        opacity: 0, 
                                        y: -10,
                                        transition: { duration: 0.15 }
                                    }}
                                    transition={{ delay: 0.2, duration: 0.3 }}
                                >
                                    <DialogTitle className="text-xl font-bold mb-4 text-center">
                                        เกี่ยวกับโครงงานนี้
                                    </DialogTitle>
                                </motion.div>
                                
                                <DialogDescription>
                                    <div className="space-y-4 text-sm text-gray-700">
                                        <motion.div 
                                            className="bg-gray-50 p-4 rounded shadow-sm"
                                            initial={{ opacity: 0, x: -30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ 
                                                opacity: 0, 
                                                x: -20,
                                                transition: { duration: 0.15, delay: 0 }
                                            }}
                                            transition={{ delay: 0.3, duration: 0.4 }}
                                        >
                                            <p className="font-semibold mb-2">ชื่อโครงงาน:</p>
                                            <p>
                                                การพัฒนาเครื่องมือสร้างและวิเคราะห์โครงข่ายคอมพิวเตอร์โดยใช้เทคโนโลยีปัญญาประดิษฐ์
                                            </p>
                                            <p className="mt-2 text-gray-500 text-xs">
                                                เป็นส่วนหนึ่งของวิชาโครงงานเทคโนโลยีสารสนเทศและการสื่อสาร
                                            </p>
                                        </motion.div>

                                        <motion.div 
                                            className="bg-gray-50 p-4 rounded shadow-sm"
                                            initial={{ opacity: 0, x: 30 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ 
                                                opacity: 0, 
                                                x: 20,
                                                transition: { duration: 0.15, delay: 0.02 }
                                            }}
                                            transition={{ delay: 0.4, duration: 0.4 }}
                                        >
                                            <p className="font-semibold mb-2">ข้อมูลนักศึกษา</p>
                                            <motion.ul 
                                                className="list-disc list-inside space-y-1"
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                variants={{
                                                    hidden: { opacity: 0 },
                                                    visible: {
                                                        opacity: 1,
                                                        transition: {
                                                            staggerChildren: 0.08,
                                                            delayChildren: 0.5
                                                        }
                                                    },
                                                    exit: {
                                                        opacity: 0,
                                                        transition: {
                                                            staggerChildren: 0.03,
                                                            staggerDirection: -1,
                                                            duration: 0.1
                                                        }
                                                    }
                                                }}
                                            >
                                                {[
                                                    "ชื่อ: นาย วีรพงษ์ พรมดี",
                                                    "ภาควิชา: คณิตศาสตร์ สถิติ และคอมพิวเตอร์",
                                                    "อาจารย์ที่ปรึกษา: อาจารย์ พิชิต โสภากันต์",
                                                    "ระดับการศึกษา: สาขาวิชาเทคโนโลยีสารสนเทศและการสื่อสาร",
                                                    "กลุ่ม: เครือข่ายและความมั่นคงฯ",
                                                    "ปีการศึกษา: 2568"
                                                ].map((item, index) => (
                                                    <motion.li
                                                        key={index}
                                                        variants={{
                                                            hidden: { opacity: 0, x: -15 },
                                                            visible: { opacity: 1, x: 0 },
                                                            exit: { 
                                                                opacity: 0, 
                                                                x: -10,
                                                                transition: { duration: 0.1 }
                                                            }
                                                        }}
                                                    >
                                                        {item}
                                                    </motion.li>
                                                ))}
                                            </motion.ul>
                                        </motion.div>

                                        <motion.div 
                                            className="bg-gray-50 p-4 rounded shadow-sm"
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ 
                                                opacity: 0, 
                                                y: 20,
                                                transition: { duration: 0.15, delay: 0.04 }
                                            }}
                                            transition={{ delay: 0.6, duration: 0.4 }}
                                        >
                                            <p className="font-semibold mb-2">ลิงก์การใช้งาน</p>
                                            <motion.a
                                                href="https://drive.google.com/file/d/1Y2PC-NlKFVrc4mGtYiFG0N4sWNvRJFBK/view?usp=sharing"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 underline hover:text-blue-800"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                กดที่นี่เพื่อศึกษาวิธีใช้งาน
                                            </motion.a>
                                        </motion.div>


                                    </div>
                                </DialogDescription>
                            </DialogHeader>

                            <motion.div 
                                className="flex justify-center mt-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ 
                                    opacity: 0, 
                                    y: 15,
                                    transition: { duration: 0.15, delay: 0.06 }
                                }}
                                transition={{ delay: 0.7, duration: 0.3 }}
                            >
                                <motion.button
                                    className="px-6 py-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
                                    onClick={() => onOpenChange(false)}
                                    whileHover={{ 
                                        scale: 1.05
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    ปิด
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
}