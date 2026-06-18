'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const LANDING_BG = '/backgrounds/landing-bg.jpg';

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
        setIsLoggedIn(true);
        setShowLoginModal(false);
        router.push('/dashboard/account');
      } else {
        alert(data.error || 'Email ou mot de passe incorrect');
      }
    } catch {
      alert('Erreur de connexion');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    setIsLoggedIn(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }}>
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        <Image
          src={LANDING_BG}
          alt="Table mystique Tarot & Yi Jing"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-black/40" />
      </div>

      {/* AUTH BUTTONS (Top Right) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Link
          href="/auth/signup"
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all opacity-80 hover:opacity-100"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            background: 'rgba(139, 105, 20, 0.25)',
            color: '#DAA520',
            border: '1px solid rgba(218, 165, 32, 0.3)',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.25)'}
        >
          📝 Inscription
        </Link>
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-200/80 font-medium" style={{ 
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}>
              👤
            </span>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                background: 'rgba(139, 105, 20, 0.3)',
                color: '#FFD700',
                border: '1px solid rgba(218, 165, 32, 0.4)',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.3)'}
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all opacity-80 hover:opacity-100"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              background: 'rgba(139, 105, 20, 0.25)',
              color: '#FFD700',
              border: '1px solid rgba(218, 165, 32, 0.3)',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.25)'}
          >
            🔐 Connexion
          </button>
        )}
      </div>

      {/* MAIN TITLE */}
      <div
        className="absolute top-[12%] sm:top-[8%] md:top-[10%] left-1/2 -translate-x-1/2 z-30 text-center px-4"
      >
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider uppercase mb-4"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#DAA520',
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(218,165,32,0.7), 0 0 80px rgba(218,165,32,0.4)',
          }}
        >
          L&apos;Oracle des étoiles
        </h1>
        <p
          className="text-sm sm:text-base md:text-lg font-medium italic"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em',
          }}
        >
          Révélez votre destin à travers les arcanes
        </p>
      </div>

      {/* CHOICE CARDS */}
      <div
        className="absolute bottom-[38%] sm:bottom-[40%] left-1/2 -translate-x-1/2 z-30 flex flex-row gap-3 sm:gap-4 items-center justify-center px-4"
      >
        {/* Tarot Card Button */}
        <Link href="/tirage" className="block">
          <motion.div
            className="group relative w-28 sm:w-32 md:w-36 lg:w-40 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow: '0 0 20px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(218,165,32,0.3)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 50%, #2d1b4e 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-lg" />
              <div className="text-2xl sm:text-3xl mb-1">🎴</div>
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#FFD700',
                  textShadow: '0 0 8px rgba(255,215,0,0.4)',
                }}
              >
                Tarot
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255,215,0,0.7)',
                }}
              >
                3 cartes
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(218,165,32,0.15) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        </Link>

        {/* Yi Qing Card Button */}
        <Link href="/yi-qing" className="block">
          <motion.div
            className="group relative w-28 sm:w-32 md:w-36 lg:w-40 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow: '0 0 15px rgba(100,100,100,0.3), 0 3px 10px rgba(0,0,0,0.4)',
              border: '2px solid rgba(180,180,180,0.25)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 50%, #3a3a3a 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-gray-500/25 rounded-lg dashed" />
              <div className="text-2xl sm:text-3xl mb-1">☯️</div>
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#9CA3AF',
                  textShadow: '0 0 6px rgba(156,163,175,0.3)',
                }}
              >
                Yi Jing
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5 italic"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(156,163,175,0.6)',
                }}
              >
                Découvrir
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(156,163,175,0.15) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        </Link>
      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          />
          <motion.div
            className="relative z-10 w-full max-w-md mx-4 p-6 rounded-2xl"
            style={{
              background: 'rgba(26, 14, 10, 0.95)',
              border: '1px solid rgba(218, 165, 32, 0.3)',
              boxShadow: '0 0 40px rgba(218,165,32,0.2)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <h3
              className="text-2xl font-bold text-center mb-2"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                color: '#FFD700',
                textShadow: '0 0 15px rgba(255,215,0,0.5)',
              }}
            >
              Connexion ✨
            </h3>
            <p
              className="text-center text-sm mb-6"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'rgba(255,215,0,0.7)',
              }}
            >
              Accédez à votre historique de tirages
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: '#FFD700',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(218,165,32,0.3)',
                    color: '#FFD700',
                    fontFamily: 'var(--font-cinzel), serif',
                  }}
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: '#FFD700',
                  }}
                >
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(218,165,32,0.3)',
                    color: '#FFD700',
                    fontFamily: 'var(--font-cinzel), serif',
                  }}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-bold transition-all mt-6"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
                  color: '#1a0e0a',
                  boxShadow: '0 0 20px rgba(218,165,32,0.4)',
                  border: '1px solid rgba(218,165,32,0.5)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Se connecter ✨
              </button>
            </form>
            <div className="text-center text-xs mt-4 space-y-2">
              <a href="/auth/forgot-password" className="text-amber-300 hover:underline block mx-auto">🔑 Mot de passe oublié ?</a>
              <a href="/auth/signup" className="text-amber-300 hover:underline block mx-auto">✨ Pas encore inscrit ?</a>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}