import sqlite3

print("🔍 Conectando ao banco de dados: banco_dados.db")

conn = sqlite3.connect('banco_dados.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE propriedades ADD COLUMN est_qav INTEGER DEFAULT 0;")
    conn.commit()
    print("✅ Sucesso! Coluna 'est_qav' criada na tabela propriedades.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️ A coluna 'est_qav' já existe no banco_dados.db.")
    else:
        print(f"⚠️ Erro: {e}")
finally:
    conn.close()
