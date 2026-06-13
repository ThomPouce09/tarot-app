1|1|'use client';
2|2|
3|3|import { useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
4|4|import { motion, AnimatePresence } from 'framer-motion';
5|5|import Image from 'next/image';
6|6|import { CONFIG, CARD_FAN, ARC, CARD_FAN_WIDE, CARD_FAN_CLASSIC, ARC_WIDE, ARC_CLASSIC } from '@/lib/config';
7|7|import { DrawnCardData } from './tarot-app';
8|8|import InterpretationModal from './interpretation-modal';
9|9|import QuickDivination from './quick-divination';
10|10|import MagicalDivination from './magical-divination';
11|11|import SereneDivination from './serene-divination';
12|12|import { createPortal } from 'react-dom';
13|13|
14|14|interface CardFanProps {
15|15|  availableIndices: number[];
16|16|  onCardDrawn: (index: number) => void;
17|17|  disabled?: boolean;
18|18|  drawnCardsCount: number;
19|19|  drawnCardIndices?: number[];
20|20|  drawnCards?: DrawnCardData[];  // <-- NOUVEAU : les cartes tirées complete s
21|21|  showHint: boolean;
22|22|  blinkHint?: boolean;
23|23|  onReturnToHome?: () => void;
24|24|}
25|25|
26|26|const CARD_BACK_URL = 'https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png';
27|27|const TOTAL_CARDS = CONFIG.GAME.totalCards;
28|28|
29|29|export default function CardFan({ availableIndices, onCardDrawn, disabled, drawnCardsCount, drawnCardIndices = [], drawnCards = [], showHint, blinkHint, onReturnToHome }: CardFanProps) {
30|30|  const scrollRef = useRef<HTMLDivElement>(null);
31|31|  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());
32|32|  const [isMobile, setIsMobile] = useState(false);
33|33|  const [zoom, setZoom] = useState(1);
34|34|  const [scrollProgress, setScrollProgress] = useState({ start: 0, end: 1 });
35|35|  
36|36|  // Drag & Drop state
37|37|  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
38|38|  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
39|39|  const [isDraggingConfirmed, setIsDraggingConfirmed] = useState(false);
40|40|  
41|41|  // États pour l'interprétation IA
42|42|  const [interpretation, setInterpretation] = useState<{ carte1: string; carte2: string; carte3: string } | null>(null);
43|43|  const [cardNames, setCardNames] = useState<{ carte1: string; carte2: string; carte3: string } | null>(null);
44|44|  const [loading, setLoading] = useState(false);
45|45|  const [error, setError] = useState<string | null>(null);
46|46|  const [showInterpretation, setShowInterpretation] = useState(false);
47|47|  const [showDivination, setShowDivination] = useState(false);
48|48|  const [divinationPhase, setDivinationPhase] = useState<'summoning' | 'revealing'>('summoning');
49|49|  
50|50|  // États pour le rendu client-side uniquement
51|51|  const [hasMounted, setHasMounted] = useState(false);
52|52|  const hasCenteredRef = useRef(false);
53|53|  const dragStartRef = useRef<{ x: number; y: number; cardIndex: number; cardRect: DOMRect; holdTimer?: NodeJS.Timeout } | null>(null);
54|54|  const draggedCardRef = useRef<HTMLDivElement | null>(null);
55|55|  
56|56|  // Montage client-side
57|57|  useEffect(() => {
58|58|    setHasMounted(true);
59|59|  }, []);
60|60|  
61|61|  useEffect(() => {
62|62|    const check = () => setIsMobile(window.innerWidth < 640);
63|63|    check();
64|64|    window.addEventListener('resize', check);
65|65|    return () => window.removeEventListener('resize', check);
66|66|  }, []);
67|67|
68|68|  // Dimensions from config - support du mode wide/classic
69|69|  const isWideMode = CONFIG.FAN_MODE === 'wide';
70|70|  const cardConfig = isMobile 
71|71|    ? (isWideMode ? CARD_FAN_WIDE.mobile : CARD_FAN_CLASSIC.mobile)
72|72|    : (isWideMode ? CARD_FAN_WIDE.desktop : CARD_FAN_CLASSIC.desktop);
73|73|  const arcConfig = isMobile
74|74|    ? (isWideMode ? ARC_WIDE.mobile : ARC_CLASSIC.mobile)
75|75|    : (isWideMode ? ARC_WIDE.desktop : ARC_CLASSIC.desktop);
76|76|  const CARD_W = cardConfig.width;
77|77|  const CARD_H = cardConfig.height;
78|78|  const OVERLAP = cardConfig.overlap; // Utilise l'overlap de la config
79|79|
80|80|  const visibleCards = useMemo(() => {
81|81|    return Array.from({ length: TOTAL_CARDS }, (_, i) => i)
82|82|      .filter((i) => availableIndices.includes(i) && !removedCards.has(i));
83|83|  }, [availableIndices, removedCards]);
84|84|
85|85|  // Gestionnaire de scroll pour mettre à jour le curseur
86|86|  const handleScroll = useCallback(() => {
87|87|    if (!scrollRef.current || visibleCards.length === 0) return;
88|88|    
89|89|    const totalCards = visibleCards.length;
90|90|    const cardSpacing = CARD_W + OVERLAP;
91|91|    const totalWidth = CARD_W + (totalCards - 1) * cardSpacing;
92|92|    const containerWidth = scrollRef.current.clientWidth;
93|93|    const scrollPos = scrollRef.current.scrollLeft;
94|94|    
95|95|    updateScrollIndicator(scrollPos, containerWidth, totalWidth);
96|96|  }, [visibleCards.length, CARD_W, OVERLAP]);
97|97|
98|98|  // Fonction utilitaire pour mettre à jour le curseur
99|99|  const updateScrollIndicator = (scrollPos: number, containerWidth: number, totalWidth: number) => {
100|100|    const startPercent = Math.max(0, Math.min(1, scrollPos / totalWidth));
101|101|    const visiblePercent = Math.min(1, containerWidth / totalWidth);
102|102|    const endPercent = Math.min(1, startPercent + visiblePercent);
103|103|    
104|104|    setScrollProgress({ start: startPercent * 100, end: endPercent * 100 });
105|105|  };
106|106|
107|107|  // Attacher le gestionnaire de scroll
108|108|  useEffect(() => {
109|109|    const scrollContainer = scrollRef.current;
110|110|    if (!scrollContainer) return;
111|111|    
112|112|    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
113|113|    return () => scrollContainer.removeEventListener('scroll', handleScroll);
114|114|  }, [handleScroll]);
115|115|
116|116|  // ========== ARC DE L'ÉVENTAIL - Arc classique ==========
117|117|  const getCardStyle = useCallback((displayIndex: number, total: number) => {
118|118|    const fraction = total > 1 ? displayIndex / (total - 1) : 0.5;
119|119|    const centered = fraction - 0.5; // -0.5 to 0.5
120|120|    
121|121|    // Arc en cosinus
122|122|    const arcY = Math.cos(centered * Math.PI) * arcConfig.amplitude;
123|123|    
124|124|    // Rotation pour suivre la courbe
125|125|    const rotation = centered * arcConfig.rotation * 2;
126|126|    
127|127|    return { arcY: -arcY, rotation };
128|128|  }, [arcConfig]);
129|129|
130|130|  // ========== SCROLL horizontal ==========
131|131|  const handleWheel = useCallback((e: React.WheelEvent) => {
132|132|    if (scrollRef.current) {
133|133|      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
134|134|        return;
135|135|      }
136|136|      e.preventDefault();
137|137|      scrollRef.current.scrollLeft += e.deltaY * 2;
138|138|    }
139|139|  }, []);
140|140|
141|141|  // ========== PINCH ZOOM ==========
142|142|  const getTouchDist = (touches: React.TouchList) => {
143|143|    const [a, b] = [touches[0], touches[1]];
144|144|    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
145|145|  };
146|146|
147|147|  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
148|148|
149|149|  const handleTouchStart = useCallback((e: React.TouchEvent) => {
150|150|    if (e.touches.length === 2) {
151|151|      e.preventDefault();
152|152|      pinchStartRef.current = { dist: getTouchDist(e.touches), zoom };
153|153|    } else if (e.touches.length === 1 && !disabled) {
154|154|      // Reset des états
155|155|      setIsDraggingConfirmed(false);
156|156|      setDraggingIndex(null);
157|157|      setDragPosition(null);
158|158|      
159|159|      // Début du drag tactile
160|160|      const touch = e.touches[0];
161|161|      const touchRect = (e.target as Element)?.getBoundingClientRect();
162|162|      
163|163|      // Trouver l'index de la carte touchée
164|164|      let cardIndex: number | null = null;
165|165|      const cards = document.querySelectorAll('[data-card-index]');
166|166|      cards.forEach((card, idx) => {
167|167|        const rect = card.getBoundingClientRect();
168|168|        if (
169|169|          touch.clientX >= rect.left &&
170|170|          touch.clientX <= rect.right &&
171|171|          touch.clientY >= rect.top &&
172|172|          touch.clientY <= rect.bottom
173|173|        ) {
174|174|          cardIndex = parseInt(card.getAttribute('data-card-index') || '-1');
175|175|        }
176|176|      });
177|177|      
178|178|      if (cardIndex !== null && cardIndex >= 0) {
179|179|        dragStartRef.current = {
180|180|          x: touch.clientX,
181|181|          y: touch.clientY,
182|182|          cardIndex,
183|183|          cardRect: (cards[visibleCards.indexOf(cardIndex)] as HTMLElement)?.getBoundingClientRect() || touchRect,
184|184|        };
185|185|        
186|186|        // Timer : si on reste appuyé 1s sans bouger, la carte se sélectionne
187|187|        const holdTimer = setTimeout(() => {
188|188|          if (dragStartRef.current && dragStartRef.current.cardIndex === cardIndex) {
189|189|            setIsDraggingConfirmed(true);
190|190|            setDraggingIndex(cardIndex);
191|191|            setDragPosition({ x: touch.clientX, y: touch.clientY });
192|192|          }
193|193|        }, 300); // Timer 300ms pour drag fiable
194|194|        
195|195|        dragStartRef.current.holdTimer = holdTimer;
196|196|      }
197|197|    }
198|198|  }, [disabled, zoom, visibleCards]);
199|199|
200|200|  const handleTouchMove = useCallback((e: React.TouchEvent) => {
201|201|    if (e.touches.length === 2 && pinchStartRef.current) {
202|202|      e.preventDefault();
203|203|      const newDist = getTouchDist(e.touches);
204|204|      const scale = newDist / pinchStartRef.current.dist;
205|205|      setZoom(Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale)));
206|206|    } else if (e.touches.length === 1 && dragStartRef.current) {
207|207|      const touch = e.touches[0];
208|208|      const dx = touch.clientX - dragStartRef.current.x;
209|209|      const dy = touch.clientY - dragStartRef.current.y;
210|210|      
211|211|      // Si déjà en train de draguer, on suit le mouvement
212|212|      if (draggingIndex !== null) {
213|213|        setDragPosition({ x: touch.clientX, y: touch.clientY });
214|214|        e.preventDefault();
215|215|        return;
216|216|      }
217|217|      
218|218|      // Si drag déjà confirmé (par maintien ou mouvement), on active
219|219|      if (isDraggingConfirmed) {
220|220|        setDraggingIndex(dragStartRef.current.cardIndex);
221|221|        setDragPosition({ x: touch.clientX, y: touch.clientY });
222|222|        e.preventDefault();
223|223|        return;
224|224|      }
225|225|      
226|226|      // Annuler le timer de maintien si on bouge
227|227|      if (dragStartRef.current.holdTimer) {
228|228|        clearTimeout(dragStartRef.current.holdTimer);
229|229|        dragStartRef.current.holdTimer = undefined;
230|230|      }
231|231|      
232|232|      // Détection d'un scroll horizontal TROP important → on annule tout
233|233|      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
234|234|        dragStartRef.current = null;
235|235|        return;
236|236|      }
237|237|      
238|238|      // Détection d'un vrai drag (mouvement vertical OU horizontal modéré)
239|239|      const minDrag = 60; // Seuil augmenté : 60px
240|240|      if (Math.abs(dx) > minDrag || dy < -minDrag) {
241|241|        // On ne confirme que si le mouvement est vers le haut ou diagonal vers le haut
242|242|        if (dy < 0 || Math.abs(dy) > Math.abs(dx)) {
243|243|          setIsDraggingConfirmed(true);
244|244|          setDraggingIndex(dragStartRef.current.cardIndex);
245|245|          setDragPosition({ x: touch.clientX, y: touch.clientY });
246|246|          e.preventDefault();
247|247|        }
248|248|      }
249|249|    } else if (draggingIndex !== null && dragPosition) {
250|250|      const touch = e.touches[0];
251|251|      setDragPosition({ x: touch.clientX, y: touch.clientY });
252|252|      e.preventDefault();
253|253|    }
254|254|  }, [draggingIndex, isDraggingConfirmed]);
255|255|
256|256|  const handleTouchEnd = useCallback(() => {
257|257|    pinchStartRef.current = null;
258|258|    
259|259|    // Annuler le timer de maintien
260|260|    if (dragStartRef.current?.holdTimer) {
261|261|      clearTimeout(dragStartRef.current.holdTimer);
262|262|      dragStartRef.current.holdTimer = undefined;
263|263|    }
264|264|    
265|265|    if (draggingIndex !== null && dragPosition) {
266|266|      // Zone de validation - milieu de l'écran (50%)
267|267|      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.95;
268|268|      
269|269|      if (releasedInDrawZone) {
270|270|        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
271|271|        onCardDrawn(draggingIndex);
272|272|      }
273|273|    }
274|274|    
275|275|    // Reset complet
276|276|    setIsDraggingConfirmed(false);
277|277|    setDraggingIndex(null);
278|278|    setDragPosition(null);
279|279|    dragStartRef.current = null;
280|280|  }, [draggingIndex, dragPosition, onCardDrawn]);
281|281|
282|282|  // ========== DESKTOP: Mouse Drag ==========
283|283|  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
284|284|    console.log('🖱️ [DEBUG Desktop] handleMouseDown called, index:', index, 'disabled:', disabled);
285|285|    
286|286|    if (disabled) {
287|287|      console.log('❌ [DEBUG] Bloqué car disabled=true');
288|288|      return;
289|289|    }
290|290|    e.preventDefault();
291|291|    e.stopPropagation();
292|292|    const cardElement = e.currentTarget;
293|293|    dragStartRef.current = {
294|294|      x: e.clientX,
295|295|      y: e.clientY,
296|296|      cardIndex: index,
297|297|      cardRect: cardElement.getBoundingClientRect(),
298|298|    };
299|299|    
300|300|    console.log('✅ [DEBUG] Drag started, timer 1s lancé...');
301|301|    
302|302|    // Reset des états
303|303|    setDraggingIndex(null);
304|304|    setDragPosition(null);
305|305|    setIsDraggingConfirmed(false);
306|306|    
307|307|    // Timer : si on reste appuyé 1s sans bouger, la carte se sélectionne
308|308|    const holdTimer = setTimeout(() => {
309|309|      if (dragStartRef.current && dragStartRef.current.cardIndex === index) {
310|310|        console.log('✅ [DEBUG] Hold timer écoulé, carte confirmée!');
311|311|        setIsDraggingConfirmed(true);
312|312|        setDraggingIndex(index);
313|313|        // Position initiale : la carte reste à sa place
314|314|        setDragPosition({ x: e.clientX, y: e.clientY });
315|315|      }
316|316|    }, 300); // Timer 300ms pour drag fiable
317|317|    
318|318|    dragStartRef.current.holdTimer = holdTimer;
319|319|  }, [disabled]);
320|320|
321|321|  const handleMouseMove = useCallback((e: React.MouseEvent) => {
322|322|    if (!dragStartRef.current) return;
323|323|    
324|324|    const dx = e.clientX - dragStartRef.current.x;
325|325|    const dy = e.clientY - dragStartRef.current.y;
326|326|    
327|327|    // Si déjà en train de draguer, on suit le mouvement
328|328|    if (draggingIndex !== null) {
329|329|      setDragPosition({ x: e.clientX, y: e.clientY });
330|330|      return;
331|331|    }
332|332|    
333|333|    // Si drag déjà confirmé (par maintien ou mouvement), on active
334|334|    if (isDraggingConfirmed) {
335|335|      setDraggingIndex(dragStartRef.current.cardIndex);
336|336|      setDragPosition({ x: e.clientX, y: e.clientY });
337|337|      return;
338|338|    }
339|339|    
340|340|    // Annuler le timer de maintien si on bouge
341|341|    if (dragStartRef.current.holdTimer) {
342|342|      clearTimeout(dragStartRef.current.holdTimer);
343|343|      dragStartRef.current.holdTimer = undefined;
344|344|    }
345|345|    
346|346|    // Détection d'un scroll horizontal TROP important → on annule tout
347|347|    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
348|348|      dragStartRef.current = null;
349|349|      return;
350|350|    }
351|351|    
352|352|    // Détection d'un vrai drag (mouvement vertical OU horizontal modéré)
353|353|    const minDrag = 60; // Seuil augmenté : 60px
354|354|    if (Math.abs(dx) > minDrag || dy < -minDrag) {
355|355|      // On ne confirme que si le mouvement est vers le haut ou diagonal vers le haut
356|356|      if (dy < 0 || Math.abs(dy) > Math.abs(dx)) {
357|357|        setIsDraggingConfirmed(true);
358|358|        setDraggingIndex(dragStartRef.current.cardIndex);
359|359|        setDragPosition({ x: e.clientX, y: e.clientY });
360|360|      }
361|361|    }
362|362|  }, [draggingIndex, isDraggingConfirmed]);
363|363|
364|364|  const handleMouseUp = useCallback(() => {
365|365|    // Annuler le timer de maintien
366|366|    if (dragStartRef.current?.holdTimer) {
367|367|      clearTimeout(dragStartRef.current.holdTimer);
368|368|      dragStartRef.current.holdTimer = undefined;
369|369|    }
370|370|    
371|371|    if (draggingIndex !== null && dragPosition) {
372|372|      // Zone de validation - milieu de l'écran (50%)
373|373|      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.95;
374|374|      
375|375|      if (releasedInDrawZone) {
376|376|        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
377|377|        onCardDrawn(draggingIndex);
378|378|      }
379|379|    }
380|380|    
381|381|    // Reset complet
382|382|    setIsDraggingConfirmed(false);
383|383|    setDraggingIndex(null);
384|384|    setDragPosition(null);
385|385|    dragStartRef.current = null;
386|386|  }, [draggingIndex, dragPosition, onCardDrawn]);
387|387|
388|388|  // Calcul de la position initiale de scroll pour centrer la pioche
389|389|  const getInitialScrollPosition = useMemo(() => {
390|390|    if (availableIndices.length < 75 || visibleCards.length === 0) {
391|391|      return 0;
392|392|    }
393|393|    const totalCards = visibleCards.length;
394|394|    const cardSpacing = CARD_W + OVERLAP;
395|395|    const totalWidth = CARD_W + (totalCards - 1) * cardSpacing;
396|396|    const centerOfDeck = totalWidth / 2;
397|397|    const estimatedScreenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
398|398|    return Math.max(0, centerOfDeck - (estimatedScreenWidth / 2));
399|399|  }, [availableIndices.length, visibleCards.length, CARD_W, OVERLAP]);
400|400|
401|401|  // Centrage à chaque changement de cartes (simple et fiable)
402|402|  useEffect(() => {
403|403|    if (getInitialScrollPosition > 0 && scrollRef.current) {
404|404|      scrollRef.current.scrollLeft = getInitialScrollPosition;
405|405|    }
406|406|  }, [getInitialScrollPosition]);
407|407|
408|408|  // Fonction pour appeler l'API d'interprétation
409|409|  const handleRequestInterpretation = useCallback(async () => {
410|410|    // Debug: écrire dans un fichier via une API locale
411|411|    const debugLog = async (msg: string) => {
412|412|      try {
413|413|        await fetch('/api/debug-log', {
414|414|          method: 'POST',
415|415|          headers: { 'Content-Type': 'application/json' },
416|416|          body: JSON.stringify({ msg, ts: Date.now() }),
417|417|        }).catch(() => {});
418|418|      } catch {}
419|419|    };
420|420|    
421|421|    await debugLog('🔮 Début interprétation');
422|422|    await debugLog(`🃏 Cartes: ${JSON.stringify(drawnCardIndices)}`);
423|423|    await debugLog(`📊 drawnCardsCount: ${drawnCardsCount}`);
424|424|    await debugLog(`🔒 disabled: ${disabled}`);
425|425|    
426|426|    // Check plus détaillé
427|427|    if (!drawnCardIndices || drawnCardIndices.length === 0) {
428|428|      const msg = '❌ drawnCardIndices est vide ou undefined !';
429|429|      await debugLog(msg + ` (drawnCardsCount=${drawnCardsCount})`);
430|430|      setError(msg + ' (drawnCardsCount=' + drawnCardsCount + ')');
431|431|      setShowInterpretation(true);  // Affiche quand même la zone pour voir l'erreur
432|432|      setLoading(false);
433|433|      return;
434|434|    }
435|435|    
436|436|    if (drawnCardIndices.length !== 3) {
437|437|      const msg = `❌ Attend 3 cartes, reçu ${drawnCardIndices.length}`;
438|438|      await debugLog(msg);
439|439|      setError(msg);
440|440|      setShowInterpretation(true);  // Affiche quand même la zone
441|441|      setLoading(false);
442|442|      return;
443|443|    }
444|444|    
445|445|    await debugLog('✅ 3 cartes valides, appel API...');
446|446|        setLoading(true);
447|447|        setError(null);
448|448|        setShowInterpretation(true);  // Ouvre la modal IMMÉDIATEMENT avec la vidéo
449|449|    
450|450|        try {
451|451|          await debugLog('📦 Affichage écran de divination avec vidéo...');
452|452|          await debugLog('🔮 Modal affichée !');
453|453|     
454|454|          // ÉTAPE 2: Attendre 5 secondes MINIMUM (en parallèle de l'API)
455|455|          const startTime = Date.now();
456|456|          const minWait = 5000;
457|457|      
458|458|            await debugLog('⏳ Lancement API + attente 5s...');
459|459|      
460|460|            // Lancer l'API en parallèle
461|461|            const apiPromise = fetch('/api/interpretation', {
462|462|              method: 'POST',
463|463|              headers: { 'Content-Type': 'application/json' },
464|464|              body: JSON.stringify({ cartes: drawnCardIndices }),
465|465|            }).then(async (response) => {
466|466|              const responseText = await response.text();
467|467|              await debugLog(`📥 Status: ${response.status}, Taille: ${responseText.length} chars`);
468|468|        
469|469|              if (!response.ok) {
470|470|                let errorData;
471|471|                try { errorData = JSON.parse(responseText); } catch { errorData = { error: responseText }; }
472|472|                await debugLog(`❌ Erreur API: ${JSON.stringify(errorData)}`);
473|473|                throw new Error(errorData.error || 'Échec de l\'interprétation');
474|474|              }
475|475|        
476|476|              let data;
477|477|              try { 
478|478|                data = JSON.parse(responseText); 
479|479|                await debugLog(`✅ JSON parsé`);
480|480|              } catch (parseErr) { 
481|481|                await debugLog(`❌ Erreur parsing: ${parseErr}`);
482|482|                throw new Error('Format de réponse invalide'); 
483|483|              }
484|484|              return data;
485|485|            });
486|486|      
487|487|            // Attendre 5 secondes ET que l'API soit prête
488|488|            await Promise.all([
489|489|              apiPromise,
490|490|              new Promise(resolve => setTimeout(resolve, minWait)),
491|491|            ]);
492|492|      
493|493|            const elapsed = Date.now() - startTime;
494|494|            await debugLog(`⏱️ Attente totale: ${elapsed}ms`);
495|495|      
496|496|            // Récupérer les données (déjà résolues par Promise.all)
497|497|            const data = await apiPromise;
498|498|      
499|499|            // Extraire les noms des cartes depuis drawnCards
500|500|            const names = drawnCards && drawnCards.length >= 3 ? {
501|