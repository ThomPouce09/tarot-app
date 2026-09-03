import TarotApp from '../components/tarot-app';
import AuthGate from '@/components/auth-gate';

function Home() {
  // Tirage 3 cartes : la pioche ne présente que les 22 arcanes majeurs.
  return <TarotApp majorsOnly />;
}

export default function GatedPage() {
  return <AuthGate><Home /></AuthGate>;
}
