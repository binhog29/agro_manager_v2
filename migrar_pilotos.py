import sqlite3

def migrar():
    conexao = sqlite3.connect('banco_dados.db')
    cursor = conexao.cursor()
    
    try:
        cursor.execute("ALTER TABLE equipes ADD COLUMN piloto_drone INTEGER DEFAULT 0;")
        print("Coluna 'piloto_drone' adicionada com sucesso!")
    except sqlite3.OperationalError:
        print("A coluna 'piloto_drone' já existe.")
        
    try:
        cursor.execute("ALTER TABLE equipes ADD COLUMN piloto_aviao INTEGER DEFAULT 0;")
        print("Coluna 'piloto_aviao' adicionada com sucesso!")
    except sqlite3.OperationalError:
        print("A coluna 'piloto_aviao' já existe.")
        
    conexao.commit()
    conexao.close()
    print("Migração concluída!")

if __name__ == '__main__':
    migrar()
