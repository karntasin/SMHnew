import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ userName, isOpen, onClose }: WelcomeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'สวัสดีตอนเช้าค่ะ';
    if (hour < 17) return 'สวัสดีตอนบ่ายค่ะ';
    if (hour < 20) return 'สวัสดีตอนเย็นค่ะ';
    return 'สวัสดีตอนค่ำค่ะ';
  };

  // Floating hearts animation
  const FloatingHearts = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ 
            x: Math.random() * 400 - 200,
            y: 500,
            opacity: 0,
            scale: 0.5
          }}
          animate={{ 
            y: -100,
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            rotate: Math.random() * 360
          }}
          transition={{ 
            duration: 4 + Math.random() * 2,
            delay: i * 0.3,
            repeat: Infinity,
            repeatDelay: Math.random() * 2
          }}
          style={{ left: `${10 + Math.random() * 80}%` }}
        >
          <Heart 
            className={`w-4 h-4 ${
              i % 3 === 0 ? 'text-pink-400' : 
              i % 3 === 1 ? 'text-red-400' : 'text-rose-300'
            }`} 
            fill="currentColor"
          />
        </motion.div>
      ))}
    </div>
  );

  // Sparkle effects
  const SparkleEffect = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ 
            opacity: 0,
            scale: 0
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{ 
            duration: 1.5,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: Math.random() * 3
          }}
          style={{ 
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
        >
          <Sparkles className="w-3 h-3 text-yellow-400" />
        </motion.div>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="relative w-full max-w-lg mx-4"
          >
            {/* Main Card */}
            <div className="relative bg-gradient-to-br from-white via-pink-50 to-purple-50 dark:from-gray-900 dark:via-pink-950/30 dark:to-purple-950/30 rounded-3xl shadow-2xl overflow-hidden border border-pink-200/50 dark:border-pink-800/30">
              
              {/* Decorative top wave */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 dark:from-pink-600 dark:via-rose-600 dark:to-pink-700">
                <svg className="absolute bottom-0 w-full h-8" viewBox="0 0 400 30" preserveAspectRatio="none">
                  <path 
                    d="M0,30 C100,10 300,10 400,30 L400,30 L0,30 Z" 
                    fill="currentColor" 
                    className="text-white dark:text-gray-900"
                  />
                </svg>
              </div>

              {/* Floating animations */}
              <FloatingHearts />
              {showConfetti && <SparkleEffect />}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Content */}
              <div className="relative pt-16 pb-8 px-8">
                
                {/* Nurse Character Image */}
                <motion.div 
                  className="flex justify-center mb-4 -mt-8"
                  initial={{ y: 20, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <motion.div
                    animate={{ 
                      y: [0, -12, 0],
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative"
                  >
                    {/* Glow effect behind image */}
                    <motion.div 
                      className="absolute inset-0 blur-2xl bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 rounded-full opacity-40"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    
                    {/* Rotating ring */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-56 h-56 rounded-full border-2 border-dashed border-pink-300/50" />
                    </motion.div>
                    
                    {/* Counter rotating ring */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-64 h-64 rounded-full border border-purple-300/30" />
                    </motion.div>

                    {/* Anime Nurse Character Image - No background, larger size */}
                    <motion.img 
                      src="/images/cartoon.png" 
                      alt="Nurse Character" 
                      className="relative w-52 h-auto z-10 [mask-image:linear-gradient(black,black)] bg-transparent"
                      style={{ 
                        filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.4))',
                        mixBlendMode: 'multiply',
                        backgroundColor: 'transparent'
                      }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    />
                    
                    {/* Floating sparkles around the character */}
                    <motion.div
                      className="absolute -top-4 -left-4 z-20"
                      animate={{ 
                        opacity: [0.5, 1, 0.5], 
                        scale: [0.8, 1.3, 0.8],
                        rotate: [0, 15, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-7 h-7 text-yellow-400 drop-shadow-lg" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute -top-2 -right-6 z-20"
                      animate={{ 
                        opacity: [0.5, 1, 0.5], 
                        scale: [0.8, 1.3, 0.8],
                        rotate: [0, -15, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    >
                      <Sparkles className="w-6 h-6 text-pink-400 drop-shadow-lg" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute top-1/4 -right-8 z-20"
                      animate={{ 
                        opacity: [0.3, 1, 0.3], 
                        scale: [0.6, 1.2, 0.6]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    >
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute bottom-8 -right-6 z-20"
                      animate={{ 
                        opacity: [0.5, 1, 0.5], 
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                      <Heart className="w-5 h-5 text-red-400 fill-red-400 drop-shadow-lg" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute bottom-12 -left-6 z-20"
                      animate={{ 
                        opacity: [0.5, 1, 0.5], 
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.7 }}
                    >
                      <Heart className="w-4 h-4 text-pink-400 fill-pink-400 drop-shadow-lg" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute top-1/3 -left-8 z-20"
                      animate={{ 
                        opacity: [0.3, 1, 0.3], 
                        scale: [0.6, 1.1, 0.6]
                      }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: 1.2 }}
                    >
                      <Star className="w-4 h-4 text-purple-400 fill-purple-400 drop-shadow-lg" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Greeting Text */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center space-y-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent">
                      {getGreeting()}
                    </h2>
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  
                  <motion.p 
                    className="text-3xl font-bold text-gray-800 dark:text-white"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    คุณ {userName}
                  </motion.p>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    ยินดีต้อนรับเข้าสู่ระบบค่ะ 💕
                  </p>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="pt-4 pb-2"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-full">
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        พร้อมดูแลคุณเสมอค่ะ
                      </span>
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 flex justify-center"
                >
                  <Button
                    onClick={onClose}
                    className="px-8 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:via-rose-600 hover:to-pink-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    เริ่มต้นใช้งาน
                  </Button>
                </motion.div>

                {/* Footer decoration */}
                <motion.div 
                  className="flex justify-center gap-1 mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
