'use client';

import { tr, useLang } from '@/lib/i18n';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { calcAge } from '@/lib/dates';
import { getDeviceToken } from '@/lib/device-client';
import { isDisposableEmail } from '@/lib/disposable-emails';
import GoogleButton from '@/components/google-button';
// Petit œil SVG (afficher/masquer le mot de passe) — remplace l'emoji 👁️,
// hors charte. Filet doré fin, cohérent avec les champs « Mon espace ».
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      {open ? <circle cx="12" cy="12" r="2.6" /> : <path d="M4 4l16 16" />}
    </svg>
  );
}

// Turnstile désactivé en dev
// import { Turnstile } from 'react-turnstile';

// Schéma de validation — reconstruit à chaque soumission pour que les messages
// suivent la langue courante (tr() lit la langue runtime au moment du parse).
const buildSignupSchema = () => {
  const passwordSchema = z.string()
    .min(8, tr("8 caractères minimum", "At least 8 characters", "Mínimo 8 caracteres", "कम से कम 8 अक्षर"))
    .max(20, tr("20 caractères maximum", "At most 20 characters", "Máximo 20 caracteres", "अधिकतम 20 अक्षर"))
    .regex(/[a-z]/, tr("1 minuscule obligatoire", "1 lowercase letter required", "1 minúscula obligatoria", "1 छोटा अक्षर आवश्यक"))
    .regex(/[A-Z]/, tr("1 majuscule obligatoire", "1 uppercase letter required", "1 mayúscula obligatoria", "1 बड़ा अक्षर आवश्यक"))
    .regex(/[0-9]/, tr("1 chiffre obligatoire", "1 digit required", "1 cifra obligatoria", "1 अंक आवश्यक"));

  return z.object({
    email: z.string().email(tr("Format email invalide", "Invalid email format", "Formato de email no válido", "ईमेल प्रारूप अमान्य")).min(1, tr("L'email est obligatoire", "Email is required", "El email es obligatorio", "ईमेल आवश्यक है")).refine((v) => !isDisposableEmail(v),
      tr("Cette adresse email n'est pas acceptée. Utilise une adresse personnelle.", "This email address is not accepted. Please use a personal address.", "Esta dirección de correo no se acepta. Use una dirección personal.", "यह ईमेल पता स्वीकार्य नहीं है। कृपया एक व्यक्तिगत पता उपयोग करें।")),
    firstName: z.string().min(2, tr("2 lettres minimum requises pour le prénom", "First name needs at least 2 letters", "El nombre requiere al menos 2 letras", "नाम में कम से कम 2 अक्षर आवश्यक")),
    lastName: z.string().optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string(),
    gender: z.enum(["male", "female", "other"]).optional(),
    dateOfBirth: z.string()
      .min(1, tr("La date de naissance est obligatoire", "Date of birth is required", "La fecha de nacimiento es obligatoria", "जन्म तिथि आवश्यक है"))
      .refine((v) => { const d = new Date(v); return !isNaN(d.getTime()) && d.getTime() < Date.now(); },
        tr("Date invalide", "Invalid date", "Fecha no válida", "अमान्य तिथि"))
      .refine((v) => { const a = calcAge(v); return a !== null && a >= 16; },
        tr("L’oracle accueille les personnes de 16 ans et plus.", "The Oracle welcomes people aged 16 and over.", "El Oráculo acoge a personas de 16 años en adelante.", "देववाणी 16 वर्ष और उससे अधिक आयु के लोगों का स्वागत करती है।")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: tr("Les mots de passe ne correspondent pas", "Passwords do not match", "Las contraseñas no coinciden", "पासवर्ड मेल नहीं खाते"),
    path: ["confirmPassword"],
  });
};

export default function SignUpPage() {
  const router = useRouter();
  const lang = useLang();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    gender: 'other' as 'male' | 'female' | 'other',
    dateOfBirth: '',
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>("skip");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8 && pwd.length <= 20,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      digit: /[0-9]/.test(pwd),
    };
    return Object.values(checks).every(v => v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const dataToValidate = {
      ...formData,
      // Chaîne vide ON volontaire : Zod la traite via .min(1) et affiche notre
      // message localisé (undefined donnerait l'erreur générique « Required »).
      dateOfBirth: formData.dateOfBirth,
      lastName: formData.lastName === '' ? undefined : formData.lastName,
    };

    try {
      buildSignupSchema().parse(dataToValidate);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        validationError.errors.forEach((err) => {
          // 1er message par champ (le plus spécifique, ex. « obligatoire » passe
          // avant « invalide »/« 16 ans et plus » qu'un champ vide accumule).
          if (err.path.length > 0) {
            const k = err.path[0] as string;
            if (!(k in fieldErrors)) fieldErrors[k] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return;
    }

    if (!turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      setApiError('Veuillez valider le captcha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dataToValidate, turnstileToken, lang, deviceToken: getDeviceToken() }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
        setShowSuccess(true);
        setTimeout(() => router.push('/dashboard/account'), 3000);
      } else {
        const data = await res.json();
        setApiError(data.error || tr("Erreur lors de la création du compte.", "Error while creating the account.", "Error al crear la cuenta.", "खाता बनाते समय त्रुटि।"));
      }
    } catch (err) {
      console.error("Erreur API:", err);
      setApiError(tr("Une erreur inattendue est survenue. Veuillez réessayer.", "An unexpected error occurred. Please try again.", "Ocurrió un error inesperado. Inténtelo de nuevo.", "एक अप्रत्याशित त्रुटि हुई। कृपया फिर प्रयास करें।"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cosmos min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Le ciel de « Mon espace » : bleu nuit profond, voie lactée, étoiles. */}
      <div className="cosmos-veil" aria-hidden />
      <div className="cosmos-nebula3" aria-hidden />
      <div className="cosmos-galaxy" aria-hidden />
      <div className="cosmos-stars" aria-hidden />
      <div className="cosmos-stars2" aria-hidden />

      <div className="relative w-full max-w-sm sm:max-w-md">
        {showSuccess ? (
          <div className="mystic-panel p-6 shadow-2xl text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-amber-500/30 bg-black/30 flex items-center justify-center" style={{ boxShadow: '0 0 24px rgba(218,165,32,0.35)' }}>
              <img src="/logo-espace.png" alt="" className="h-10 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(218,165,32,0.5))' }} />
            </div>
            <h2 className="mystic-title text-2xl font-bold mb-2">{tr("Inscription Réussie !", "Sign-Up Successful!", "¡Registro completado!", "पंजीकरण सफल रहा!")}</h2>
            <p className="text-gray-300 mb-4">
              {tr("Consultez vos emails pour activer votre compte et découvrir les mystères du Tarot et du Yi Jing.", "Check your emails to activate your account and discover the mysteries of Tarot and the Yi Jing.", "Consulte sus emails para activar su cuenta y descubrir los misterios del Tarot y del Yi Jing.", "अपने ईमेल देखें ताकि आप अपना खाता सक्रिय कर सकें और टैरो तथा इ चिंग के रहस्य जान सकें।")}
            </p>
            {/* Formulaire Oracle PROPOSÉ ici, jamais imposé : le compte reste
                utilisable sans lui, et il reste accessible plus tard dans
                « Mon espace ». */}
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-black/25 p-3 text-left">
              <p className="text-amber-200/90 text-[12.5px] leading-snug" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
                {tr("Optionnel : le formulaire Oracle affinitise vos tirages (questions, thèmes, sensibilité). Vous pouvez le remplir tout de suite — ou plus tard, tranquillement, depuis « Mon espace ».", "Optional: the Oracle form fine-tunes your readings (questions, themes, sensitivity). Fill it now — or later, at your leisure, from “My space”.", "Opcional: el formulario Oráculo afina sus tiradas (preguntas, temas, sensibilidad). Puede rellenarlo ahora… o más tarde, con calma, desde «Mi espacio».", "वैकल्पिक: ओरैकल फ़ॉर्म आपके पाठों को अनुकूलित करता है (प्रश्न, विषय, संवेदनशीलता)। इसे अभी भरें — या बाद में, आराम से, «मेरा क्षेत्र» से।")}
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/account')}
                className="mt-2 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                {tr("Compléter le formulaire Oracle maintenant", "Complete the Oracle form now", "Rellenar el formulario Oráculo ahora", "अभी ओरैकल फ़ॉर्म पूरा करें")}
              </button>
            </div>
            <div className="mt-3 text-amber-500/70 text-sm">{tr("Redirection vers la connexion...", "Redirecting to login...", "Redirigiendo a la conexión...", "लॉगिन की ओर ले जाया जा रहा है...")}</div>
          </div>
        ) : (
          <div className="mystic-panel shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
            
            <div className="text-center p-4 sm:p-5 border-b border-amber-500/20 flex-shrink-0">
              <div className="flex items-center justify-center gap-2.5 mb-2">
                <img src="/logo-espace.png" alt="" className="h-8 sm:h-9 w-auto object-contain -mt-0.5" style={{ filter: 'drop-shadow(0 0 8px rgba(218,165,32,0.45))' }} />
                <h1 className="mystic-title text-xl sm:text-2xl font-bold">
                  {tr("Inscription", "Sign Up", "Registro", "पंजीकरण")}
                </h1>
              </div>
              <p className="text-amber-100/70 text-xs" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
                {tr("Bienvenue dans le monde des arcanes et des arts divinatoires", "Welcome to the world of arcana and the divinatory arts", "Bienvenido al mundo de los arcanos y las artes adivinatorias", "अर्काना और दिव्य कलाओं की दुनिया में आपका स्वागत है")}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-3">
              {/* Inscription express par Google — le compte email classique
                  reste disponible ci-dessous. */}
              <GoogleButton />

              <form onSubmit={handleSubmit} className="space-y-3">
                
                <div className="group">
                  <label htmlFor="email" className="mystic-label block mb-1.5">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    inputMode="email"
                    autoComplete="off"
                    className="mystic-input"
                    placeholder={tr("votre@email.com", "your@email.com", "votre@email.com", "votre@email.com")}
                    required
                  />
                  {errors.email && <p className="text-red-400 text-[10px] mt-1 animate-shake">{errors.email}</p>}
                </div>

                <div className="group">
                  <label htmlFor="firstName" className="mystic-label block mb-1.5">{tr("Prénom/Pseudo *", "First name/Nickname *", "Nombre/seudónimo *", "नाम / उपनाम *")}</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    className="mystic-input"
                    placeholder={tr("Votre prénom (min 2 lettres)", "Your first name (min 2 letters)", "Su nombre (mín. 2 letras)", "आपका नाम (न्यूनतम 2 अक्षर)")}
                    required
                  />
                  {errors.firstName && <p className="text-red-400 text-[10px] mt-1">{errors.firstName}</p>}
                </div>

                {/* Mot de passe */}
                <div className="group">
                  <label htmlFor="password" className="mystic-label block mb-1.5">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="mystic-input pr-10"
                      placeholder={tr("8-20 caractères, A-Z, a-z, 0-9", "8-20 characters, A-Z, a-z, 0-9", "8-20 caractères, A-Z, a-z, 0-9", "8-20 अक्षर, A-Z, a-z, 0-9")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/60 hover:text-amber-300"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-[10px] mt-1">{errors.password}</p>}
                  
                  {/* Indicateur de force */}
                  {formData.password && (
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-0.5 flex-1 rounded ${
                          validatePasswordStrength(formData.password) 
                            ? 'bg-green-500' 
                            : formData.password.length >= 8 
                              ? 'bg-amber-500' 
                              : 'bg-gray-600'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmation mot de passe */}
                <div className="group">
                  <label htmlFor="confirmPassword" className="mystic-label block mb-1.5">Confirmation *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="mystic-input pr-10"
                      placeholder={tr("Confirmez le mot de passe", "Confirm password", "Confirme la contraseña", "पासवर्ड की पुष्टि करें")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/60 hover:text-amber-300"
                    >
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-[10px] mt-1 animate-shake">{errors.confirmPassword}</p>}
                  
                  {/* Cohérence visuelle */}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-green-400 text-[10px] mt-1">{tr("✓ Mots de passe identiques", "✓ Passwords match", "✓ Contraseñas idénticas", "✓ पासवर्ड समान हैं")}</p>
                  )}
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-red-400 text-[10px] mt-1">{tr("✗ Mots de passe différents", "✗ Passwords don't match", "✗ Contraseñas diferentes", "✗ पासवर्ड अलग-अलग हैं")}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lastName" className="mystic-label block mb-1.5">{tr("Nom", "Last name", "Apellido", "उपनाम")}</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      autoComplete="family-name"
                      className="mystic-input"
                      placeholder={tr("Nom", "Last name", "Apellido", "उपनाम")}
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="mystic-label block mb-1.5">{tr("Sexe", "Gender", "Sexo", "लिंग")}</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="mystic-input appearance-none [color-scheme:dark]"
                    >
                      <option value="male">{tr("Homme", "Male", "Hombre", "पुरुष")}</option>
                      <option value="female">{tr("Femme", "Female", "Mujer", "महिला")}</option>
                      <option value="other">{tr("Autre", "Other", "Otro", "अन्य")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="mystic-label block mb-1.5">{tr("Date de naissance *", "Date of birth *", "Fecha de nacimiento *", "जन्म तिथि *")}</label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().slice(0, 10)}
                      // Pas de `required` natif : il court-circuite handleSubmit (bulle
                      // du navigateur invisible/tronquée selon le device) et nos messages
                      // multilingues ne s'affichent jamais. Zod ci-dessus = source unique.
                      className="mystic-input [color-scheme:dark]"
                    />
                    {errors.dateOfBirth && <p className="text-red-400 text-[10px] mt-1">{errors.dateOfBirth}</p>}
                  </div>

                </div>



                {apiError && (
                  <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs text-center">
                    {apiError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mystic-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Invocation en cours...
                      </>
                    ) : (
                      <>
                        <span>{tr("Créer mon compte", "Create my account", "Crear mi cuenta", "अपना खाता बनाएँ")}</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>

            <div className="p-3 text-center text-amber-200/60 text-[11px] border-t border-amber-500/15" style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {tr("✦ L'Oracle des Étoiles ✦", "✦ The Oracle of Stars ✦", "✦ El Oráculo de las Estrellas ✦", "✦ तारों का ओरैकल ✦")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}