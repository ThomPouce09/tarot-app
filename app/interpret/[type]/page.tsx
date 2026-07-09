'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import WaitOverlay from '@/components/wait-overlay';
import { useLang, useT } from '@/lib/i18n';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
  introduction?: string;
  situationYiJing?: string;
  action?: string;
  conseilYiJing?: string;
  resume?: string;
  numero?: number;
  nom?: string;
  meditation?: string;
  attitude?: string;
  [key: string]: string | number | undefined;
}

export default function InterpretationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // e.g., /interpret/tarot-3-cartes
  const lang = useLang();
  const t = useT();

  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<string | null>(null);

  // Extract type from pathname: /interpret/tarot-3-cartes -> tarot-3-cartes
  const type = pathname.split('/')[2] || '';

  useEffect(() => {
    if (!type) {
      setError('Type d\'interprétation manquant');
      setLoading(false);
      return;
    }

    // Guard idempotent : searchParams change de référence à chaque render
    // -> sans ça, le effect re-fire et sauvegarde le tirage 2× (doublon).
    const sig = type + '|' + searchParams.toString();
    if (doneRef.current === sig) return;
    doneRef.current = sig;

    const question = searchParams.get('question');
    const userId = searchParams.get('userId');

    // Determine payload based on type
    const isTarot = type.startsWith('tarot');
    const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';

    let payload: any = {
      type,
      question: question || undefined,
      userId: userId || undefined,
      lang,
    };

    if (isTarot) {
      const cartes = searchParams.get('cartes');
      if (!cartes) {
        setError('Données de tirage manquantes (cartes)');
        setLoading(false);
        return;
      }
      // Parse cartes from string "1,2,3" to number[]
      let cardIds: number[] = [];
      try {
        cardIds = cartes.split(',').map(Number);
        if (cardIds.some(isNaN)) throw new Error('Invalid card IDs');
      } catch (e) {
        setError('Format des cartes invalide');
        setLoading(false);
        return;
      }
      payload.cartes = cardIds;
    } else if (isYiJing) {
      const baguette = searchParams.get('baguette');
      if (!baguette) {
        setError('Données de tirage manquantes (baguette)');
        setLoading(false);
        return;
      }
      const baguetteNum = parseInt(baguette, 10);
      if (isNaN(baguetteNum)) {
        setError('Format de la baguette invalide');
        setLoading(false);
        return;
      }
      payload.baguette = baguetteNum;
    } else {
      setError('Type d\'interprétation non supporté');
      setLoading(false);
      return;
    }

    fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInterpretation(data);
      })
      .catch((err) => {
        setError(err.message);
        setInterpretation(null);
      })
      .finally(() => setLoading(false));
  }, [type, searchParams]);

  if (loading) {
    return <WaitOverlay type={type} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!interpretation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">{t('interpret.noInterpretation')}</p>
      </div>
    );
  }

  // Determine if it's Tarot or Yi Jing based on type prefix
  const isTarot = type.startsWith('tarot');
  const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center p-4 overflow-y-auto">
      {/* Croix retour */}
      <Link
        href="/"
        className="fixed top-4 right-4 text-yellow-400 text-3xl font-bold hover:text-yellow-300 transition-colors z-50"
        aria-label="Retour à l'accueil"
      >
        ×
      </Link>

      <div className="w-full max-w-md mt-20 text-center">
        <h1 className="text-2xl font-serif text-yellow-400 mb-2">
          {isTarot ? t('interpret.titleTarot') : t('interpret.titleYiJing')}
        </h1>

        <div className="text-left space-y-4">
          <>
            <h2 className="text-yellow-500 font-bold">{t('interpret.situation')}</h2>
            <p className="text-gray-200 mb-4">{interpretation.situation}</p>

            <h2 className="text-yellow-500 font-bold">{t('interpret.defis')}</h2>
            <p className="text-gray-200 mb-4">{interpretation.defis}</p>

            <h2 className="text-yellow-500 font-bold">{t('interpret.soutien')}</h2>
            <p className="text-gray-200 mb-4">{interpretation.soutien}</p>

            <h2 className="text-yellow-500 font-bold">{t('interpret.issue')}</h2>
            <p className="text-gray-200 mb-4">{interpretation.issue}</p>

            <h2 className="text-yellow-500 font-bold">{t('interpret.conseil')}</h2>
            <p className="text-gray-200 mb-4">{interpretation.conseil}</p>

            {/* Détails Yi Jing simple */}
            {type === 'yi-jing-simple' && (
              <div className="mt-6 p-4 bg-yellow-900/20 rounded-lg">
                <h3 className="text-yellow-400 font-bold mb-2">{t('interpret.detailsTitle')}</h3>
                <p className="text-gray-200">{t('interpret.numero')} : {interpretation.numero}</p>
                <p className="text-gray-200">{t('interpret.nom')} : {interpretation.nom}</p>
                <p className="text-gray-200">{t('interpret.meditation')} : {interpretation.meditation}</p>
                <p className="text-gray-200">{t('interpret.attitude')} : {interpretation.attitude}</p>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
}