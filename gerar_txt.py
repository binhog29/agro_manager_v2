import os

# Ficheiro onde tudo será guardado
NOME_FICHEIRO_SAIDA = "codigo_completo.txt"

# Extensões que nos interessam (ignora imagens, sqlite, etc.)
EXTENSOES_PERMITIDAS = ['.py', '.html', '.css', '.js']

# Pastas a ignorar para não poluir o txt com bibliotecas e ficheiros de sistema
PASTAS_IGNORADAS = ['.git', '__pycache__', 'venv', 'env', 'node_modules', 'instance', 'static/imagens']

def gerar_dump_projeto():
    with open(NOME_FICHEIRO_SAIDA, 'w', encoding='utf-8') as ficheiro_saida:
        for raiz, diretorios, arquivos in os.walk('.'):
            # Remove as pastas ignoradas da pesquisa
            diretorios[:] = [d for d in diretorios if d not in PASTAS_IGNORADAS]

            for arquivo in arquivos:
                # Ignora o próprio script de geração e ficheiros indesejados
                if arquivo == NOME_FICHEIRO_SAIDA or arquivo == "gerar_txt.py":
                    continue

                if any(arquivo.endswith(ext) for ext in EXTENSOES_PERMITIDAS):
                    caminho_completo = os.path.join(raiz, arquivo)
                    try:
                        with open(caminho_completo, 'r', encoding='utf-8') as ficheiro_leitura:
                            conteudo = ficheiro_leitura.read()
                            
                            # Cria um cabeçalho claro para cada ficheiro
                            ficheiro_saida.write(f"\n{'='*60}\n")
                            ficheiro_saida.write(f"FICHEIRO: {caminho_completo}\n")
                            ficheiro_saida.write(f"{'='*60}\n\n")
                            ficheiro_saida.write(conteudo)
                            ficheiro_saida.write("\n\n")
                    except Exception as e:
                        ficheiro_saida.write(f"\n[ERRO AO LER FICHEIRO: {caminho_completo} - {e}]\n")
                        
    print(f"Feito! O ficheiro '{NOME_FICHEIRO_SAIDA}' foi gerado na tua pasta principal.")

if __name__ == '__main__':
    gerar_dump_projeto()
