// app/api/guest-mode/route.ts — Bascule du mode Invité (prêt de tirage).
// GET  ?email= → { guestMode, hasPin } (état courant ; session obligatoire)
// POST { email, on, pin?, action? } → { guestMode } après bascule.
//   on=true  : activation — un code 4 chiffres (pin) est EXIGÉ s'il n'existe
//              pas encore en base (l'hôte le pose devant lui, jamais sur le
//              téléphone de l'invité).
//   on=false : désactivation — le code est vérifié côté serveur (5 échecs →
//              verrou 15 min). Sans code en base (compte legacy invité avant
//              le verrou), la sortie reste libre.
//   action='change-pin' (mode normal uniquement) : { currentPin, newPin }
//              newPin null = retirer le code. Gérable dans Préférences.
//   action='forgot-pin' : envoie un e-mail de réinitialisation (ouvre la
//              réinitialisation du PIN ; coupe le mode Invité — la personne
//              qui a accès à la boîte mail est le propriétaire du compte).
//
// La source de vérité est la BASE (User.guestMode + guestPinHash bcrypt) : le
// client ne peut pas falsifier l'anonymat (les gardes IA/historique/augure
// relisent ce flag serveur à chaque appel — lib/guest.ts).

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionEmail } from '@/lib/session';
import { isGuestMode, setGuestMode, guestStatus, verifyPinAndExit, changePin, guestPinStatus } from '@/lib/guest';
import { getRights } from '@/lib/entitlements';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { mailer as transporter, MAIL_FROM, appBaseUrl } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sess = requireSessionEmail(request, request.nextUrl.searchParams.get('email'));
  if ('error' in sess) return sess.error as NextResponse;
  const rights = await getRights(sess.email);
  const st = await guestStatus(sess.email);
  return NextResponse.json({ guestMode: st.guestMode, hasPin: st.hasPin, canGuest: !!rights && rights.level !== 'apprenti' });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const sess = requireSessionEmail(request, typeof body.email === 'string' ? body.email : null);
  if ('error' in sess) return sess.error as NextResponse;
  const pinStr = (v: unknown) => (typeof v === 'string' ? v.trim() : null);

  // ── Actions de gestion du code (écran Préférences, mode normal exigé) ──
  if (body.action === 'change-pin') {
    // Le verrou Invité est réservé aux abonnés Initié/Arkane : un Apprenti ne
    // peut ni poser ni changer de code (le mode Invité lui est déjà refusé).
    {
      const rights = await getRights(sess.email);
      if (!rights || rights.level === 'apprenti') {
        return NextResponse.json({ error: 'subscriber-only' }, { status: 403 });
      }
    }
    const r = await changePin(sess.email, pinStr(body.currentPin), body.newPin === null || body.newPin === undefined ? null : String(body.newPin));
    if (!r.ok) return NextResponse.json({ error: r.code, lockedUntil: r.lockedUntil }, { status: r.code === 'pin-required' || r.code === 'pin-wrong' ? 401 : 400 });
    return NextResponse.json({ ok: true, ...(await guestPinStatus(sess.email)) });
  }
  if (body.action === 'forgot-pin') {
    const u = await prisma.user.findUnique({ where: { email: sess.email }, select: { id: true, guestMode: true } });
    if (!u) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const token = randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: u.id }, data: { confirmationToken: token } });
    const path = `/auth/confirm?token=${encodeURIComponent(token)}&mode=guest-pin`;
    const webUrl = `${appBaseUrl()}${path}`;
    try {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: sess.email,
        subject: 'Réinitialiser votre code Invité',
        text:
          'Pour définir un nouveau code de sortie du mode Invité, cliquez sur ce lien :\n' +
          `${webUrl}\n\n` +
          "Ce lien retire aussi le mode Invité en cours (sécurité). S'il ne s'ouvre pas dans l'application, copiez-collez le lien dans un navigateur.",
        html:
          `<div style="font-family:sans-serif;line-height:1.5;color:#2a1700">` +
          `<p>Pour <strong>définir un nouveau code de sortie du mode Invité</strong>, cliquez sur le lien ci-dessous :</p>` +
          `<p><a href="${webUrl}" style="display:inline-block;padding:10px 18px;background:#DAA520;color:#1a0e0a;text-decoration:none;border-radius:6px;font-weight:600">Définir un nouveau code</a></p>` +
          `<p style="opacity:.7">Ce lien <strong>coupe le mode Invité en cours</strong> (sécurité) et fonctionne aussi hors de l&rsquo;application : copiez-le dans un navigateur si le bouton ne s&rsquo;ouvre pas.</p>` +
          `</div>`,
      });
    } catch {
      return NextResponse.json({ error: 'mail-failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const on = !!body.on;
  // Mode Invité réservé aux abonnés Initié/Arkane réellement actifs.
  if (on) {
    const rights = await getRights(sess.email);
    if (!rights || rights.level === 'apprenti') {
      return NextResponse.json({ error: 'Mode Invité réservé aux abonnés.', code: 'subscriber-only' }, { status: 403 });
    }
    try {
      const st = await guestStatus(sess.email);
      // Activation sans code existant → le code 4 chiffres est exigé (option A).
      if (!st.hasPin) {
        const pin = pinStr(body.pin);
        if (!pin || !/^\d{4}$/.test(pin)) {
          return NextResponse.json({ error: 'pin-required' }, { status: 400 });
        }
        await setGuestMode(sess.email, true, pin);
        return NextResponse.json({ guestMode: true });
      }
      // Un code existe déjà : s'assurer qu'il n'est pas dans un état verrouillé
      // résiduel, puis activer (le code posé aux Préférences reste celui de sortie).
      await setGuestMode(sess.email, true);
      return NextResponse.json({ guestMode: true });
    } catch (e) {
      if ((e as Error).message === 'pin-required') return NextResponse.json({ error: 'pin-required' }, { status: 400 });
      if ((e as Error).message === 'user-not-found') return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
      throw e;
    }
  }

  // ── Sortie : le code est vérifié côté serveur (si posé). ──
  const r = await verifyPinAndExit(sess.email, pinStr(body.pin) || '');
  if (!r.ok) {
    const status = r.code === 'pin-locked' ? 429 : r.code === 'pin-wrong' || r.code === 'pin-required' ? 401 : 400;
    return NextResponse.json({ error: r.code, lockedUntil: r.lockedUntil }, { status });
  }
  return NextResponse.json({ guestMode: false });
}
