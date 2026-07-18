// components/astro-dice/index.ts
export { default as AstroDiceSet } from './AstroDiceSet';
export type { AstroDiceSetProps } from './AstroDiceSet';
export {
  PLANETS,
  SIGNS,
  HOUSES,
  DIE_FACES,
  DICE_PALETTE,
  DICE_SKINS,
  randomTargetFaces,
} from './glyphs';
export type {
  TargetFaces,
  DieKind,
  DiceSkin,
  DiceSkinInput,
  PlanetGlyph,
  SignGlyph,
  HouseNumber,
} from './glyphs';
