import sqlite3

def consertar_banco():
    try:
        conn = sqlite3.connect('banco_dados.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE animais ADD COLUMN destino_id INTEGER")
        cursor.execute("ALTER TABLE animais ADD COLUMN habitat_destino VARCHAR(50)")
        cursor.execute("ALTER TABLE animais ADD COLUMN horas_viagem INTEGER DEFAULT 0")
        conn.commit()
        conn.close()
        print("✅ Colunas de Logística e Frota adicionadas com sucesso!")
    except Exception as e:
        print("⚠️ As colunas já existem ou ocorreu um erro:", e)

if __name__ == '__main__':
    consertar_banco()
