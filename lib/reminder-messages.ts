// ── Rappel quotidien : roulement aléatoire des 16 messages (FR verbatim) ──
// Chaque jour, le cron choisit UN message au hasard parmi les 16, de façon
// déterministe (seed = date du jour) : tous les fuseaux voient le même
// message le même jour, et un retry du cron dans la journée reste idempotent
// (pas de changement de texte en cas de re-exécution).
// Langues : User.language (fr/en/es/hi) — même convention que lib/letter.
// Titres courts (< 30 car.) car Android tronque la ligne de titre.

export type ReminderUniverse = 'tarot' | 'yijing' | 'runes' | 'des';
export type NotifLang = 'fr' | 'en' | 'es' | 'hi';
const LANGS: NotifLang[] = ['fr', 'en', 'es', 'hi'];
export const normNotifLang = (v: unknown): NotifLang => {
  const l = String(v ?? '').slice(0, 2).toLowerCase() as NotifLang;
  return LANGS.includes(l) ? l : 'fr';
};

type L10n = Record<NotifLang, string>;

export interface ReminderMessage {
  index: number;
  universe: ReminderUniverse;
  title: L10n;
  body: L10n;
  url: string; // destination au tap (deep link)
}

// 16 textes FR fournis par l'utilisateur — verbatim, intouchables.
const RAW: Array<{ universe: ReminderUniverse; url: string; title: L10n; body: L10n }> = [
  // ── Tarot ──
  { universe: 'tarot', url: '/tarot',
    title: { fr: 'Lames du soir', en: 'Evening Cards', es: 'Cartas de la tarde', hi: 'संध्या की पत्तियाँ' },
    body: {
      fr: 'Une lame attend ton regard : ton tirage du soir bouleversera-t-il la donne ?',
      en: 'A card awaits your gaze: will tonight\u2019s draw upend the game?',
      es: 'Una carta espera tu mirada: ¿trastornará tu tirada de esta tarde el destino?',
      hi: 'एक पत्ती तेरी निगाह का इंतज़ार कर रही है: क्या आज की शाम की खींच पूरी चाल पलट देगी?',
    } },
  { universe: 'tarot', url: '/tarot',
    title: { fr: 'Lames du soir', en: 'Evening Cards', es: 'Cartas de la tarde', hi: 'संध्या की पत्तियाँ' },
    body: {
      fr: 'Le destin a distribué les cartes. Viens découvrir ce qu\u2019il te réserve.',
      en: 'Destiny has dealt the cards. Come and discover what it holds for you.',
      es: 'El destino ha repartido las cartas. Ven a descubrir lo que te reserva.',
      hi: 'भाग्य ने पत्तियाँ बाँट दी हैं। आओ, जानो वह तुम्हारे लिए क्या रखता है।',
    } },
  { universe: 'tarot', url: '/tarot',
    title: { fr: 'Lames du soir', en: 'Evening Cards', es: 'Cartas de la tarde', hi: 'संध्या की पत्तियाँ' },
    body: {
      fr: 'Arcanes majeurs ou secrets enfouis ? Tire une lame pour sonder l\u2019invisible.',
      en: 'Major arcanas or buried secrets? Draw a card to probe the unseen.',
      es: '¿Arcanos mayores o secretos ocultos? Saca una carta para sondear lo invisible.',
      hi: 'बड़े अरकान या छिपे राज़? अदृश्य को भाँपने के लिए एक पत्ती खींचो।',
    } },
  { universe: 'tarot', url: '/tarot',
    title: { fr: 'Lames du soir', en: 'Evening Cards', es: 'Cartas de la tarde', hi: 'संध्या की पत्तियाँ' },
    body: {
      fr: 'Ton intuition frémit : retourne ta carte pour voir ce qui se cache là.',
      en: 'Your intuition trembles: turn your card to see what lies hidden there.',
      es: 'Tu intuición tiembla: voltea tu carta para ver lo que se esconde ahí.',
      hi: 'तुम्हारा अंतर्ज्ञान काँप रहा है: पत्ती पलटो और देखो वहाँ क्या छिपा है।',
    } },
  // ── Yi Jing ──
  { universe: 'yijing', url: '/yi-jing-du-jour',
    title: { fr: 'Signe du Yi Jing', en: 'Yi Jing Omen', es: 'Señal del I Ching', hi: 'ई चिंग का संकेत' },
    body: {
      fr: 'Les vents du changement soufflent : consulte l\u2019Oracle pour trouver ta voie.',
      en: 'The winds of change are blowing: consult the Oracle to find your way.',
      es: 'Los vientos del cambio soplan: consulta al Oráculo para hallar tu camino.',
      hi: 'परिवर्तन की हवाएँ चल रही हैं: मार्ग पाने के लिए ओरैकल से पूछो।',
    } },
  { universe: 'yijing', url: '/yi-jing-du-jour',
    title: { fr: 'Signe du Yi Jing', en: 'Yi Jing Omen', es: 'Señal del I Ching', hi: 'ई चिंग का संकेत' },
    body: {
      fr: 'Une question, une mutation, une réponse. Laisse les hexagrammes guider ton esprit.',
      en: 'One question, one change, one answer. Let the hexagrams guide your mind.',
      es: 'Una pregunta, una mutación, una respuesta. Deja que los hexagramas guíen tu mente.',
      hi: 'एक प्रश्न, एक परिवर्तन, एक उत्तर। षट्कोणों को तुम्हारा मन चलाने दो।',
    } },
  { universe: 'yijing', url: '/yi-jing-du-jour',
    title: { fr: 'Signe du Yi Jing', en: 'Yi Jing Omen', es: 'Señal del I Ching', hi: 'ई चिंग का संकेत' },
    body: {
      fr: 'Le moment est venu de manipuler les baguettes d\u2019achillée : quel message résonnera pour toi ce soir ?',
      en: 'The time has come to handle the yarrow stalks: what message will resonate for you tonight?',
      es: 'Ha llegado el momento de manipular las varillas de aquilea: ¿qué mensaje resonará para ti esta noche?',
      hi: 'अच्छिली की छड़ें चलाने का समय आ गया है: आज शाम तुम्हारे लिए कौन-सा संदेश गूँजेगा?',
    } },
  { universe: 'yijing', url: '/yi-jing-du-jour',
    title: { fr: 'Signe du Yi Jing', en: 'Yi Jing Omen', es: 'Señal del I Ching', hi: 'ई चिंग का संकेत' },
    body: {
      fr: 'Équilibre ou nouveau tournant ? Ce que le Yi Jing peut révéler.',
      en: 'Balance or a new turning point? What the Yi Jing can reveal.',
      es: '¿Equilibrio o un nuevo giro? Lo que el I Ching puede revelar.',
      hi: 'संतुलन या नया मोड़? जो ई चिंग प्रकट कर सकता है।',
    } },
  // ── Runes scandinaves ──
  { universe: 'runes', url: '/runes',
    title: { fr: 'Pierres du Nord', en: 'Northern Stones', es: 'Piedras del Norte', hi: 'उत्तर की शिलाएँ' },
    body: {
      fr: 'Les pierres anciennes ont parlé. Viens lire le glyphe gravé pour ton moment.',
      en: 'The ancient stones have spoken. Come read the glyph carved for your moment.',
      es: 'Las piedras ancestrales han hablado. Ven a leer el glifo grabado para tu momento.',
      hi: 'प्राचीन शिलाएँ बोल उठी हैं। आओ, इस पल के लिए उकेरे चिह्न को पढ़ो।',
    } },
  { universe: 'runes', url: '/runes',
    title: { fr: 'Pierres du Nord', en: 'Northern Stones', es: 'Piedras del Norte', hi: 'उत्तर की शिलाएँ' },
    body: {
      fr: 'Un secret des anciens t\u2019attend au creux des runes. Oseras-tu les consulter ?',
      en: 'A secret of the ancients waits in the hollow of the runes. Will you dare consult them?',
      es: 'Un secreto de los antiguos te espera en el hueco de las runas. ¿Osarás consultarlas?',
      hi: 'पूर्वजों का एक राज़ रूनों की गोद में तुम्हारा इंतज़ार कर रहा है। क्या तुम पूछने का साहस करोगे?',
    } },
  { universe: 'runes', url: '/runes',
    title: { fr: 'Pierres du Nord', en: 'Northern Stones', es: 'Piedras del Norte', hi: 'उत्तर की शिलाएँ' },
    body: {
      fr: 'Tire ta rune et saisis l\u2019énergie en cours.',
      en: 'Draw your rune and seize the energy at work.',
      es: 'Saca tu runa y capta la energía en curso.',
      hi: 'अपना रून खींचो और चलती ऊर्जा को थामो।',
    } },
  { universe: 'runes', url: '/runes',
    title: { fr: 'Pierres du Nord', en: 'Northern Stones', es: 'Piedras del Norte', hi: 'उत्तर की शिलाएँ' },
    body: {
      fr: 'Quel mystère les runes vont-elles lever pour toi ce soir ?',
      en: 'What mystery will the runes unveil for you tonight?',
      es: '¿Qué misterio van a desvelar las runas para ti esta noche?',
      hi: 'क्या रहस्य रून आज शाम तुम्हारे लिए उजागर करेंगे?',
    } },
  // ── Dés zodiacaux ──
  { universe: 'des', url: '/des-divinatoires',
    title: { fr: 'Dés du Zodiaque', en: 'Zodiac Dice', es: 'Dados del Zodíaco', hi: 'राशि के पाशे' },
    body: {
      fr: 'Les astres se sont alignés pour jeter les dés. Vois ce que les étoiles ont à te murmurer.',
      en: 'The stars have aligned to cast the dice. See what the heavens whisper to you.',
      es: 'Los astros se han alineado para lanzar los dados. Mira lo que las estrellas te susurran.',
      hi: 'पाशे फेंकने के लिए नक्षत्र कतार में आ गए हैं। देखो तारे तुम्हें क्या कानाफूसी करना चाहते हैं।',
    } },
  { universe: 'des', url: '/des-divinatoires',
    title: { fr: 'Dés du Zodiaque', en: 'Zodiac Dice', es: 'Dados del Zodíaco', hi: 'राशि के पाशे' },
    body: {
      fr: 'Les dés roulent sous l\u2019impulsion du ciel : quelle tendance se dessine pour toi ?',
      en: 'The dice roll at the sky\u2019s bidding: which trend is shaping up for you?',
      es: 'Los dados ruedan bajo el impulso del cielo: ¿qué tendencia se dibuja para ti?',
      hi: 'आकाश के आदेश पर पाशे लुढ़क रहे हैं: तुम्हारे लिए कौन-सी लहर बन रही है?',
    } },
  { universe: 'des', url: '/des-divinatoires',
    title: { fr: 'Dés du Zodiaque', en: 'Zodiac Dice', es: 'Dados del Zodíaco', hi: 'राशि के पाशे' },
    body: {
      fr: 'Alchimie du zodiaque et du hasard : les dés t\u2019attendent dans leur gobelet.',
      en: 'Alchemy of zodiac and chance: the dice await you in their cup.',
      es: 'Alquimia del zodíaco y del azar: los dados te esperan en su vaso.',
      hi: 'राशिचक्र और संयोग की रसायन: पाशे अपने गिलास में तुम्हारा इंतज़ार कर रहे हैं।',
    } },
  { universe: 'des', url: '/des-divinatoires',
    title: { fr: 'Dés du Zodiaque', en: 'Zodiac Dice', es: 'Dados del Zodíaco', hi: 'राशि के पाशे' },
    body: {
      fr: 'Un simple jet de dés suffit parfois à y voir plus clair dans son zodiaque personnel.',
      en: 'A single cast of the dice is sometimes enough to see your personal zodiac more clearly.',
      es: 'A veces basta un simple lanzamiento de dados para ver más claro en tu zodíaco personal.',
      hi: 'कभी-कभी बस एक पाशे-दान अपने निजी राशिचक्र को और साफ़ देखने के लिए काफ़ी होता है।',
    } },
];

