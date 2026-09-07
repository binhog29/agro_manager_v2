import sqlite3

def fazer_migracao():
    print("🚜 Iniciando a atualização do banco de dados...")
    
    # Conecta no seu arquivo de banco de dados
    conn = sqlite3.connect('banco_dados.db')
    cursor = conn.cursor()
    
    # Tenta adicionar a coluna do tipo de cocho
    try:
        cursor.execute("ALTER TABLE lotes ADD COLUMN tipo_cocho VARCHAR(20) DEFAULT 'vazio';")
        print("✅ Coluna 'tipo_cocho' adicionada com sucesso!")
    except sqlite3.OperationalError as e:
        print("⚠️ Coluna 'tipo_cocho' já existe ou erro:", e)
        
    # Tenta adicionar a coluna da quantidade do cocho
    try:
        cursor.execute("ALTER TABLE lotes ADD COLUMN qtd_cocho FLOAT DEFAULT 0.0;")
        print("✅ Coluna 'qtd_cocho' adicionada com sucesso!")
    except sqlite3.OperationalError as e:
        print("⚠️ Coluna 'qtd_cocho' já existe ou erro:", e)

    # Salva e fecha
    conn.commit()
    conn.close()
    print("🚀 Migração concluída com sucesso! O banco está pronto.")

if __name__ == '__main__':
    fazer_migracao()
