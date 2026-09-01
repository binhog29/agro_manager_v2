import sqlite3

def consertar_banco():
    try:
        conn = sqlite3.connect('banco_dados.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE propriedades ADD COLUMN cap_represa INTEGER DEFAULT 200")
        cursor.execute("ALTER TABLE propriedades ADD COLUMN cap_chiqueiro INTEGER DEFAULT 50")
        cursor.execute("ALTER TABLE propriedades ADD COLUMN cap_galinheiro INTEGER DEFAULT 100")
        conn.commit()
        conn.close()
        print("✅ Limites de habitats adicionados com sucesso ao banco de dados!")
    except Exception as e:
        print("⚠️ As colunas já existem ou ocorreu um erro:", e)

if __name__ == '__main__':
    consertar_banco()
