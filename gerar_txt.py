import os

# Arquivo final que será gerado
arquivo_saida = 'codigo_completo.txt'

# Extensões que queremos ler
extensoes_permitidas = ('.py', '.js', '.html')

# Pastas para ignorar
pastas_ignoradas = ['venv', '__pycache__', '.git', 'node_modules', 'img']

with open(arquivo_saida, 'w', encoding='utf-8') as outfile:
    for root, dirs, files in os.walk('.'):
        # Ignora as pastas indesejadas
        dirs[:] = [d for d in dirs if d not in pastas_ignoradas]
        
        for file in files:
            if file.endswith(extensoes_permitidas) and file != 'gerar_txt.py':
                caminho_completo = os.path.join(root, file)
                
                outfile.write(f"\n\n{'='*60}\n")
                outfile.write(f"ARQUIVO: {caminho_completo}\n")
                outfile.write(f"{'='*60}\n\n")
                
                try:
                    with open(caminho_completo, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"# Erro ao ler este arquivo: {e}\n")

print(f"Pronto! Arquivo '{arquivo_saida}' gerado com sucesso.")
