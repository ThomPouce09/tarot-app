'use client';

import Link from 'next/link';

const HEX = {
  numero: '03',
  name: 'le commencement difficile',
  glyph: '☵☰',
  pinyin: 'zhūn',
  superior: { symbol: '☵', name: 'eau', meaning: 'le danger, l’abîme, le flux caché.' },
  inferior: { symbol: '☰', name: 'ciel', meaning: 'la force créatrice, l’action lumineuse.' },
};

const SECTIONS = [
  { label: 'la situation', body: 'lorem ipsum dolor sit amet, les étoiles murmurent une vérité ancienne. le destin tisse des fils d’or et d’ombre, et la voie qui s’ouvre demande patience et foi. consulte le silence avant d’agir, car le mouvement précipité épuise la force naissante.' },
  { label: 'les défis', body: 'sed do eiusmod tempor incididunt ut labore. les obstacles surgissent comme brume sur l’eau ; ils ne sont pas des murs mais des seuils. accueille la résistance comme un maître discret qui enseigne la mesure.' },
  { label: 'le conseil', body: 'ut enim ad minim veniam, quis nostrud exercitation. avance par petits pas fermes, garde ton centre clair. ce qui paraît lent est souvent le chemin juste vers la plénitude.' },
  { label: 'la synthèse', body: 'duis aute irure dolor in reprehenderit. l’hexagramme rappelle que tout commencement porte sa propre difficulté, et que cette difficulté est le berceau de la grandeur à venir.' },
];

function Variant({ title, desc, fontTitle, titleSize }: {
  title: string; desc: string; fontTitle: string; titleSize?: string;
}) {
  const CORMORANT = 'Arial, sans-serif';
  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm my-6">
      <p className="text-yellow-500/70 text-xs uppercase tracking-[0.2em] mb-1">{title}</p>
      <p className="text-gray-400 text-xs mb-4">{desc}</p>

      <div className="flex items-center justify-between mb-4">
        <h1 className={`${titleSize || 'text-2xl'}`} style={{ fontFamily: fontTitle, color: '#facc15', fontWeight: 400 }}>
          le yi jing a parlé
        </h1>
        <span className="text-yellow-400 text-3xl font-bold leading-none">×</span>
      </div>

      <div className="p-5 rounded-xl border border-yellow-500/20 bg-black/30 mb-5">
        <div className="flex items-center gap-4">
          <span className="text-5xl leading-none" style={{ fontFamily: fontTitle, color: '#facc15', fontWeight: 400 }}>{HEX.glyph}</span>
          <div>
            <p className="text-yellow-200 text-xs font-semibold tracking-wide mb-1">baguette tirée : {HEX.numero}</p>
            <p className={`${titleSize || 'text-2xl'}`} style={{ fontFamily: fontTitle, color: '#facc15', fontWeight: 400 }}>{HEX.name}</p>
            <p className="text-yellow-400/80 text-xs italic mt-0.5">{HEX.pinyin}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {SECTIONS.map((s) => (
          <div key={s.label}>
            <h2 className="text-lg mb-1.5" style={{ fontFamily: fontTitle, color: '#fde68a', fontWeight: 400 }}>{s.label}</h2>
            <p className="text-gray-200 text-[15px] leading-relaxed" style={{ fontFamily: CORMORANT }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InterpretPreview() {
  const HOSHIKO = '"Hoshiko Satsuki", serif';
  const SPELL = '"Spell of Asia", serif';
  const KOREAN = '"Korean Calligraphy Accent", serif';

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link href="/" className="text-yellow-400 text-sm hover:text-yellow-300">← retour</Link>
        <h1 className="text-center text-3xl font-serif text-yellow-400 my-6">aperçu calligraphies</h1>

        <Variant
          title="a — hoshiko satsuki"
          desc="léger (400), espacement par défaut. pas de gras."
          fontTitle={HOSHIKO}
        />
        <Variant
          title="b — spell of asia"
          desc="espacement par défaut + titres un peu plus grands."
          fontTitle={SPELL}
          titleSize="text-3xl"
        />
        <Variant
          title="c — korean calligraphy"
          desc="espacement par défaut + accents français corrigés (15/19)."
          fontTitle={KOREAN}
          titleSize="text-3xl"
        />

        <div className="w-full max-w-2xl mx-auto p-4 rounded-2xl border border-yellow-500/30 bg-black/40 my-2">
          <p className="text-yellow-500/70 text-xs uppercase tracking-[0.2em] mb-2">test espacement accents</p>
          <p style={{ fontFamily: KOREAN, color: '#facc15', fontSize: 28, fontWeight: 400 }}>
            révélation éclairée — café créé — naïf ça ûtre
          </p>
          <p className="text-gray-500 text-xs mt-2">si les accents collent à la lettre suivante, l’espace n’est pas pris en compte.</p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-10">
          dis-moi laquelle appliquer à la vraie page.
        </p>
      </div>
    </div>
  );
}
