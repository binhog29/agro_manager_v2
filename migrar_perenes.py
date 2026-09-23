import sqlite3

def preparar_banco_para_perenes():
    print("🚜 Preparando o solo do banco de dados para culturas perenes...")
    conn = sqlite3.connect('banco_dados.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE lotes ADD COLUMN ciclos_colhidos INTEGER DEFAULT 0;")
        print("✅ Coluna 'ciclos_colhidos' (para envelhecimento) adicionada com sucesso!")
    except sqlite3.OperationalError as e:
        print("⚠️ Coluna 'ciclos_colhidos' já existe ou erro:", e)
        
    try:
        cursor.execute("ALTER TABLE lotes ADD COLUMN dias_descanso FLOAT DEFAULT 0.0;")
        print("✅ Coluna 'dias_descanso' (para pausa da safra) adicionada com sucesso!")
    except sqlite3.OperationalError as e:
        print("⚠️ Coluna 'dias_descanso' já existe ou erro:", e)

    conn.commit()
    conn.close()
    print("🚀 Banco de dados blindado e pronto para a nova biologia!")

if __name__ == '__main__':
    preparar_banco_para_perenes()
