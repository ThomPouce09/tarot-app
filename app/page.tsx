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
  const [showRunesNotice, setShowRunesNotice] = useState(false);
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

      {/* MAIN TITLE */}
      <div
        className="absolute top-[3%] sm:top-[3%] md:top-[4%] left-1/2 -translate-x-1/2 z-40 text-center px-4"
      >
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider uppercase mb-3"
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
          className="text-sm sm:text-base md:text-lg font-medium italic mb-5"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em',
          }}
        >
          Consultez votre destin à travers les arcanes
        </p>

        {/* CTA central unique */}
        <motion.button
          onClick={() => isLoggedIn ? router.push('/dashboard/account') : setShowLoginModal(true)}
          className="mx-auto px-5 py-1.5 rounded-full font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            background: 'rgba(26, 14, 10, 0.55)',
            color: '#FFD700',
            boxShadow: '0 0 16px rgba(218,165,32,0.35)',
            border: '1px solid rgba(218,165,32,0.55)',
            letterSpacing: '0.05em',
            fontSize: '0.95rem',
            backdropFilter: 'blur(4px)',
          }}
          whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(218,165,32,0.55)' }}
          whileTap={{ scale: 0.97 }}
        >
          ✨ {isLoggedIn ? 'Mon espace' : 'Entrer dans le temple'}
        </motion.button>
      </div>

      {/* CHOICE CARDS */}
      <div
        className="absolute top-[36%] sm:top-[32%] md:top-[30%] left-1/2 -translate-x-1/2 z-30 grid grid-cols-[128px_128px] sm:grid-cols-[144px_144px] md:grid-cols-[160px_160px] lg:grid-cols-[176px_176px] gap-x-5 gap-y-6 justify-items-center px-4"
      >
        {/* Tarot Card Button */}
        <Link href="/tarot" className="block">
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
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
                background: 'linear-gradient(135deg, #4a2c1a 0%, #2a1408 50%, #4a2c1a 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/tarot-icon.png"
                alt="Tarot"
                className="w-11 h-11 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }}
              />
              <h2
                className="text-sm sm:text-base font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#FFD700',
                  textShadow: '0 0 8px rgba(255,215,0,0.45)',
                }}
              >
                Tarot
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255,215,0,0.75)',
                }}
              >
                Déployer les lames sacrées
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.18) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        </Link>

        {/* Yi Qing Card Button */}
        <Link href="/yi-jing" className="block">
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                '0 0 22px rgba(160,130,200,0.45), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(180,140,220,0.4)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #1a1230 0%, #0a0618 50%, #1a1230 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-purple-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/yi-jing-icon.png"
                alt="Yi Jing"
                className="w-9 h-9 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(180,140,200,0.6))' }}
              />
              <h2
                className="text-sm sm:text-base font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#E0CFF0',
                  textShadow: '0 0 8px rgba(180,140,200,0.5)',
                }}
              >
                Yi Jing
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(200,180,230,0.7)',
                }}
              >
                Interroger les baguettes d'achillée
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(180,140,220,0.2) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        </Link>

        {/* Runes Card Button */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowRunesNotice(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowRunesNotice(true); }}
          className="block cursor-pointer outline-none"
        >
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden transition-all"
            style={{
              boxShadow:
                '0 0 22px rgba(60,120,80,0.45), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(138,109,59,0.4)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #1b3a2a 0%, #0a1f15 50%, #1b3a2a 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-600/30 rounded-lg pointer-events-none" />
              <img
                src="/images/runes-icon.png"
                alt="Runes Scandinaves"
                className="w-11 h-11 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(138,109,59,0.5))' }}
              />
              <h2
                className="text-sm sm:text-base font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#D4B483',
                  textShadow: '0 0 8px rgba(138,109,59,0.5)',
                }}
              >
                Runes Scandinaves
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(168,201,154,0.8)',
                }}
              >
                Interroger le Futhark
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(138,109,59,0.2) 0%, transparent 70%)',
              }}
            />
            {showRunesNotice && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl px-3 text-center backdrop-blur-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(10,31,21,0.92) 0%, rgba(26,58,42,0.92) 100%)',
                  border: '1px solid rgba(138,109,59,0.5)',
                }}
              >
                <div className="text-2xl mb-1" style={{ filter: 'drop-shadow(0 0 8px rgba(138,109,59,0.6))' }}>🔨</div>
                <p
                  className="text-[11px] sm:text-xs font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#D4B483', textShadow: '0 0 8px rgba(138,109,59,0.5)' }}
                >
                  En cours de construction
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRunesNotice(false); }}
                  className="mt-2 px-3 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
                  style={{ fontFamily: 'var(--font-cinzel), serif', background: 'rgba(138,109,59,0.25)', color: '#E8D5B0', border: '1px solid rgba(138,109,59,0.4)' }}
                >
                  Fermer
                </button>
              </div>
            )}
          </motion.div>
        </div>
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
              className="text-2xl font-bold text-center mb-6"
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
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: '1.05rem',
                color: 'rgba(255,215,0,0.7)',
              }}
            >
              Que les étoiles vous guident !
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
                  inputMode="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(218,165,32,0.3)',
                    color: '#FFE9B0',
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '1.1rem',
                    letterSpacing: '0.02em',
                    textTransform: 'lowercase',
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
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(218,165,32,0.3)',
                    color: '#FFE9B0',
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '1.1rem',
                    letterSpacing: '0.02em',
                    textTransform: 'lowercase',
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
}// force vercel redeploy
