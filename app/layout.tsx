import { Cinzel, Cinzel_Decorative, MedievalSharp } from 'next/font/google'
import './globals.css'
import { ChunkLoadErrorHandler } from '@/components/chunk-load-error-handler'

export const dynamic = 'force-dynamic';

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '500', '600', '700'] })
const cinzelDeco = Cinzel_Decorative({ subsets: ['latin'], variable: '--font-cinzel-deco', weight: ['400', '700'] })
const medieval = MedievalSharp({ subsets: ['latin'], variable: '--font-medieval', weight: '400' })

export const metadata = {
  title: 'Tarot Divinatoire — Tirage de 3 Cartes',
  description: 'Découvrez votre destinée à travers un tirage de tarot médiéval de 3 cartes. Une expérience mystique et immersive.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Tarot Divinatoire — Tirage de 3 Cartes',
    description: 'Découvrez votre destinée à travers un tirage de tarot médiéval.',
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
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
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
      <body className={`${cinzel.variable} ${cinzelDeco.variable} ${medieval.variable} font-sans antialiased`}>
        {children}
        <ChunkLoadErrorHandler />
        {/* Portal root pour affichage garanti au-dessus de tout */}
        <div id="portal-root" style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }} />
      </body>
    </html>
  )
}
