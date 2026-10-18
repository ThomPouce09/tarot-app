// lib/disposable-emails.ts — Domaines d'emails jetables / temporaires.
// Anti-abus étage 1 : un email jetable ne peut pas créer un compte, ce qui
// ferme la porte principale du « multi-comptes pour gratter le pack de
// bienvenue ». Liste resserrée sur les fournisseurs réellement utilisés ; on
// l'étend au fil des signalements d'abus (pas besoin d'être exhaustive : le
// jeton d'appareil, côté serveur, complète la friction).

const DISPOSABLE_DOMAINS = new Set<string>([
  // 10 minutes / minutes-based
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '6to23.com',
  'minutemail.com', 'nowmymail.com',
  // temp-*
  'temp-mail.org', 'temp-mail.io', 'temp-mail.xyz', 'tempmail.com', 'tempmail.net',
  'tempmail.org', 'tempmail.io', 'tempmail.sbs', 'tempmailo.com', 'tempmail.app',
  'temp-mail.ru', 'tempinbox.com', 'tempinbox.co.uk', 'tempinbox.io', 'tempbehaber.org',
  'tempmailer.com', 'temptmail.customer.cc', 'tempr.email', 'tempail.com', 'tempmailo.net',
  // guerrilla / shark
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.biz', 'guerrillamailblock.com', 'grr.la', 'sharklasers.com',
  // mailinator / maildrop / mail.tm family
  'mailinator.com', 'mailinator.net', 'maildrop.cc', 'mail.tm', 'mailin.io',
  'mail-sink.com', 'mbox.re', 'mbox.la', 'mbox.lol', 'mbox.ltd', 'mailexpire.com',
  // yopmail
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yopmail.gq', 'yopmail.co',
  'yopmail.biz', 'yopmail.in', 'yopmail.it', 'yopmail.org', 'yopmail.ru', 'yopmail.us',
  // trash
  'trashmail.com', 'trashmail.de', 'trashmail.fr', 'trashmail.me', 'trashmail.org',
  'trashmail.at', 'trashmail.co', 'trashmail.io', 'trashmail.se', 'trashmail24.com',
  'trashymail.com', 'trashymail.net', 'trash2003.com', 'mytrashmail.com',
  // nada / mohmal / moakt
  'getnada.com', 'nada.email', 'nada.ltd', 'mohmal.com', 'mohmal.im', 'mohmal.in',
  'mohmal.tech', 'mohmal.xyz', 'moakt.com', 'moakt.co', 'moakt.email', 'moakt.net',
  'moakt.ws',
  // throwaway / discard
  'throwawaymail.com', 'throwaway.email', 'throwaway8.com', 'discard.email',
  'discardmail.com', 'discardmail.de', 'discard.gg', 'discard.it', 'discard.wtf',
  'discard.company', 'discard.services', 'discardable.email',
  // spamgourmet / spam
  'spamgourmet.com', 'spamgourmet.org', 'spamgourmet.net', 'spam4.me', 'spamavert.com',
  'spamcanned.com', 'spamdestructor.com', 'spamex.com', 'spaml.com', 'spamoff.de',
  'spamspot.com', 'spamtrail.com', 'spamavert.com',
  // burner / temp services
  'burnermail.io', 'getairmail.com', 'getairmail.eu', 'getairmail.info', 'getairmail.nl',
  'getairmail.org', 'getairmail.se', 'mailcatch.com', 'mailcatch.me', 'mailnesia.com',
  'harakirimail.com', 'mailtemp.info', 'mailtemp.com', 'byom.de', 'getmail.no',
  // misc fournisseurs connus
  'dispostable.com', 'disbox.net', 'disbox.org', 'inboxkitten.com', 'inboxclean.com',
  'inboxclean.org', 'dropmail.me', 'fakemail.net', 'fakeemail.de', 'getairmail.net',
  'temp-mail.com', 'tempm.com', 'tempm.cn', 'tmpmail.org', 'tmpmail.net', 'tinymail.org',
  'getairmail.co', 'interim.email', '1secmail.com', '1secmail.org', '1secmail.net',
  'instantemailaddress.com', 'mailsac.com', 'mbox.re', 'reconmail.com', 'trbvb.com',
  // agrégateurs / alias publics souvent détournés pour le multi-compte
  '33mail.com', 'mailnesia.com', 'getairmail.biz', 'tempinbox.biz', 'spamok.com',
]);

// Sous-domaines attrapés en catch-all (un fournisseur peut en multiplier).
const DISPOSABLE_SUFFIXES = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'yopmail.com',
  'trashmail.com', 'temp-mail.org', 'moakt.com', 'discardmail.com', 'mail.tm',
  'maildrop.cc', 'inboxkitten.com', 'spamgourmet.com', 'temp-mail.io', 'mohmal.com',
];

/** Vrai si l'email appartient à un fournisseur d'emails jetables connus. */
export function isDisposableEmail(email: string): boolean {
  const domain = String(email).toLowerCase().trim().split('@')[1] || '';
  if (!domain) return false;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  return DISPOSABLE_SUFFIXES.some((s) => domain === s || domain.endsWith('.' + s));
}
