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
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
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