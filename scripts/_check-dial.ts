import { composePhone, normalizePhone, isValidPhone } from '../lib/phone';
import { DIAL_COUNTRIES, DEFAULT_DIAL } from '../lib/countries';

const cases: [string, string, string][] = [
  ['+33', '6 12 34 56 78', '0612345678'],   // FR mobile sans 0 → clé nationale FR
  ['+33', '06 12 34 56 78', '0612345678'],  // idem avec 0 (erreur humaine tolérée)
  ['+33', '01 23 45 67 89', '0123456789'],  // FR fixe
  ['+1', '212 555 0173', '+12125550173'],   // US
  ['+44', '20 7946 0958', '+442079460958'], // UK
  ['+91', '9876543210', '+919876543210'],   // IN
  ['', '0612345678', '0612345678'],         // pas de select → saisie brute
  ['+33', '+33 6 12 34 56 78', '0612345678'], // saisie déjà internationale
  ['+33', '0033 6 12 34 56 78', '0612345678'], // 00 international toléré
];
let bad = 0;
for (const [dial, nat, want] of cases) {
  const got = composePhone(dial, nat);
  const ok = got === want && isValidPhone(got);
  if (!ok) bad++;
  console.log((ok ? 'OK  ' : 'FAIL'), JSON.stringify(dial), JSON.stringify(nat), '→', got, ok ? '' : '(attendu ' + want + ')');
}
console.log('pays:', DIAL_COUNTRIES.length, '| défaut:', DEFAULT_DIAL, '|', DIAL_COUNTRIES[0].label);
const fr = DIAL_COUNTRIES.find(c => c.iso === 'FR')!;
console.log('FR:', fr.flag, fr.dial, '| tri:', DIAL_COUNTRIES[1].iso, DIAL_COUNTRIES[2].iso);

// ── split/display (Mon espace : partir du STOCKÉ, pas de la saisie) ──
import { splitStoredPhone, phoneDisplay } from '../lib/phone';
const sd: [string, string, string][] = [
  ['0612345678', '+33', '612345678'],
  ['+12125550173', '+1', '2125550173'],
  ['+442079460958', '+44', '2079460958'],
  ['+33612345678', '+33', '612345678'],   // au cas où dulegacy international
];
let bad2 = 0;
for (const [stored, d, n] of sd) {
  const got = splitStoredPhone(stored);
  const ok = got.dial === d && got.national === n;
  if (!ok) bad2++;
  console.log((ok ? 'OK  ' : 'FAIL'), 'split', stored, '→', JSON.stringify(got));
}
console.log('display FR :', phoneDisplay('0612345678'));
console.log('display US :', phoneDisplay('+12125550173'));
console.log('round-trip :', composePhone(splitStoredPhone('0612345678').dial, splitStoredPhone('0612345678').national));
process.exit(bad2 ? 1 : 0);
