// Envoi immédiat d'une lettre mystique à un compte précis, avec le rendu
// réel (aucune modification de lastLetterSentAt, aucune IA).
// Usage : npx tsx scripts/_send-letter.ts <email>
import { buildLetterData, renderLetter } from '@/lib/letter';
import { mailer, MAIL_FROM } from '@/lib/mailer';

const email = process.argv[2];
if (!email) {
  console.error('usage: npx tsx scripts/_send-letter.ts <email>');
  process.exit(1);
}

(async () => {
  const data = await buildLetterData(email.trim().toLowerCase());
  if (!data) {
    console.error('utilisateur introuvable :', email);
    process.exit(1);
  }
  const html = renderLetter(data);
  const info = await mailer.sendMail({
    from: MAIL_FROM,
    to: data.email,
    subject: `Votre lettre mystique — ${data.firstName}`,
    html,
  });
  console.log('ENVOYÉ à', data.email, '| id:', info.messageId, '|', html.length, 'octets');
})();
