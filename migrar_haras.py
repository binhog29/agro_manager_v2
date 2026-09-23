import sqlite3

def consertar_banco():
    try:
        conn = sqlite3.connect('banco_dados.db')
        cursor = conn.cursor()
        
        colunas = [
            "cap_haras INTEGER DEFAULT 10",
            "tem_haras BOOLEAN DEFAULT 0",
            "haras_tem_comedouro BOOLEAN DEFAULT 0",
            "haras_qtd_racao FLOAT DEFAULT 0.0",
            "cap_aprisco INTEGER DEFAULT 30",
            "tem_aprisco BOOLEAN DEFAULT 0",
            "aprisco_tem_comedouro BOOLEAN DEFAULT 0",
            "aprisco_qtd_racao FLOAT DEFAULT 0.0"
        ]
        
        for col in colunas:
            try: cursor.execute(f"ALTER TABLE propriedades ADD COLUMN {col}")
            except: pass
                
        conn.commit()
        conn.close()
        print("✅ Haras e Aprisco adicionados ao banco com sucesso!")
    except Exception as e:
        print("⚠️ Ocorreu um erro:", e)

if __name__ == '__main__':
    consertar_banco()
