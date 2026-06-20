const fs = require('fs');
const path = require('path');

const filePath = 'app/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Nouveau code pour les boutons/menu
const newButtonSection = `      {/* Hamburger Menu or Auth Buttons (Top Right) */}
      {isLoggedIn ? (
        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-amber-300 hover:text-amber-200 transition-all"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                background: 'rgba(139, 105, 20, 0.25)',
                border: '1px solid rgba(218, 165, 32, 0.3)',
                backdropFilter: 'blur(4px)',
              }}
              aria-label="Menu"
            >
              Menu
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900/90 border border-amber-700/50 rounded-lg shadow-xl py-2">
                <a href="/dashboard/account" className="block px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30">Mon compte</a>
                <a href="/dashboard/readings" className="block px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30">Historique</a>
                <button onClick={handleLogout} className="block px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 w-full text-left">Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Link
            href="/auth/signup"
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all opacity-80 hover:opacity-100"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              background: 'rgba(139, 105, 20, 0.25)',
              color: '#DAA520',
              border: '1px solid rgba(218, 165, 32, 0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Inscription
          </Link>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all opacity-80 hover:opacity-100"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              background: 'rgba(139, 105, 20, 0.25)',
              color: '#FFD700',
              border: '1px solid rgba(218, 165, 32, 0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Connexion
          </button>
        </div>
      )}`;

// Trouver et remplacer la section
const oldSection = content.match(/{\/\* AUTH BUTTONS[\s\S]*?z-50 flex items-center gap-2\"\>/)[0];
console.log('Old section found:', oldSection.length);

content = content.replace(oldSection, newButtonSection);
fs.writeFileSync(filePath, content);
console.log('Patch appliqué');
