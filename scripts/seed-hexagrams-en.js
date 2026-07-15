// Seed de la table hexagrams_en (traductions anglaises canoniques).
// Lit les syntheses FR depuis /tmp/hex_fr.json (dump DB) pour garantir la fidelite.
// Cree la table si absente, puis UPSERT 64 lignes. Aucune modif de `hexagrams`.
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Noms canoniques (Wilhelm/Baynes) + synthese EN fidèle, indexes par numero (1..64)
const EN = {
  1: { name: 'The Creative', syn: "This is activity. To create. Activation of dynamic energy. This is effort. Initiative fulfilled. Deployment of the Yang qualities." },
  2: { name: 'The Receptive', syn: "This is materialization. Receptivity. Availability. Adaptation. Fulfilment. Deployment of the Yin qualities." },
  3: { name: 'Difficulty at the Beginning', syn: "This is beginning in confusion. Set priorities. Resolve the first difficulties. Clearing the ground. It is good to get help. Favour all energies that will generate progress. Determine a direction." },
  4: { name: 'Youthful Folly', syn: "This is learning and passing on. Lack of maturity. One must act without over-thinking. Bring nascent capacities to bloom. The danger lies in inertia and questioning. Receive what does not grow old." },
  5: { name: 'Waiting (Nourishment)', syn: "This is learning to defer. Do not force the action forward. Live on your reserves. Feed the waiting with an enriching contribution to grow stronger. Know how to be patient." },
  6: { name: 'Conflict', syn: "This is emerging from a dispute. Need to plead one's case before opponents. Intervene in settling a conflict, even an inner one, to prevent its development. Justify oneself. Take a stand. Flexibility." },
  7: { name: 'The Army', syn: "This is mobilization before a peril. Ordeal of strength. Painful moment. Put order in a confused mass. Discipline oneself. Struggle against an invasion. Harmonize one's inner contradictions." },
  8: { name: 'Holding Together (Union)', syn: "This is solidarity. Create a spirit of corps around a centre. Make adhere to a common goal. Gather. Harmonize. Be in accord. Seek or accept union. Urgency to cooperate before it is too late." },
  9: { name: 'The Taming Power of the Small', syn: "This is taming time and difficulties in a yin way. Passive resistance. See what is in seed and will develop. No initiative. Accomplish small things to build great ones." },
  10: { name: 'Treading (Conduct)', syn: "This is conducting oneself with prudence in contact with a powerful force. Explosive and perilous situation. Respect or enforce the rules. Watch over their application to ensure the good course of events." },
  11: { name: 'Peace', syn: "This is harmonizing. Flowering. Expansion. The carrying current. Communicate. Connect. Seek and maintain balance and harmony. Follow the natural abundance of the moment." },
  12: { name: 'Standstill (Stagnation)', syn: "This is recession. Absence of harmony. Withering. All communication is blocked. No alliance is possible. Unfavourable current. Do not draw attention. Keep one's strength for renewal." },
  13: { name: 'Fellowship with Men', syn: "This is going toward the other. Identify. Recognize differences. Accept. Enrich oneself with external differences. The particular interest is also the common interest. All elements are linked to one another." },
  14: { name: 'Possession in Great Measure', syn: "This is realizing. Making real. Allowing each to give their maximum of creative energy. Try to benefit from the great having. Avoid all that could compromise it. Only he who masters the elements of the great having can realize it." },
  15: { name: 'Modesty', syn: "This is holding oneself with flexibility and simplicity before an aggression. Concentrate one's inner strength. Avoid complications. Seek the simplest solutions. Do not engage on a path with obstacles. Affirm oneself in front of..." },
  16: { name: 'Enthusiasm', syn: "This is getting carried away. Being swept up, losing oneself in motivation and exhilaration." },
  17: { name: 'Following', syn: "This is following and inserting oneself with ease into a carrying current. Action must be minimal. Guide or be guided. A new path may appear. Do not resist. Go in the wake of someone or something." },
  18: { name: 'Work on what has been Spoiled', syn: "This is remedying the corrupted. Examine the situation. Seek the causes of corruption. Repair and correct past errors. Oppose with determination a current of decay." },
  19: { name: 'Approach', syn: "This is serenely favouring the growth of what is rising in power. Welcome what comes. See far. Watch over all that can cause trouble. Watch one's back. Point of meeting." },
  20: { name: 'Contemplation (View)', syn: "This is looking squarely and raising one's point of view. Be foresighted. Think of the future consequences of action. Let things emerge. Discern their meaning. One observes. One is observed. Change one's way of seeing things." },
  21: { name: 'Biting Through', syn: "This is cutting through. Restore harmony with firmness. Face problems. Resolutely and vigorously confront the obstacle. Refusing reality brings brutal consequences." },
  22: { name: 'Grace', syn: "This is caring for appearance. Adjust the substance and the form." },
  23: { name: 'Splitting Apart', syn: "This is holding through time. Economize oneself. Struggle against the wear of the situation. Blow the old habits to pieces. Point of extreme wear. Vigilance. Return impossible. Foresee the aftermath." },
  24: { name: 'Return (The Turning Point)', syn: "This is returning to the source to begin again. Accompany renewal. Reversal of fortune in a favourable sense. A new path appears. Care not to waste this chance. Watch not to force the movement." },
  25: { name: 'Innocence (The Unexpected)', syn: "This is reacting spontaneously without preconceived plans according to circumstances. Listen to one's intuition. Free one's mind. Act without calculation, listening to the instant. Without premeditation. Nothing will be positive outside this path." },
  26: { name: 'The Taming Power of the Great', syn: "This is taming action in a Yang way. With firmness. Stay focused. It is not possible to oppose force, nor to confront it. Seek in the past what reproduces old patterns. Subtle action. Give an orientation..." },
  27: { name: 'Corners of the Mouth (Nourishment)', syn: "This is regulating the situation. Nourish daily the situation and its actors. Find a diet of life that passes through attention to the body. Assimilate what preceded. Make selective choices. Endure." },
  28: { name: 'Preponderance of the Great', syn: "This is being excessive. Situation where Yang is in excess and goes beyond measure. A crisis one can surpass but which can escape us. Act alone, without external help. Opportunity to exceed usual limits through off-norm creativity." },
  29: { name: 'The Abysmal (Water)', syn: "Learn to live trials and danger. Accept help. Rise again unceasingly and face again. Difficult situation. Lack of bearings. Instability. Uncertainty. Vertigo. Do not let oneself be carried away by the void." },
  30: { name: 'The Clinging (Fire)', syn: "This is the dazzlement of light. Danger of being dazzled. Keep sense of reality. Spread warmth and clarity. Attachment must be without restriction. Accept and carry a hard task to term. Need to see clearly." },
  31: { name: 'Influence (Wooing)', syn: "This is inciting to action. Generate a dynamic. Trigger a development. Do not let oneself be destabilized. Be spontaneously receptive to an influence. Preserve one's room for manoeuvre. Prudence. Mutual respect." },
  32: { name: 'Duration', syn: "This is enduring. Persevere. Face daily reality. Do not change attitude. Renew one's efforts. Durable alliance. Preserve the harmony of the alliance or the situation. Assume one's role." },
  33: { name: 'Retreat', syn: "This is stepping back. Retreat. Movement of retreat to reverse a momentarily unfavourable balance of power. Keep away from action. Make oneself small. Preserve one's freedom of thought and action." },
  34: { name: 'The Power of the Great', syn: "This is mastering one's energy. Set oneself a goal. Move forward with calm and determination. Serene manifestation of power. Retain what is achieved. Self-mastery." },
  35: { name: 'Progress', syn: "This is progressing in broad daylight and in difficulty." },
  36: { name: 'Darkening of the Light', syn: "This is hiding. Situation of suffocation. Disengage from a conflict one is not responsible for. Keep one's intentions secret. Temporarily conceal one's gifts and possibilities. Hostile surroundings." },
  37: { name: 'The Family (The Clan)', syn: "This is organizing to last. Hold together. Know one's place and occupy it. Cohesion with the clan members. The particular interest recedes. Long-term perspective. Transform the ephemeral into the durable." },
  38: { name: 'Opposition', syn: "This is facing a divergence. A contradiction to make fruitful. Resolve antagonisms. Note a conflict. Be realistic. Avoid misunderstandings, contrarieties and disagreements. Apply the rules. The goal is the..." },
  39: { name: 'Obstruction', syn: "This is bumping into an inner or outer obstacle. Something prevents advancing. Stop acting momentarily. Prepare the moment of action. Stay still until the obstacle has disappeared. Reconsider the situation." },
  40: { name: 'Deliverance', syn: "This is untying. Free oneself from what weighs and relieve the tension of the situation. Distinguish what is achievable or inaccessible. The forces holding us to the past begin to free themselves. All difficulties are exhausted." },
  41: { name: 'Decrease', syn: "This is diminishing. A loss that allows rebalancing. The situation is at its lowest. Reduced room for manoeuvre. End of decline. Hope of renewal. Concentration that brings an increase in quality." },
  42: { name: 'Increase', syn: "This is developing an expansion situation that calls for a reorganization of inner priorities. Profound reform. Complete action. Maximal development. Fertile period. Need to manage the increase. Beginning of decline." },
  43: { name: 'Breakthrough', syn: "This is resolving the tension created by a dangerous situation. Change level. Channel the overflow. Great determination needed. Rapid and extreme decision. Expel harmful elements. Be firm and resolved." },
  44: { name: 'Coming to Meet', syn: "This is welcoming all that one ignores or misconceives. Open oneself to the Yin energy. A collaboration is imposed on us. Adapt and bear with flexibility. Draw lessons for the future." },
  45: { name: 'Gathering Together', syn: "This is gathering with prudence fragile and scattered potentialities that can tip at any moment. Delicate situation. All that prevents the gathering of elements is harmful. Beware of emotionality." },
  46: { name: 'Pushing Upward', syn: "This is rooting oneself to rise and grow. Growth of what will bloom. Be without worry. Possibility of accessing higher levels in all domains. Social promotion. Advance step by step." },
  47: { name: 'Oppression (Exhaustion)', syn: "This is touching the bottom of the situation. One must act to break the enclosure. One is face to face with oneself or others. Force communication. Look within. Find an issue. Renounce if means fall short." },
  48: { name: 'The Well', syn: "This is drawing energies from the bottom of oneself." },
  49: { name: 'Revolution (Molting)', syn: "This is mutating. Change of power and power of change. Reject at the right moment what has aged and is obsolete. Rebel. Innovate. End of a cycle. Transforming action. Action can be inner." },
  50: { name: 'The Cauldron', syn: "This is the sacred vessel. Nourishment of the supreme. Transformation by fire. Alchemy. What is cooked becomes offering. Elevation through culture and substance. The great man feeds the people." },
  51: { name: 'The Arousing (Shock)', syn: "This is the sudden movement. Thunder. Fear that wakes. Stirring of energies. A jolt that calls to action. Danger surmounted by centre. To be moved without losing footing." },
  52: { name: 'Keeping Still (Mountain)', syn: "This is stopping. Immobility. Meditation. Block the agitation. Rest at the right moment. What is motionless contemplates. Hold the thought, fix the gaze. Calm rediscovered." },
  53: { name: 'Development (Gradual Progress)', syn: "This is advancing by degrees. The wild goose. Slow and sure progression. Nothing forced. Each step finds its place. Union that matures. Patience bears fruit. An ordered ascension." },
  54: { name: 'The Marrying Maiden', syn: "This is the unequal union. The young bride. What begins with a disadvantage. A subordinate alliance. Danger of attaching to the superficial. Proceed with discernment. The relationship must find its right form." },
  55: { name: 'Abundance (Fullness)', syn: "This is abundance. Splendour at its height. The sun at midday. A moment of plenitude that can hide the eclipse to come. Act while light lasts. Beware of excess. What is full inclines to decline." },
  56: { name: 'The Wanderer', syn: "This is the stranger. The traveller. Passing stay. Modesty and caution abroad. Few attachments. Find a provisional shelter. Keep a low profile. What is transient must not take root." },
  57: { name: 'The Gentle (Wind)', syn: "This is penetrating softly. The wind. Repeated and patient influence. What enters without violence. Persuasion by constancy. Accumulate small actions. Yield to penetrate. The flexible prevails." },
  58: { name: 'The Joyous (Lake)', syn: "This is joy. The lake. Opening. Satisfaction that communicates. Sincere exchange. What delights without excess. Pleasure shared. The mouth that speaks and sings. Contentment in the just measure." },
  59: { name: 'Dispersion (Dissolution)', syn: "This is dissolving. Scattering. What was blocked flows again. Disperse the obstacles, the doubts. Unite what was separated. Liberation of the held-back. A wind on the water. Spread the cohesion." },
  60: { name: 'Limitation', syn: "This is delimiting. The measure. The bank. Set boundaries. Discipline that protects. Know what to contain and what to let through. The rule serves, it does not imprison. Right proportion." },
  61: { name: 'Inner Truth', syn: "This is central sincerity. The wind over the lake. What is true at the centre. Confidence without artifice. A fragile but real bond. The heart that convinces. Sincere influence surpasses appearances." },
  62: { name: 'Preponderance of the Small', syn: "This is the excess of the small. The small crossing. What passes under the great. A light and careful step. Favour modest actions. The heavy would break. Proceed with caution and measure." },
  63: { name: 'After Completion', syn: "This is what is achieved. The crossing accomplished. Order established. The small remains to watch over. Success that demands vigilance. What is finished inclines to relapse. Keep the care of the detail." },
  64: { name: 'Before Completion', syn: "This is what is not yet achieved. The crossing not finished. The moment before the shore. Tension sustained. A last effort needed. Do not precipitate. What approaches completion must be conducted to term." },
};

(async () => {
  try {
    await prisma.$queryRawUnsafe(`
      CREATE TABLE IF NOT EXISTS hexagrams_en (
        numero INT PRIMARY KEY,
        name_en TEXT,
        synthese_en TEXT
      );
    `);
    console.log('TABLE hexagrams_en prete');

    const fr = JSON.parse(fs.readFileSync('/tmp/hex_fr.json', 'utf8'));
    const byNum = {};
    for (const r of fr) byNum[parseInt(r.numero, 10)] = r;

    let done = 0;
    for (let n = 1; n <= 64; n++) {
      const e = EN[n];
      if (!e) { console.error('MANQUE EN pour', n); continue; }
      await prisma.$queryRawUnsafe(
        `INSERT INTO "hexagrams_en" (numero, name_en, synthese_en) VALUES ($1,$2,$3)
         ON CONFLICT (numero) DO UPDATE SET name_en=EXCLUDED.name_en, synthese_en=EXCLUDED.synthese_en;`,
        n, e.name, e.syn
      );
      done++;
    }
    console.log('SEED', done, 'lignes');
    await prisma.$disconnect();
  } catch (e) {
    console.error('ERR', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
