export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#0a0604' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: '#DAA520', fontFamily: 'var(--font-cinzel-deco), serif' }}>
          Politique de Confidentialité
        </h1>
        <div className="space-y-6 text-sm" style={{ color: 'rgba(255,215,0,0.8)', fontFamily: 'var(--font-cinzel), serif' }}>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>1. Collecte des données</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application : email, mot de passe, prénom/nom, sexe, âge, téléphone et commentaire.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>2. Utilisation des données</h2>
            <p>Les données sont utilisées pour : vous authentifier, personnaliser les tirages et améliorer l'expérience utilisateur.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>3. Vos droits</h2>
            <p>Vous pouvez demander la suppression de votre compte et de vos données à tout moment en contactant notre support.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>4. Cookies</h2>
            <p>Nous utilisons des cookies essentiels au fonctionnement du site. Vous pouvez les refuser sauf les cookies techniques nécessaires.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>5. Sécurité</h2>
            <p>Vos données sont protégées par un chiffrement SSL et une authentification sécurisée.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
