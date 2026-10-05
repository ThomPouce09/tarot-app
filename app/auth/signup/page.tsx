'use client';

import { tr, useLang } from '@/lib/i18n';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { api } from '@/lib/api-client';
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
    email: z.string().email(tr("Format email invalide", "Invalid email format", "Formato de email no válido", "ईमेल प्रारूप अमान्य")).min(1, tr("L'email est obligatoire", "Email is required", "El email es obligatorio", "ईमेल आवश्यक है")),
    firstName: z.string().min(2, tr("2 lettres minimum requises pour le prénom", "First name needs at least 2 letters", "El nombre requiere al menos 2 letras", "नाम में कम से कम 2 अक्षर आवश्यक")),
    lastName: z.string().optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string(),
    gender: z.enum(["male", "female", "other"]).optional(),
    dateOfBirth: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    comment: z.string().optional().or(z.literal('')),
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
    phone: '',
    comment: '',
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
      dateOfBirth: formData.dateOfBirth || undefined,
      lastName: formData.lastName === '' ? undefined : formData.lastName,
      phone: formData.phone === '' ? undefined : formData.phone,
      comment: formData.comment === '' ? undefined : formData.comment,
    };

    try {
      buildSignupSchema().parse(dataToValidate);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        validationError.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message;
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
      const res = await api('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dataToValidate, turnstileToken, lang }),
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Fond mystique animé */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-amber-600/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-16 w-24 h-24 border-2 border-orange-600/30 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 border-2 border-yellow-600/30 rounded-full animate-pulse delay-500"></div>
      </div>

      <div className="relative w-full max-w-sm sm:max-w-md">
        {showSuccess ? (
          <div className="bg-gradient-to-b from-gray-900 to-amber-950/50 rounded-xl p-6 border border-amber-700/50 shadow-2xl text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-600 to-orange-700 rounded-full flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-2xl font-bold text-amber-300 mb-2">{tr("Inscription Réussie !", "Sign-Up Successful!", "¡Registro completado!", "पंजीकरण सफल रहा!")}</h2>
            <p className="text-gray-300 mb-4">
              {tr("Consultez vos emails pour activer votre compte et découvrir les mystères du Tarot et du Yi Jing.", "Check your emails to activate your account and discover the mysteries of Tarot and the Yi Jing.", "Consulte sus emails para activar su cuenta y descubrir los misterios del Tarot y del Yi Jing.", "अपने ईमेल देखें ताकि आप अपना खाता सक्रिय कर सकें और टैरो तथा इ चिंग के रहस्य जान सकें।")}
            </p>
            <div className="text-amber-500/70 text-sm">{tr("Redirection vers la connexion...", "Redirecting to login...", "Redirigiendo a la conexión...", "लॉगिन की ओर ले जाया जा रहा है...")}</div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-900/80 to-amber-950/30 rounded-xl shadow-2xl border border-amber-800/50 flex flex-col max-h-[90dvh] overflow-hidden">
            
            <div className="text-center p-4 sm:p-5 border-b border-amber-800/30 flex-shrink-0">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">🌙</span>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Inscription
                </h1>
                <span className="text-3xl">☯️</span>
              </div>
              <p className="text-gray-400 text-xs">
                {tr("Accédez aux tirages de Tarot et aux hexagrammes du Yi Jing", "Access Tarot readings and Yi Jing hexagrams", "Acceda a las tiradas de Tarot y a los hexagramas del Yi Jing", "टैरो की विन्यास और इ चिंग के षट्कोण पाएँ")}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                
                <div className="group">
                  <label htmlFor="email" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">📧</span>
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    inputMode="email"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder={tr("votre@email.com", "your@email.com", "votre@email.com", "votre@email.com")}
                    required
                  />
                  {errors.email && <p className="text-red-400 text-[10px] mt-1 animate-shake">{errors.email}</p>}
                </div>

                <div className="group">
                  <label htmlFor="firstName" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">👤</span>
                    {tr("Prénom/Pseudo *", "First name/Nickname *", "Nombre/seudónimo *", "नाम / उपनाम *")}
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all"
                    placeholder={tr("Votre prénom (min 2 lettres)", "Your first name (min 2 letters)", "Su nombre (mín. 2 letras)", "आपका नाम (न्यूनतम 2 अक्षर)")}
                    required
                  />
                  {errors.firstName && <p className="text-red-400 text-[10px] mt-1">{errors.firstName}</p>}
                </div>

                {/* Mot de passe */}
                <div className="group">
                  <label htmlFor="password" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">🔒</span>
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 pr-10"
                      placeholder={tr("8-20 caractères, A-Z, a-z, 0-9", "8-20 characters, A-Z, a-z, 0-9", "8-20 caractères, A-Z, a-z, 0-9", "8-20 अक्षर, A-Z, a-z, 0-9")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-400"
                    >
                      {showPassword ? '👁️' : '👁‍🗨'}
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
                  <label htmlFor="confirmPassword" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">🔐</span>
                    Confirmation *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 pr-10"
                      placeholder={tr("Confirmez le mot de passe", "Confirm password", "Confirme la contraseña", "पासवर्ड की पुष्टि करें")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-400"
                    >
                      {showConfirmPassword ? '👁️' : '👁‍🗨'}
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
                    <label htmlFor="lastName" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">🏷️</span>
                      {tr("Nom", "Last name", "Apellido", "उपनाम")}
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      autoComplete="family-name"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                      placeholder={tr("Nom", "Last name", "Apellido", "उपनाम")}
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">♂♀</span>
                      {tr("Sexe", "Gender", "Sexo", "लिंग")}
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 appearance-none"
                    >
                      <option value="male" className="bg-gray-800">{tr("Homme ♂", "Male ♂", "Hombre ♂", "पुरुष ♂")}</option>
                      <option value="female" className="bg-gray-800">{tr("Femme ♀", "Female ♀", "Mujer ♀", "महिला ♀")}</option>
                      <option value="other" className="bg-gray-800">{tr("Autre ☯", "Other ☯", "Otro ☯", "अन्य ☯")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">🎂</span>
                      {tr("Date de naissance", "Date of birth", "Fecha de nacimiento", "जन्म तिथि")}
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">📞</span>
                      {tr("Téléphone", "Phone", "Teléfono", "फ़ोन")}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                      placeholder={tr("T\u00e9l\u00e9phone", "Phone", "Tel\u00e9fono", "\u092b\u093c\u094b\u0928")}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">💭</span>
                    {tr("Commentaire", "Comment", "Comentario", "टिप्पणी")}
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                    placeholder={tr("Vos remarques sur l'univers...", "Your comments about the universe...", "Sus observaciones sobre el universo...", "ब्रह्मांड के बारे में आपके विचार...")}
                  ></textarea>
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

            <div className="p-3 text-center text-amber-700/50 text-[10px] border-t border-amber-800/20">
              <span className="hidden sm:inline">{tr("🔮 Tarot & Yi Jing - L'âme a toutes ses réponses", "🔮 Tarot & Yi Jing - The soul has all the answers", "🔮 Tarot & Yi Jing - El alma tiene todas las respuestas", "🔮 टैरो और इ चिंग - आत्मा के पास सभी उत्तर हैं")}</span>
              <span className="sm:hidden">🌙 Tarot YiJing</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}