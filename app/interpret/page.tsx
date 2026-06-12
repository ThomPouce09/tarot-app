// ============================================================================
// PAGE: /interpret - Vidéo d'attente interprétation
// ============================================================================

"use client";

import { motion } from "framer-motion";

/**
 * Page principale - Vidéo en boucle sur fond noir
 */
export default function InterpretPage() {
  return (
    <div className="h-screen w-full bg-black flex items-center justify-center overflow-hidden">
      {/* Vidéo d'attente - 9:16 portrait */}
      <video
        src="/tirage.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ maxHeight: "100vh" }}
      />
    </div>
  );
}