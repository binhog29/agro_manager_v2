# logica/constantes.py

INFO_ESPECIES = {
    'bovino_corte': {'racas': ['nelore', 'angus', 'guzera', 'brahman'], 'peso_jovem': 28.0, 'peso_adulto': 650.0, 'gestacao': 280, 'ganho_dia': 1.2, 'dieta': 'pasto'},
    'bovino_leite': {'racas': ['girolando'], 'peso_jovem': 28.0, 'peso_adulto': 580.0, 'gestacao': 280, 'ganho_dia': 1.0, 'dieta': 'pasto'},
    'equino': {'racas': ['cavalo'], 'peso_jovem': 45.0, 'peso_adulto': 450.0, 'gestacao': 340, 'ganho_dia': 1.0, 'dieta': 'pasto'},
    'suino': {'racas': ['porco'], 'peso_jovem': 15.0, 'peso_adulto': 100.0, 'gestacao': 114, 'ganho_dia': 0.5, 'dieta': 'racao'},
    'ovino': {'racas': ['ovelha', 'cabra'], 'peso_jovem': 5.0, 'peso_adulto': 45.0, 'gestacao': 150, 'ganho_dia': 0.15, 'dieta': 'pasto'},
    'ave': {'racas': ['galinha', 'pato', 'peru'], 'peso_jovem': 0.5, 'peso_adulto': 2.5, 'gestacao': 21, 'ganho_dia': 0.05, 'dieta': 'racao'},
    'peixe_gigante': {'racas': ['pirarucu', 'surubim', 'pintado', 'cachara'], 'peso_jovem': 5.0, 'peso_adulto': 45.0, 'gestacao': 0, 'ganho_dia': 0.3, 'dieta': 'racao'},
    'peixe_medio': {'racas': ['tambaqui', 'pacu', 'matrinxa', 'tucunare', 'curimata', 'piau', 'jaraqui'], 'peso_jovem': 0.5, 'peso_adulto': 3.0, 'gestacao': 0, 'ganho_dia': 0.1, 'dieta': 'racao'}
}

CATALOGO_CULTIVOS = {
    # NOME, CUSTO_SEMENTE, PRODUCAO_KG (Balanceada!), TEMPO, PREPARO, MAQUINA_PLANTIO, MAQUINA_COLHEITA
    'soja': Cultura('Soja', 600, 5000, 100, 'arado', 800, 1200),
    'milho': Cultura('Milho', 450, 9000, 90, 'arado', 800, 1100),
    'arroz': Cultura('Arroz', 500, 7000, 110, 'arado', 900, 1300),
    'feijao': Cultura('Feijão', 400, 3000, 80, 'arado', 700, 1000),
    'algodao': Cultura('Algodão', 800, 4500, 150, 'arado', 1200, 1800),
    'mandioca': Cultura('Mandioca', 300, 25000, 240, 'arado', 500, 1500),
    'tomate': Cultura('Tomate', 150, 10000, 90, 'arado', 600, 1200),
    'abacaxi': Cultura('Abacaxi', 350, 30000, 400, 'coveado', 800, 2000),
    'melancia': Cultura('Melancia', 250, 20000, 85, 'coveado', 600, 1400),
    
    # PERENES (Ainda dão muito lucro, mas sem quebrar a economia)
    'cana': CulturaPerene('Cana-de-Açúcar', 1200, 70000, 360, 'arado', 2000, 4000, tempo_descanso=30, max_ciclos=5), 
    'banana': CulturaPerene('Banana', 800, 18000, 300, 'coveado', 1000, 1500, tempo_descanso=15, max_ciclos=8),
    'cacau': CulturaPerene('Cacau', 1500, 2500, 500, 'coveado', 1500, 2000, tempo_descanso=45, max_ciclos=15),
    'acai': CulturaPerene('Açaí', 1000, 8000, 730, 'coveado', 1200, 1800, tempo_descanso=30, max_ciclos=12),
    'cupuacu': CulturaPerene('Cupuaçu', 900, 3500, 730, 'coveado', 1200, 1800, tempo_descanso=30, max_ciclos=10),
    'pimenta': CulturaPerene('Pimenta', 500, 4000, 120, 'coveado', 800, 1200, tempo_descanso=20, max_ciclos=6),
    'cafe': CulturaSazonal('Café Clonal', 1800, 6000, 365, 'coveado', 2000, 3000, tempo_descanso=90, max_ciclos=10, estacoes_fruto=['outono', 'inverno'])
}

TABELA_PRECOS = {
    'nelore': {'filhote': 1000, 'adulto': 2500}, 'angus': {'filhote': 1500, 'adulto': 3500},
    'girolando': {'filhote': 1800, 'adulto': 4180}, 'guzera': {'filhote': 1700, 'adulto': 4000},
    'brahman': {'filhote': 2000, 'adulto': 4500}, 'cavalo': {'filhote': 3500, 'adulto': 8000},
    'porco': {'filhote': 400, 'adulto': 990}, 'ovelha': {'filhote': 450, 'adulto': 1100},
    'cabra': {'filhote': 420, 'adulto': 1050}, 'galinha': {'filhote': 20, 'adulto': 60},
    'pato': {'filhote': 30, 'adulto': 75}, 'peru': {'filhote': 45, 'adulto': 110},
   	'tambaqui': {'filhote': 25, 'adulto': 60}, 'pirarucu': {'filhote': 150, 'adulto': 400},
    'pacu': {'filhote': 20, 'adulto': 55}, 'matrinxa': {'filhote': 30, 'adulto': 80},
    'jaraqui': {'filhote': 15, 'adulto': 35}, 'curimata': {'filhote': 20, 'adulto': 45},
    'surubim': {'filhote': 60, 'adulto': 130}, 'pintado': {'filhote': 70, 'adulto': 150},
    'cachara': {'filhote': 65, 'adulto': 140}, 'tucunare': {'filhote': 40, 'adulto': 95},
    'piau': {'filhote': 20, 'adulto': 45}
}
