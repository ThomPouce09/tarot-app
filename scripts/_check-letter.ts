import { buildLetterData, renderLetter } from '@/lib/letter';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Contrôle final : la lettre rendue doit être valide et complète, pour les
// 4 langues, avec les vraies données des comptes de test.
const p = new PrismaClient();

(async () => {
  const checks = {
    tables: 0, imgs: 0, preheader: 0, mediaQuery: 0, unsub: 0,
    oracleSection: 0, momentLink: 0, doNotUseDiv: 0,
  };
  for (const email of ['tsalle@ik.me', 'tsalle@free.fr']) {
    const d = await buildLetterData(email);
    if (!d) { console.log('!!', email, 'introuvable'); continue; }
    for (const lang of ['fr', 'en', 'es', 'hi'] as const) {
      const dl = { ...d, lang };
      const html = renderLetter(dl);
      const ok =
        html.includes('<table') &&
        html.includes('/email/letter-header.png') &&
        html.includes('class="preheader"') &&
        html.includes('@media only screen') &&
        html.includes('/api/newsletter/unsubscribe') &&
        html.includes('letter-header.png') &&
        !html.includes('undefined') &&
        !html.includes('[object Object]');
      console.log(`${email} [${lang}] : ${ok ? 'OK' : 'PROBLÈME'} — ${html.length} octets`);
      if (email === 'tsalle@ik.me' && lang === 'fr') {
        checks.tables = html.split('<table').length - 1;
        checks.imgs = html.split('<img').length - 1;
        checks.preheader = html.includes('class="preheader"') ? 1 : 0;
        checks.mediaQuery = html.includes('@media only screen') ? 1 : 0;
        checks.unsub = html.includes('/api/newsletter/unsubscribe') ? 1 : 0;
        checks.oracleSection = html.includes('oracleTitle') || html.includes("Ce que l'oracle a vu") ? 1 : 0;
        checks.momentLink = html.includes('Relire ce tirage') ? 1 : 0;
        writeFileSync(join(process.cwd(), 'scripts', '_letter-preview.html'), html);
      }
    }
  }
  console.log();
  console.log('structures :', JSON.stringify(checks));
  await p.$disconnect();
})();
