'use client';

import WaitOverlay from '@/components/wait-overlay';

interface QuickDivinationProps {
  isVisible: boolean;
}

export default function QuickDivination({ isVisible }: QuickDivinationProps) {
  if (!isVisible) return null;
  return <WaitOverlay type="quick-divination" />;
}
