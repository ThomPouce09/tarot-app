'use client';

// components/astro-dice/AstroDiceSet.tsx
//
// <AstroDiceSet/> — Trois dés à 12 faces (dodécaèdres) divinatoires lancés dans
// une ARÈNE OVOÏDE (elliptique) vue de dessus (top-down). Les dés roulent
// librement, rebondissent contre la paroi de l'arène et les uns contre les
// autres, puis s'immobilisent en douceur sur les faces cibles imposées.
//
// Stack : React 18 + @react-three/fiber@8 + @react-three/drei@9 + three@0.160.
//
// Architecture : une simulation physique 2D légère (plan XZ) partagée par les
// trois dés — nécessaire pour gérer les collisions dé↔dé. Pas de moteur externe :
// collisions cercle-cercle + réflexion sur ellipse, assez fluide pour mobile.

import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Environment, ContactShadows } from '@react-three/drei';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import {
  DIE_FACES,
  DICE_PALETTE,
  type DieKind,
  type TargetFaces,
  type DiceSkinInput,
  type DiceSkin,
  resolveSkin,
} from './glyphs';

/* -------------------------------------------------------------------------- */
/*  Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface AstroDiceSetProps {
  /** Déclenche le lancer. Passe true pour lancer, l'anim se joue puis se fige. */
  isRolling: boolean;
  /** Faces sur lesquelles les 3 dés doivent impérativement s'arrêter. */
  targetFaces: TargetFaces;
  /** Durée totale approximative du lancer (ms). Défaut 2200. */
  rollDurationMs?: number;
  /** Callback appelé quand les 3 dés sont immobilisés sur leurs faces cibles. */
  onRest?: (faces: TargetFaces) => void;
  /** Hauteur du canvas (CSS). Défaut 420. */
  height?: number | string;
  /** Police .ttf/.woff des glyphes astro. Défaut DejaVuSans (couvre ♃♆♇♈…). */
  font?: string;
  /**
   * Skin d'apparence des dés + arène. Accepte une clé prédéfinie
   * ('classic' | 'onyx' | 'ivory' | 'emerald') ou un objet partiel custom
   * ({ body, edges, glyph, mat, accent, shadow }). Défaut 'classic'.
   */
  skin?: DiceSkinInput;
  /**
   * Fond CSS du conteneur. Chaîne CSS valide : couleur, gradient, ou
   * 'transparent' pour laisser voir ce qui est derrière le composant.
   * Défaut : dégradé radial brique/ocre.
   */
  background?: string;
  /** Classe CSS du conteneur. */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Constantes de l'arène ovoïde                                                */
/* -------------------------------------------------------------------------- */

const DIE_RADIUS = 0.62;
// Rayon de l'arène circulaire (vue de dessus).
const ARENA_R = 3.3;

// Police par défaut : DejaVuSans couvre les 24 glyphes astro.
const DEFAULT_FONT = '/fonts/DejaVuSans.ttf';

/* -------------------------------------------------------------------------- */
/*  Géométrie : centres + orientations des 12 faces d'un dodécaèdre            */
/* -------------------------------------------------------------------------- */

interface FaceLayout {
  center: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

function computeDodecaFaces(radius: number): FaceLayout[] {
  const geom = new THREE.DodecahedronGeometry(radius, 0);
  const pos = geom.getAttribute('position') as THREE.BufferAttribute;
  const triCount = pos.count / 3;

  interface Bucket {
    normal: THREE.Vector3;
    sum: THREE.Vector3;
    n: number;
  }
  const buckets: Bucket[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3 + 0);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    nrm.crossVectors(ab, ac).normalize();

    let bucket = buckets.find((k) => k.normal.dot(nrm) > 0.99);
    if (!bucket) {
      bucket = { normal: nrm.clone(), sum: new THREE.Vector3(), n: 0 };
      buckets.push(bucket);
    }
    bucket.sum.add(a).add(b).add(c);
    bucket.n += 3;
  }
  geom.dispose();

