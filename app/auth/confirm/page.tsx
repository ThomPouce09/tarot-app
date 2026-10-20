'use client';

import { tr } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  // mode=activate → page d'ACTIVATION de compte (bouton simple, pas de mdp).
  // mode=guest-pin → RÉINITIALISATION DU CODE INVITÉ (4 chiffres ; coupe le
  // mode Invité — lien « Code oublié ? » de la modale de sortie).
  // absent / mode=reset → page de RÉINITIALISATION de mot de passe.
  const isActivate = searchParams.get('mode') === 'activate';
  const isGuestPin = searchParams.get('mode') === 'guest-pin';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/confirm?token=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) setVerified(true);
          else setMessage(tr("Lien invalide ou expiré", "Invalid or expired link", "Enlace inválido o caducado", "लिंक अमान्य या समय-समाप्त"));
        })
        .catch(() => setMessage(tr("Erreur de vérification du lien", "Link verification error", "Error al verificar el enlace", "लिंक सत्यापन में त्रुटि")));
    }
  }, [token]);

  const finish = (res: any, data: any, okMsg: string) => {
    if (res.ok) {
      // Marque le compte confirmé en local (tarot_user) pour débloquer le gate.
      try {
        if (data?.session) localStorage.setItem('arkane_session_token', data.session);
        const raw = localStorage.getItem('tarot_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.confirmed = true;
          localStorage.setItem('tarot_user', JSON.stringify(u));
          // Libère aussi le cache de la modale d'activation globale (EmailConfirmLock).
          if (u.email) { sessionStorage.removeItem('tarot_ucf_' + u.email); sessionStorage.setItem('tarot_cf_' + u.email, '1'); }
        } else if (data?.user) {
          localStorage.setItem('tarot_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            confirmed: true,
          }));
        }
      } catch {}
      setMessage(okMsg);
      setTimeout(() => router.push('/'), 1500);
    } else {
      setMessage(data.error || tr("Erreur", "Error", "Error", "त्रुटि"));
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode: 'activate' }),
      });
      const data = await res.json();
      finish(res, data, '✅ ' + tr("Compte activé avec succès !", "Account activated successfully!", "¡Cuenta activada con éxito!", "खाता सफलतापूर्वक सक्रिय हुआ!"));
    } catch {
      setMessage(tr("Erreur", "Error", "Error", "त्रुटि"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setMessage(tr("Mots de passe différents", "Passwords do not match", "Las contraseñas no coinciden", "पासवर्ड मेल नहीं खाते"));
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, mode: 'reset' }),
      });
      const data = await res.json();
      finish(res, data, '✅ ' + tr("Mot de passe mis à jour.", "Password updated.", "Contraseña actualizada.", "पासवर्ड अपडेट किया गया।"));
    } catch {
      setMessage(tr("Erreur", "Error", "Error", "त्रुटि"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setMessage(tr("Le code doit contenir exactement 4 chiffres", "The code must be exactly 4 digits", "El código debe tener exactamente 4 cifras", "कोड में ठीक 4 अंक होने चाहिए"));
    if (pin !== pinConfirm) return setMessage(tr("Les codes ne correspondent pas", "Codes do not match", "Los códigos no coinciden", "कोड मेल नहीं खाते"));
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/guest-pin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        // Le mode Invité est coupé côté serveur → purge du cache client.
        try { localStorage.removeItem('arkane_guest_mode'); } catch {}
        setMessage('✅ ' + tr("Nouveau code enregistré. Le mode Invité est désactivé.", "New code saved. Guest mode is turned off.", "Nuevo código guardado. El modo Invitado se desactiva.", "नया कोड सहेजा गया। अतिथी मोड बंद हो गया है।"));
        setTimeout(() => router.push('/'), 1800);
      } else {
        setMessage(data.error === 'pin-format' ? tr("Le code doit contenir exactement 4 chiffres", "The code must be exactly 4 digits", "El código debe tener exactamente 4 cifras", "कोड में ठीक 4 अंक होने चाहिए") : (data.error || tr("Erreur", "Error", "Error", "त्रुटि")));
      }
    } catch {
      setMessage(tr("Erreur", "Error", "Error", "त्रुटि"));
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">{tr("Vérification du lien...", "Verifying the link...", "Verificando el enlace...", "लिंक का सत्यापन हो रहा है...")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-6 w-full max-w-sm">
        {isGuestPin ? (
          <>
            <h2 className="text-2xl font-bold text-amber-300 mb-2">{tr("✦ Nouveau code Invité", "✦ New Guest-mode code", "✦ Nuevo código de Invitado", "✦ नया अतिथी कोड")}</h2>
            <p className="text-sm text-amber-100/80 mb-4">
              {tr("Définissez votre code secret à 4 chiffres. Le mode Invité sera désactivé.", "Set your secret 4-digit code. Guest mode will be turned off.", "Defina su código secreto de 4 cifras. El modo Invitado se desactivará.", "अपनी गुप्त 4-अंकीय कोड सेट करें। अतिथी मोड बंद हो जाएगा।")}
            </p>
            <form onSubmit={handleGuestPin} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                autoCorrect="off"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder={tr("Nouveau code (4 chiffres)", "New code (4 digits)", "Nuevo código (4 cifras)", "नया कोड (4 अंक)")}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm text-center tracking-[0.5em]"
                required
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                autoCorrect="off"
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder={tr("Confirmer le code", "Confirm code", "Confirmar el código", "कोड की पुष्टि करें")}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm text-center tracking-[0.5em]"
                required
              />
              {message && <p className={`text-xs ${message.startsWith('✅') ? 'text-amber-200' : 'text-red-400'}`}>{message}</p>}
              <button type="submit" disabled={loading} className="w-full mystic-btn">
                {loading ? tr("Patientez...", "Please wait...", "Espere...", "कृपया प्रतीक्षा करें...") : tr("Enregistrer le code", "Save the code", "Guardar el código", "कोड सहेजें")}
              </button>
            </form>
          </>
        ) : isActivate ? (
          <>
            <h2 className="text-2xl font-bold text-amber-300 mb-2">{tr("✦ Activation de votre compte", "✦ Activating your account", "✦ Activación de su cuenta", "✦ आपके खाते की सक्रियता")}</h2>
            <p className="text-sm text-amber-100/80 mb-4">
              {tr("Confirmez votre adresse email pour activer votre compte et accéder aux univers.", "Confirm your email address to activate your account and access the universes.", "Confirme su dirección de email para activar su cuenta y acceder a los universos.", "कृपया अपना ईमेल पता पुष्टि करें ताकि आपका खाता सक्रिय हो और आप ब्रह्मांडों में प्रवेश कर सकें।")}
            </p>
            <form onSubmit={handleActivate} className="space-y-4">
              {message && <p className={`text-xs ${message.startsWith('✅') ? 'text-amber-200' : 'text-red-400'}`}>{message}</p>}
              <button type="submit" disabled={loading} className="w-full mystic-btn">
                {loading ? tr("Activation...", "Activating...", "Activando...", "सक्रिय हो रहा है...") : tr("Activer mon compte ✦", "Activate my account ✦", "Activar mi cuenta ✦", "अपना खाता सक्रिय करें ✦")}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-amber-300 mb-4">🔑 {tr("Nouveau mot de passe", "New password", "Nueva contraseña", "नया पासवर्ड")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tr("Nouveau mot de passe", "New password", "Nueva contraseña", "नया पासवर्ड")}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={tr("Confirmer", "Confirm", "Confirmar", "पुष्टि करें")}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm"
                required
              />
              {message && <p className={`text-xs ${message.startsWith('✅') ? 'text-amber-200' : 'text-red-400'}`}>{message}</p>}
              <button type="submit" disabled={loading} className="w-full mystic-btn">
                {loading ? tr("Patientez...", "Please wait...", "Espere...", "कृपया प्रतीक्षा करें...") : tr("Changer le mot de passe", "Change password", "Cambiar la contraseña", "पासवर्ड बदलें")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
