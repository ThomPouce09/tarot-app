import { Cinzel, Cinzel_Decorative, MedievalSharp, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import './fonts-local.css'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'
import { LoginModal } from '@/components/login-modal'
import { LanguageProvider } from '@/lib/i18n'
import StatusBarController from '@/components/status-bar-controller'
import LanguageGate from '@/components/language-gate'
import OnboardingTour from '@/components/onboarding-tour'

// (static export : pas de force-dynamic)

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '500', '600', '700'] })
const cinzelDeco = Cinzel_Decorative({ subsets: ['latin'], variable: '--font-cinzel-deco', weight: ['400', '700'] })
const medieval = MedievalSharp({ subsets: ['latin'], variable: '--font-medieval', weight: '400' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-cormorant', weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'Oracle des Etoiles',
  description: 'Oracle des Etoiles : tarot, runes, Yi Jing et dés divinatoires — une expérience mystique et immersive.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Oracle des Etoiles',
    description: 'Oracle des Etoiles : tarot, runes, Yi Jing et dés divinatoires — une expérience mystique et immersive.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Widget de chat tiers retiré : script externe (apps.abacus.ai) qui
            posait un overlay captant les taps sur l'ensemble des pages.
            Remplacé par un widget de contact maison (components/contact-widget). */}
        {/* <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script> */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{
          __html: `
            input[type="email"] {
              text-transform: lowercase !important;
            }
            @media screen and (orientation: landscape) {
              body::before {
                content: "Tournez l'appareil en mode portrait";
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #daa520;
                font-family: var(--font-cinzel), serif;
                font-size: 1.5rem;
                z-index: 999999;
                text-align: center;
                padding: 2rem;
              }
              body {
                overflow: hidden;
              }
            }
          `
        }} />
      </head>
      <body className={`${cinzel.variable} ${cinzelDeco.variable} ${medieval.variable} ${cormorant.variable} font-sans antialiased`} suppressHydrationWarning>
        <StatusBarController />
        {/* Voile « Chargement … » rendu côté SERVEUR : peint dès la réponse HTML,
            avant toute hydratation — la landing ne peut plus transparaître une
            fraction de seconde. Le <AppLoader /> de la landing prend le relais
            (relais détecté par le script : fondu du voile SSR puis retrait). */}
        <div id="boot-veil" className="app-loader" role="status" aria-live="polite">
          <div className="app-loader-inner">
            <svg className="app-loader-star" width="64" height="64" viewBox="0 0 64 64" aria-hidden>
              <defs>
                <radialGradient id="loaderGold" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F0C75E" />
                  <stop offset="60%" stopColor="#DAA520" />
                  <stop offset="100%" stopColor="#8a6a1d" />
                </radialGradient>
              </defs>
              <g fill="url(#loaderGold)">
                <path d="M32 2 L36 26 L60 32 L36 38 L32 62 L28 38 L4 32 L28 26 Z" />
                <path d="M32 10 L34.8 29.2 L54 32 L34.8 34.8 L32 54 L29.2 34.8 L10 32 L29.2 29.2 Z" opacity="0.55" transform="rotate(45 32 32)" />
              </g>
            </svg>
            <p className="app-loader-text" id="boot-veil-text">Chargement ...</p>
            <div className="app-loader-dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `(function(){
  var v=document.getElementById('boot-veil');if(!v)return;
  /* Voile de démarrage réservé à la landing (l'app y entre ici). Ailleurs :
     page directement visible — sinon on masquerait une navigation interne.
     '/index.html' = entrée de la WebView Capacitor (export statique). */
  if(location.pathname!=='/'&&location.pathname!=='/index.html'){v.remove();return;}
  try{var p=JSON.parse(localStorage.getItem('tarot_prefs')||'{}');var tx=document.getElementById('boot-veil-text');if(p.language==='en'&&tx)tx.textContent='Loading...';}catch(e){}
  function out(){if(!v)return;clearInterval(iv);v.classList.add('app-loader-out');var w=v;v=null;setTimeout(function(){w.remove();},800);}
  /* Relais = le <AppLoader /> React de la landing (hydraté, avec fondu + minuteries).
     S'il n'arrive pas (JS en échec), on découvre la page au plus tard 4,5 s après load. */
  var iv=setInterval(function(){
    if(!v){clearInterval(iv);return;}
    if(document.querySelector('.app-loader:not(#boot-veil)'))out();
  },30);
  window.addEventListener('load',function(){setTimeout(out,4500);});
  })();` }} />
        <LanguageProvider>
          {children}
          <ChunkLoadErrorHandler />
          <LoginModal />
          <LanguageGate />
          <OnboardingTour />
          {/* Portal root pour affichage garanti au-dessus de tout */}
          <div id="portal-root" style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }} />
        </LanguageProvider>
      </body>
    </html>
  )
}
