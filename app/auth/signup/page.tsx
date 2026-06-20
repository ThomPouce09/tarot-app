'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
// Turnstile désactivé en dev
// import { Turnstile } from 'react-turnstile';

// Schéma de validation avec règles strictes
const passwordSchema = z.string()
  .min(8, "8 caractères minimum")
  .max(20, "20 caractères maximum")
  .regex(/[a-z]/, "1 minuscule obligatoire")
  .regex(/[A-Z]/, "1 majuscule obligatoire")
  .regex(/[0-9]/, "1 chiffre obligatoire");

const signupSchema = z.object({
  email: z.string().email("Format email invalide").min(1, "L'email est obligatoire"),
  firstName: z.string().min(2, "2 lettres minimum requises pour le prénom"),
  lastName: z.string().optional().or(z.literal('')),
  password: passwordSchema,
  confirmPassword: z.string(),
  gender: z.enum(["male", "female", "other"]).optional(),
  age: z.number().int().positive("L'âge doit être un nombre positif").optional().or(z.literal(0)),
  phone: z.string().optional().or(z.literal('')),
  comment: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    gender: 'other' as 'male' | 'female' | 'other',
    age: 0,
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
      age: formData.age === 0 ? undefined : formData.age,
      lastName: formData.lastName === '' ? undefined : formData.lastName,
      phone: formData.phone === '' ? undefined : formData.phone,
      comment: formData.comment === '' ? undefined : formData.comment,
    };

    try {
      signupSchema.parse(dataToValidate);
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dataToValidate, turnstileToken }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
        setShowSuccess(true);
        setTimeout(() => router.push('/dashboard/account'), 3000);
      } else {
        const data = await res.json();
        setApiError(data.error || "Erreur lors de la création du compte.");
      }
    } catch (err) {
      console.error("Erreur API:", err);
      setApiError("Une erreur inattendue est survenue. Veuillez réessayer.");
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
            <h2 className="text-2xl font-bold text-amber-300 mb-2">Inscription Réussie !</h2>
            <p className="text-gray-300 mb-4">
              Consultez vos emails pour activer votre compte et découvrir les mystères du Tarot et du Yi Jing.
            </p>
            <div className="text-amber-500/70 text-sm">Redirection vers la connexion...</div>
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
                Accédez aux tirages de Tarot et aux hexagrammes du Yi Jing
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
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="votre@email.com"
                    required
                  />
                  {errors.email && <p className="text-red-400 text-[10px] mt-1 animate-shake">{errors.email}</p>}
                </div>

                <div className="group">
                  <label htmlFor="firstName" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">👤</span>
                    Prénom/Pseudo *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all"
                    placeholder="Votre prénom (min 2 lettres)"
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
                      placeholder="8-20 caractères, A-Z, a-z, 0-9"
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
                      placeholder="Confirmez le mot de passe"
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
                    <p className="text-green-400 text-[10px] mt-1">✓ Mots de passe identiques</p>
                  )}
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-red-400 text-[10px] mt-1">✗ Mots de passe différents</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lastName" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">🏷️</span>
                      Nom
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      autoComplete="family-name"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                      placeholder="Nom"
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">♂♀</span>
                      Sexe
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 appearance-none"
                    >
                      <option value="male" className="bg-gray-800">Homme ♂</option>
                      <option value="female" className="bg-gray-800">Femme ♀</option>
                      <option value="other" className="bg-gray-800">Autre ☯</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="age" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">🎂</span>
                      Âge
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age === 0 ? "" : formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : 0 })}
                      inputMode="numeric"
                      className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                      placeholder="Âge"
                    />
                    {errors.age && <p className="text-red-400 text-[10px] mt-1">{errors.age}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                      <span className="text-amber-500">📞</span>
                      Téléphone
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
                      placeholder="Téléphone"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="comment" className="flex items-center gap-1 text-gray-300 text-xs font-medium mb-1">
                    <span className="text-amber-500">💭</span>
                    Commentaire
                  </label>
                  <textarea
                    id="comment"
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                    placeholder="Vos remarques sur l'univers..."
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
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-amber-900/30 active:scale-[0.97] touch-manipulation relative overflow-hidden group"
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
                        <span>Créer mon compte</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </form>
            </div>

            <div className="p-3 text-center text-amber-700/50 text-[10px] border-t border-amber-800/20">
              <span className="hidden sm:inline">🔮 Tarot & Yi Jing - L'âme a toutes ses réponses</span>
              <span className="sm:hidden">🌙 Tarot YiJing</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}