export const REMINDER_MESSAGES: ReminderMessage[] = RAW.map((r, index) => ({ index, ...r }));

// Hash FNV-1a : déterministe, pas de dépendance Node (le routeur s'exécute
// aussi bien en runtime Node qu'Edge).
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Message du jour : stable sur toute la journée (dayIso = 'YYYY-MM-DD'). */
export function pickReminderMessage(dayIso: string, lang: unknown = 'fr'): { title: string; body: string; url: string; universe: ReminderUniverse; index: number } {
  const m = REMINDER_MESSAGES[fnv1a(`oracle-rappel-${dayIso}`) % REMINDER_MESSAGES.length];
  const l = normNotifLang(lang);
  return { title: m.title[l], body: m.body[l], url: m.url, universe: m.universe, index: m.index };
}

// ── Notifications « sceau » (augures) ────────────────────────────────────
// {nom} remplacé par le prénom ou le repli poli dans la langue du user.
const GREET: L10n = {
  fr: 'Cher·ère consultante',
  en: 'Dear querent',
  es: 'Estimado/a consultante',
  hi: 'प्रिय जिज्ञासु',
};

export const SEAL_COPY: Record<'due' | 'eve', { title: L10n; body: L10n }> = {
  due: {
    title: { fr: 'Un sceau se brise', en: 'A seal breaks today', es: 'Un sello se rompe hoy', hi: 'आज एक मुहर टूटती है' },
    body: {
      fr: '{nom}, l’augure scellée par l’oracle atteint son heure aujourd’hui. Viens briser le sceau et dire si elle s’est accomplie.',
      en: '{nom}, the augury sealed by the oracle reaches its hour today. Come break the seal and tell whether it came true.',
      es: '{nom}, el augurio sellado por el oráculo alcanza su hora hoy. Ven a romper el sello y di si se cumplió.',
      hi: '{nom}, ओरैकल ने जो शकुन मुहरबंद किया था, वह आज अपनी घड़ी पर आता है। मुहर तोड़ने आओ और बताओ वह पूरा हुआ या नहीं।',
    },
  },
  eve: {
    title: { fr: 'Un sceau se brise demain', en: 'A seal breaks tomorrow', es: 'Un sello se rompe mañana', hi: 'कल एक मुहर टूटेगी' },
    body: {
      fr: '{nom}, l’oracle a scellé une prémonction qui atteint son heure demain. Prépare-toi à briser le sceau.',
      en: '{nom}, the oracle has sealed a foretelling that reaches its hour tomorrow. Prepare to break the seal.',
      es: '{nom}, el oráculo ha sellado una premonición que alcanza su hora mañana. Prepárate para romper el sello.',
      hi: '{nom}, ओरैकल ने एक प्रेरणा मुहरबंद की है जो कल अपनी घड़ी पाती है। मुहर तोड़ने की तैयारी रखो।',
    },
  },
};

export function sealNotification(kind: 'due' | 'eve', lang: unknown, firstName?: string | null): { title: string; body: string } {
  const l = normNotifLang(lang);
  const nom = (firstName || '').trim() || GREET[l];
  return { title: SEAL_COPY[kind].title[l], body: SEAL_COPY[kind].body[l].replace('{nom}', nom) };
}
