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
      </head>
      <body className={`${cinzel.variable} ${cinzelDeco.variable} ${medieval.variable} font-sans antialiased`}>
        {children}
        <ChunkLoadErrorHandler />
      </body>
    </html>
  )
}
