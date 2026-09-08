'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';
import TarotApp from '../components/tarot-app';
import AuthGate from '@/components/auth-gate';
import QuestionModal from './question-modal';

function Home() {
  const lang = useLang();
  // « 3 Cartes · Précis » : une question libre est demandée avant la pioche ;
  // elle est transmise à l'oracle (prompt) et rappelée en bandeau sur
  // l'interprétation. Sans question, la modale élégante occupe l'écran.
  const [question, setQuestion] = useState('');

  if (!question) return <QuestionModal onSubmit={setQuestion} />;

  // Tirage 3 cartes : la pioche ne présente que les 22 arcanes majeurs.
  return <TarotApp majorsOnly question={question}
    title={lang === 'en' ? '3 Cards · Precise' : '3 Cartes · Précis'} />;
}

export default function GatedPage() {
  return <AuthGate><Home /></AuthGate>;
}
