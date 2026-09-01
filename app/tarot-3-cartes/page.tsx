import TarotApp from '../components/tarot-app';
import AuthGate from '@/components/auth-gate';

function Home() {
  return <TarotApp />;
}

export default function GatedPage() {
  return <AuthGate><Home /></AuthGate>;
}
