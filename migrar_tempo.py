import sqlite3

def migrar_clima():
    conn = sqlite3.connect('banco_dados.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE jogadores ADD COLUMN clima_atual VARCHAR(20) DEFAULT 'sol';")
        cursor.execute("ALTER TABLE jogadores ADD COLUMN estacao_atual VARCHAR(20) DEFAULT 'primavera';")
        print("✅ Clima e Estação adicionados com sucesso aos Jogadores!")
    except Exception as e:
        print("⚠️ Colunas já existem ou houve erro:", e)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrar_clima()
