#!/usr/bin/env python3
"""
Gestionnaire SQLite simplifié pour votre base de données
Utilisation : python db_manager.py
"""

import sqlite3

DB_PATH = r"C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\dev.db"

def main():
    print("=" * 70)
    print("🗄️  GESTIONNAIRE SQLite - dev.db")
    print("=" * 70)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    while True:
        print("\n📋 MENU :")
        print("  1️⃣  Voir tous les utilisateurs")
        print("  2️⃣  Chercher par email")
        print("  3️⃣  Ajouter un utilisateur")
        print("  4️⃣  Modifier un utilisateur")
        print("  5️⃣  Supprimer un utilisateur")
        print("  6️⃣  Quitter")
        
        choice = input("\n👉 Votre choix (1-6) : ")
        
        if choice == "1":
            cursor.execute('SELECT * FROM users')
            users = cursor.fetchall()
            print(f"\n👥 {len(users)} utilisateurs trouvés\n")
            for u in users:
                print(f"  📧 {u[1]} | 👤 {u[3]} {u[4]} | 🎂 {u[6]} ans")
        
        elif choice == "2":
            email = input("🔍 Email à chercher : ")
            cursor.execute('SELECT * FROM users WHERE email LIKE ?', (f'%{email}%',))
            users = cursor.fetchall()
            for u in users:
                print(f"\n📧 {u[1]} | 👤 {u[3]} {u[4]} | 🎂 {u[6]}")
        
        elif choice == "3":
            print("➕ Ajout utilisateur")
            # Implementation à la demande
            
        elif choice == "4":
            print("✏️ Modification utilisateur")
            # Implementation à la demande
            
        elif choice == "6":
            print("👋 Au revoir !")
            break
        
        conn.commit()
    
    conn.close()

if __name__ == "__main__":
    main()
