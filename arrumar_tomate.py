import sqlite3

def consertar_banco():
    try:
        conn = sqlite3.connect('banco_dados.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE propriedades ADD COLUMN est_tomate INTEGER DEFAULT 0")
        conn.commit()
        conn.close()
        print("✅ Coluna 'est_tomate' adicionada com sucesso ao banco de dados!")
    except Exception as e:
        print("⚠️ A coluna já existe ou ocorreu um erro:", e)

if __name__ == '__main__':
    consertar_banco()