  return buckets.map((k) => {
    const center = k.sum.clone().multiplyScalar(1 / k.n);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      k.normal.clone().normalize(),
    );
    return { center, quaternion };
  });
}

/** Quaternion amenant la face `index` à pointer vers le haut (+Y, caméra). */
function faceUpQuaternion(faces: FaceLayout[], index: number): THREE.Quaternion {
  const faceQ = faces[index]?.quaternion ?? new THREE.Quaternion();
  const faceNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(faceQ);
  return new THREE.Quaternion().setFromUnitVectors(
    faceNormal,
    new THREE.Vector3(0, 1, 0),
  );
}

/* -------------------------------------------------------------------------- */
/*  Mesh d'un dé (dodécaèdre + 12 glyphes gravés)                              */
/* -------------------------------------------------------------------------- */

interface DieMeshProps {
  kind: DieKind;
  faces: FaceLayout[];
  skin: DiceSkin;
  font?: string;
}

function DieMesh({ kind, faces, skin, font }: DieMeshProps) {
  const labels = DIE_FACES[kind];
  return (
    <>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[DIE_RADIUS, 0]} />
        <meshStandardMaterial
          color={skin.body}
          roughness={0.42}
          metalness={0.15}
          flatShading
        />
      </mesh>
      <lineSegments>
        <edgesGeometry
          args={[new THREE.DodecahedronGeometry(DIE_RADIUS * 1.001, 0)]}
        />
        <lineBasicMaterial color={skin.edges} />
      </lineSegments>
      {faces.map((f, i) => {
        const p = f.center
          .clone()
          .add(
            new THREE.Vector3(0, 0, 1)
              .applyQuaternion(f.quaternion)
              .multiplyScalar(0.01),
          );
        return (
          <Text
            key={`${kind}-${i}`}
            position={[p.x, p.y, p.z]}
            quaternion={f.quaternion}
            fontSize={kind === 'house' ? 0.3 : 0.35}
            color={skin.glyph}
            anchorX="center"
            anchorY="middle"
            font={font ?? DEFAULT_FONT}
            outlineWidth={0.005}
            outlineColor={DICE_PALETTE.brickDark}
          >
            {labels[i] ?? ''}
          </Text>
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Simulation physique partagée des 3 dés dans l'arène ovoïde                 */
/* -------------------------------------------------------------------------- */

interface Body {
  pos: THREE.Vector2; // (x, z) dans le plan de l'arène
  vel: THREE.Vector2;
  spinAxis: THREE.Vector3; // axe de roulement 3D
  spinSpeed: number; // rad/s
  hop: number; // hauteur de sursaut lissée (roulement vivant)
  target: THREE.Quaternion; // orientation finale (face cible vers le haut)
  settlePos: THREE.Vector2;
}

const DICE_KINDS: DieKind[] = ['planet', 'sign', 'house'];
const FRICTION = 1.35; // amortissement linéaire (par seconde)
const WALL_RESTITUTION = 0.82;
const DIE_RESTITUTION = 0.9;
const SETTLE_SPEED = 0.12; // en-deçà, on considère le dé quasi arrêté

/** Dévie doucement un axe de spin vers une nouvelle direction aléatoire.
 *  `amount` ∈ [0,1] : 0 = inchangé, 1 = totalement remplacé. Un petit blend
 *  évite les saccades de rotation lors des collisions. */
function nudgeSpinAxis(axis: THREE.Vector3, amount: number) {
  const rnd = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5,
  ).normalize();
  axis.lerp(rnd, amount).normalize();
}

function DiceArena({
  isRolling,
  targetIndices,
  rollDurationMs,
  skin,
  font,
  onAllRest,
}: {
  isRolling: boolean;
  targetIndices: Record<DieKind, number>;
  rollDurationMs: number;
  skin: DiceSkin;
  font?: string;
  onAllRest: () => void;
}) {
  const groups = [
    useRef<THREE.Group>(null!),
    useRef<THREE.Group>(null!),
    useRef<THREE.Group>(null!),
  ];
  const faces = useMemo(() => computeDodecaFaces(DIE_RADIUS), []);

  const sim = useRef({
    active: false,
    phase: 'idle' as 'idle' | 'roll' | 'settle',
    startedAt: 0,
    prevTime: 0,
    settleStart: 0,
    notified: false,
    bodies: [] as Body[],
  });

  // Positions de repos finales, réparties dans l'ovoïde (ne se chevauchent pas).
  const restSlots = useMemo<[number, number][]>(
    () => [
      [-1.7, 0.55],
      [0, -0.7],
      [1.7, 0.55],
    ],
    [],
  );

  useEffect(() => {
    if (!isRolling) return;
    const s = sim.current;
    const now = performance.now();
    s.active = true;
    s.phase = 'roll';
    s.startedAt = now;
    s.prevTime = now;
    s.notified = false;

    // Lance les 3 dés depuis des points de départ dispersés, vers le centre,
    // avec vitesses et spins aléatoires → trajectoires organiques + collisions.
    s.bodies = DICE_KINDS.map((kind, i) => {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.8;
      const startR = 0.6;
      const pos = new THREE.Vector2(
        Math.cos(angle) * startR * ARENA_R * 0.4,
        Math.sin(angle) * startR * ARENA_R * 0.4,
      );
      // Vitesse initiale forte, direction semi-aléatoire.
      const speed = 6 + Math.random() * 3;
      const vdir = Math.random() * Math.PI * 2;
      const vel = new THREE.Vector2(
        Math.cos(vdir) * speed,
        Math.sin(vdir) * speed,
      );
      const spinAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      return {
        pos,
        vel,
        spinAxis,
        spinSpeed: 16 + Math.random() * 10,
        hop: 0,
        target: faceUpQuaternion(faces, targetIndices[kind]),
        settlePos: new THREE.Vector2(...restSlots[i]),
      } as Body;
    });
  }, [isRolling, targetIndices, faces, restSlots]);

  useFrame(() => {
    const s = sim.current;
    if (!s.active) return;
    const now = performance.now();
    const dt = Math.min((now - s.prevTime) / 1000, 0.04);
    s.prevTime = now;
    const bodies = s.bodies;

    if (s.phase === 'roll') {
      // ── Intégration + collisions ──
      for (const b of bodies) {
        // friction exponentielle
        const damp = Math.exp(-FRICTION * dt);
        b.vel.multiplyScalar(damp);
        b.pos.addScaledVector(b.vel, dt);
        // La vitesse de spin CIBLE suit la vitesse linéaire (roulement), mais on
        // l'approche en douceur pour éviter tout à-coup lors d'un choc.
        const targetSpin = 4 + b.vel.length() * 2.4;
        const k = 1 - Math.exp(-6 * dt); // lissage exponentiel (~indépendant du fps)
        b.spinSpeed += (targetSpin - b.spinSpeed) * k;
      }

      // Collisions dé ↔ dé (cercle-cercle, plan XZ)
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const A = bodies[i];
          const B = bodies[j];
          const delta = B.pos.clone().sub(A.pos);
          const dist = delta.length();
          const minDist = DIE_RADIUS * 2;
          if (dist > 0 && dist < minDist) {
            const n = delta.clone().divideScalar(dist);
            const overlap = minDist - dist;
            // sépare les deux corps
            A.pos.addScaledVector(n, -overlap / 2);
            B.pos.addScaledVector(n, overlap / 2);
            // échange d'impulsion le long de la normale (masses égales)
            const relVel = B.vel.clone().sub(A.vel);
            const sep = relVel.dot(n);
            if (sep < 0) {
              const imp = -(1 + DIE_RESTITUTION) * sep * 0.5;
              A.vel.addScaledVector(n, -imp);
              B.vel.addScaledVector(n, imp);
              // Dévie légèrement l'axe de spin (blend doux) plutôt que de le
              // remplacer sèchement → pas de saccade visuelle au contact.
              nudgeSpinAxis(A.spinAxis, 0.35);
              nudgeSpinAxis(B.spinAxis, 0.35);
            }
          }
        }
      }

      // Collision avec la paroi ronde : on teste le point normalisé sur le
      // cercle réduit du rayon du dé, et on réfléchit la vitesse.
      for (const b of bodies) {
        const rx = ARENA_R - DIE_RADIUS;
        const rz = ARENA_R - DIE_RADIUS;
        const e = (b.pos.x * b.pos.x) / (rx * rx) + (b.pos.y * b.pos.y) / (rz * rz);
        if (e > 1) {
          // normale extérieure de l'ellipse ∝ (x/rx², z/rz²)
          const n = new THREE.Vector2(
            b.pos.x / (rx * rx),
            b.pos.y / (rz * rz),
          ).normalize();
          // repousse le corps sur la paroi
          const scale = 1 / Math.sqrt(e);
          b.pos.multiplyScalar(scale);
          // réflexion : v' = v - (1+r)(v·n)n
          const vn = b.vel.dot(n);
          if (vn > 0) b.vel.addScaledVector(n, -(1 + WALL_RESTITUTION) * vn);
        }
      }

      // Rendu de la phase roll
      bodies.forEach((b, i) => {
        const g = groups[i].current;
        if (!g) return;
        const speed = b.vel.length();

        // Crossfade spin-aléatoire → alignement face cible.
        // Tant que le dé va vite, il tourne librement (roulement). Dès qu'il
        // ralentit, la rotation aléatoire S'ÉTEINT (spinFactor→0) pendant que
        // l'alignement vers la cible PREND LE RELAIS (alignFactor→1). Les deux
        // sont normés pour sommer à 1 → AUCUNE rotation résiduelle à l'arrêt,
        // donc plus aucun « tour forcé » en fin d'animation.
        const spinFactor = Math.min(speed / 2.5, 1); // 1 = plein roulement
        const alignFactor = 1 - spinFactor; // 1 = pleinement calé

        // 1) Spin aléatoire décroissant (ne fait plus tourner à l'arrêt).
        const dq = new THREE.Quaternion().setFromAxisAngle(
          b.spinAxis,
          b.spinSpeed * dt * spinFactor,
        );
        g.quaternion.premultiply(dq);

        // 2) Alignement vers la face cible, en miroir (monte quand le spin baisse).
        if (alignFactor > 0) {
          const alignK = 1 - Math.exp(-6 * dt);
          g.quaternion.slerp(b.target, alignK * alignFactor);
        }

        // Sursaut vertical lissé : la cible suit la vitesse, mais on l'approche
        // en douceur → pas de bond sec au moment d'un choc.
        const hopTarget = Math.min(speed * 0.04, 0.3);
        const hk = 1 - Math.exp(-8 * dt);
        b.hop += (hopTarget - b.hop) * hk;
        g.position.set(b.pos.x, DIE_RADIUS + b.hop, b.pos.y);
      });

      // Conditions de passage en phase settle : temps écoulé OU énergie dissipée
      const elapsed = now - s.startedAt;
      const maxSpeed = Math.max(...bodies.map((b) => b.vel.length()));
      if (elapsed > rollDurationMs || maxSpeed < SETTLE_SPEED) {
        s.phase = 'settle';
        s.settleStart = now;
        bodies.forEach((b, i) => {
          // Immobilisation SUR PLACE : on fige la position physique courante
          // (les collisions ont déjà séparé les dés → pas de chevauchement).
          b.settlePos.copy(b.pos);
          b.vel.set(0, 0);
        });
      }
    } else if (s.phase === 'settle') {
      // Immobilisation finale : le dé est DÉJÀ calé sur sa face (crossfade en fin
      // de roulement). On ne touche PLUS l'orientation — uniquement la pose au
      // sol. Aucune rotation résiduelle → fin d'animation 100% naturelle.
      const SETTLE_DUR = 220;
      const t = Math.min((now - s.settleStart) / SETTLE_DUR, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      bodies.forEach((b, i) => {
        const g = groups[i].current;
        if (!g) return;
        // L'orientation est figée (déjà sur la face cible) : on ne la modifie pas.
        const y = DIE_RADIUS + (1 - ease) * 0.06; // pose au sol quasi nulle
        g.position.set(b.settlePos.x, y, b.settlePos.y);
      });

      if (t >= 1) {
        bodies.forEach((b, i) => {
          const g = groups[i].current;
          // Sécurité : on verrouille exactement la face cible (saut nul si déjà calé).
          g.quaternion.copy(b.target);
          g.position.set(b.settlePos.x, DIE_RADIUS, b.settlePos.y);
        });
        s.phase = 'idle';
        s.active = false;
        if (!s.notified) {
          s.notified = true;
          onAllRest();
        }
      }
    }
  });

  return (
    <>
      {DICE_KINDS.map((kind, i) => (
        <group
          key={kind}
          ref={groups[i]}
          position={[restSlots[i][0], DIE_RADIUS, restSlots[i][1]]}
        >
          <DieMesh kind={kind} faces={faces} skin={skin} font={font} />
        </group>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Rig caméra responsive : recule pour faire tenir toute l'ellipse à l'écran  */
/* -------------------------------------------------------------------------- */

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    // Demi-étendue à cadrer (ellipse + marge). En portrait (aspect<1),
    // c'est la hauteur (axe Z) qui contraint → on recule davantage.
    const margin = 1.32;
    const halfX = ARENA_R * margin;
    const halfZ = ARENA_R * margin;
    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    // Distance requise pour cadrer verticalement (Z) et horizontalement (X).
    const distV = halfZ / Math.tan(vFov / 2);
    const distH = halfX / (Math.tan(vFov / 2) * aspect);
    const dist = Math.max(distV, distH);
    // Vue ZÉNITHALE PURE : caméra exactement au-dessus, regardant vers le bas.
    // up=(0,0,-1) car avec un regard vertical l'up par défaut (0,1,0) devient
    // colinéaire à la direction de visée → orientation indéfinie. L'écran "+Z"
    // pointe alors vers le bas de l'arène.
    cam.up.set(0, 0, -1);
    cam.position.set(0, dist, 0);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Champ d'étoiles sur le tapis (vu de dessus)                                */
/* -------------------------------------------------------------------------- */

function StarField({ radius, color = '#fdf6d8' }: { radius: number; color?: string }) {
  // Positions étoiles générées une fois, réparties dans le disque du tapis.
  const points = useMemo(() => {
    const n = 90;
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (radius - 0.15);
      arr.push(new THREE.Vector3(Math.cos(a) * r, 0.005, Math.sin(a) * r));
    }
    return arr;
  }, [radius]);

  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* petite pastille = étoile vue de dessus */}
          <circleGeometry args={[0.02 + Math.random() * 0.015, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scène                                                                       */
/* -------------------------------------------------------------------------- */

function Scene({
  isRolling,
  targetFaces,
  rollDurationMs,
  skin,
  font,
  onRest,
}: Required<
  Pick<AstroDiceSetProps, 'isRolling' | 'targetFaces' | 'rollDurationMs'>
> &
  Pick<AstroDiceSetProps, 'font' | 'onRest'> & { skin: DiceSkin }) {
  const targetIndices = useMemo<Record<DieKind, number>>(() => {
    const planet = DIE_FACES.planet.indexOf(targetFaces.planet);
    const sign = DIE_FACES.sign.indexOf(targetFaces.sign);
    const house = DIE_FACES.house.indexOf(String(targetFaces.house));
    return {
      planet: planet < 0 ? 0 : planet,
      sign: sign < 0 ? 0 : sign,
      house: house < 0 ? 0 : house,
    };
  }, [targetFaces]);

  const handleAllRest = useCallback(() => {
    onRest?.(targetFaces);
  }, [onRest, targetFaces]);

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.55} color="#f6e6c8" />
      <directionalLight
        position={[2.5, 7, 2]}
        intensity={1.4}
        color="#fff3dc"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight
        position={[-4, 2.5, -2]}
        intensity={0.6}
        color={skin.accent}
      />

      {/* ── Arène RONDE vue de dessus : lisible comme une zone de lancer ── */}
      {/* Sol */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[ARENA_R, 96]} />
        <meshStandardMaterial
          color={skin.mat}
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* Champ d'étoiles sur le tapis (skin à thème nuit) */}
      {skin.stars && <StarField radius={ARENA_R} color={skin.glyph === '#3a2f4a' ? '#fdf6d8' : skin.accent} />}

      {/* Liseré ÉPAIS = rebord de l'arène (se lit bien de dessus) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
      >
        <ringGeometry args={[ARENA_R * 0.92, ARENA_R, 96]} />
        <meshStandardMaterial
          color={skin.accent}
          roughness={0.4}
          metalness={0.6}
          emissive={skin.accent}
          emissiveIntensity={0.18}
        />
      </mesh>

      {/* Cercles concentriques gravés = repère de zone de lancer, vu de dessus */}
      {[0.62, 0.34].map((r) => (
        <mesh
          key={r}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.004, 0]}
        >
          <ringGeometry args={[r * ARENA_R - 0.012, r * ARENA_R + 0.012, 96]} />
          <meshBasicMaterial color={skin.edges} transparent opacity={0.4} />
        </mesh>
      ))}
      <DiceArena
        isRolling={isRolling}
        targetIndices={targetIndices}
        rollDurationMs={rollDurationMs}
        skin={skin}
        font={font}
        onAllRest={handleAllRest}
      />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={10}
        blur={2.4}
        far={4}
        color={skin.shadow}
      />
      <Environment preset="sunset" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composant public                                                           */
/* -------------------------------------------------------------------------- */

export default function AstroDiceSet({
  isRolling,
  targetFaces,
  rollDurationMs = 3000,
  onRest,
  height = 420,
  font,
  skin,
  background,
  className,
}: AstroDiceSetProps) {
  const resolvedSkin = useMemo(() => resolveSkin(skin), [skin]);
  // Fond : chaîne CSS personnalisée, 'transparent' possible, sinon dégradé par
  // défaut. Le canvas est en alpha:true → 'transparent' laisse voir le dessous.
  // Le skin 'moon' bascule par défaut sur un ciel bleu nuit pour le bac.
  const resolvedBg =
    background ??
    (resolvedSkin.stars
      ? 'radial-gradient(ellipse at 50% 40%, #1b2752 0%, #060a1c 80%)'
      : `radial-gradient(ellipse at 50% 40%, #2a1710 0%, ${DICE_PALETTE.bg} 75%)`);
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        background: resolvedBg,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        // Position initiale neutre : c'est CameraRig (dans Scene) qui règle la
        // vue zénithale dès onCreated, pas cette valeur (sinon on garde un 3/4).
        camera={{ position: [0, 1, 0], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, -1);
          (camera as THREE.PerspectiveCamera).lookAt(0, 0, 0);
        }}
      >
        <Scene
          isRolling={isRolling}
          targetFaces={targetFaces}
          rollDurationMs={rollDurationMs}
          skin={resolvedSkin}
          font={font}
          onRest={onRest}
        />
      </Canvas>
    </div>
  );
}
