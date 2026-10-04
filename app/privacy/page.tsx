'use client';

import { tr } from '@/lib/i18n';
export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#0a0604' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: '#DAA520', fontFamily: 'var(--font-cinzel-deco), serif' }}>
          {tr("Politique de Confidentialité", "Privacy Policy", "Política de Privacidad", "गोपनीयता नीति")}
        </h1>
        <div className="space-y-6 text-sm" style={{ color: 'rgba(255,215,0,0.8)', fontFamily: 'var(--font-cinzel), serif' }}>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>{tr("1. Collecte des données", "1. Data Collection", "1. Recopilación de datos", "1. डेटा संग्रह")}</h2>
            <p>{tr("Nous collectons uniquement les donn\u00e9es n\u00e9cessaires au fonctionnement de l'application : email, mot de passe, pr\u00e9nom/nom, sexe, \u00e2ge, t\u00e9l\u00e9phone et commentaire.", "We collect only the data needed for the app to work: email, password, first/last name, gender, age, phone number, and comment.", "Recopilamos \u00fanicamente los datos necesarios para el funcionamiento de la aplicaci\u00f3n: correo electr\u00f3nico, contrase\u00f1a, nombre/apellidos, sexo, edad, tel\u00e9fono y comentario.", "\u0939\u092e \u0915\u0947\u0935\u0932 \u0910\u092a \u0915\u0947 \u0938\u0902\u091a\u093e\u0932\u0928 \u0915\u0947 \u0932\u093f\u090f \u0906\u0935\u0936\u094d\u092f\u0915 \u0921\u0947\u091f\u093e \u090f\u0915\u0924\u094d\u0930 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902: \u0908\u092e\u0947\u0932, \u092a\u093e\u0938\u0935\u0930\u094d\u0921, \u092a\u0939\u0932\u093e/\u0909\u092a\u0928\u093e\u092e, \u0932\u093f\u0902\u0917, \u0906\u092f\u0941, \u092b\u093c\u094b\u0928 \u0914\u0930 \u091f\u093f\u092a\u094d\u092a\u0923\u0940\u0964")}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>{tr("2. Utilisation des données", "2. Use of Data", "2. Uso de los datos", "2. डेटा का उपयोग")}</h2>
            <p>{tr("Les donn\u00e9es sont utilis\u00e9es pour : vous authentifier, personnaliser les tirages et am\u00e9liorer l'exp\u00e9rience utilisateur.", "The data is used to: authenticate you, personalize the readings, and improve the user experience.", "Los datos se utilizan para: autenticarle, personalizar las tiradas y mejorar la experiencia de usuario.", "\u0921\u0947\u091f\u093e \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0907\u0928 \u0939\u0947\u0924\u0941 \u0915\u093f\u092f\u093e \u091c\u093e\u0924\u093e \u0939\u0948: \u0906\u092a\u0915\u093e \u092a\u094d\u0930\u092e\u093e\u0923\u0940\u0915\u0930\u0923, \u0935\u093e\u091a\u0928 \u0915\u094b \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u092c\u0928\u093e\u0928\u093e \u0914\u0930 \u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e \u0905\u0928\u0941\u092d\u0935 \u0938\u0941\u0927\u093e\u0930\u0928\u093e\u0964")}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>{tr("3. Vos droits", "3. Your Rights", "3. Sus derechos", "3. आपके अधिकार")}</h2>
            <p>{tr("Vous pouvez demander la suppression de votre compte et de vos donn\u00e9es \u00e0 tout moment en contactant notre support.", "You may request the deletion of your account and your data at any time by contacting our support.", "Puede solicitar la eliminaci\u00f3n de su cuenta y de sus datos en cualquier momento contactando con nuestro soporte.", "\u0906\u092a \u0915\u093f\u0938\u0940 \u092d\u0940 \u0938\u092e\u092f \u0939\u092e\u093e\u0930\u0947 \u0938\u0939\u093e\u092f\u0924\u093e \u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0915\u0947 \u0905\u092a\u0928\u0947 \u0916\u093e\u0924\u0947 \u0914\u0930 \u0921\u0947\u091f\u093e \u0915\u0947 \u0939\u091f\u093e\u090f \u091c\u093e\u0928\u0947 \u0915\u093e \u0905\u0928\u0941\u0930\u094b\u0927 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964")}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>4. Cookies</h2>
            <p>{tr("Nous utilisons des cookies essentiels au fonctionnement du site. Vous pouvez les refuser sauf les cookies techniques nécessaires.", "We use cookies essential to the site's operation. You may refuse them except for the necessary technical cookies.", "Usamos cookies esenciales para el funcionamiento del sitio. Puede rechazarlas salvo las cookies técnicas necesarias.", "हम साइट के संचालन के लिए आवश्यक कुकीज़ का उपयोग करते हैं। आप उन्हें अस्वीकार कर सकते हैं, सिवाय आवश्यक तकनीकी कुकीज़ के।")}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#FFD700' }}>{tr("5. Sécurité", "5. Security", "5. Seguridad", "5. सुरक्षा")}</h2>
            <p>{tr("Vos donn\u00e9es sont prot\u00e9g\u00e9es par un chiffrement SSL et une authentification s\u00e9curis\u00e9e.", "Your data is protected by SSL encryption and secure authentication.", "Sus datos est\u00e1n protegidos por cifrado SSL y una autenticaci\u00f3n segura.", "\u0906\u092a\u0915\u093e \u0921\u0947\u091f\u093e SSL \u090f\u0928\u094d\u0915\u094d\u0930\u093f\u092a\u094d\u0936\u0928 \u0914\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u092a\u094d\u0930\u092e\u093e\u0923\u0940\u0915\u0930\u0923 \u0938\u0947 \u0938\u0902\u0930\u0915\u094d\u0937\u093f\u0924 \u0939\u0948\u0964")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
