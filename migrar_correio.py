import sqlite3

def migrar():
    print("🚜 Construindo a Caixa de Correio da Fazenda...")
    conn = sqlite3.connect('banco_dados.db')
    cursor = conn.cursor()
    try:
        cursor.execute('''
            CREATE TABLE notificacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jogador_id INTEGER NOT NULL,
                texto VARCHAR(255) NOT NULL,
                lida BOOLEAN DEFAULT 0,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(jogador_id) REFERENCES jogadores(id)
            );
        ''')
        print("✅ Tabela 'notificacoes' criada com sucesso!")
    except Exception as e:
        print("⚠️ Tabela já existe ou erro:", e)
    conn.commit()
    conn.close()
    print("🚀 Concluído!")

if __name__ == '__main__':
    migrar()
