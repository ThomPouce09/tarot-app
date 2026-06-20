import sqlite3

conn = sqlite3.connect(r'C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\dev.db')
cursor = conn.cursor()

cursor.execute('SELECT email, first_name, last_name, gender, age FROM users')
for row in cursor.fetchall():
    print(f'Email: {row[0]}, Prénom: {row[1]}, Nom: {row[2]}, Sexe: {row[3]}, Age: {row[4]}')

conn.close()