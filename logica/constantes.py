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

# 🔥 ATUALIZADO: Tempos de colheita mais dinâmicos e balanceados!
INFO_CULTIVOS = {
    'feijao':   {'dias_semente': 3,  'dias_broto': 8,   'dias_colheita': 20,   'agua_necessaria': 30},
    'melancia': {'dias_semente': 3,  'dias_broto': 10,  'dias_colheita': 25,   'agua_necessaria': 30},
    'milho':    {'dias_semente': 4,  'dias_broto': 10,  'dias_colheita': 25,   'agua_necessaria': 40},
    'soja':     {'dias_semente': 5,  'dias_broto': 12,  'dias_colheita': 30,   'agua_necessaria': 50},
    'arroz':    {'dias_semente': 5,  'dias_broto': 15,  'dias_colheita': 35,   'agua_necessaria': 80},
    'pimenta':  {'dias_semente': 5,  'dias_broto': 15,  'dias_colheita': 40,   'agua_necessaria': 40},
    'algodao':  {'dias_semente': 6,  'dias_broto': 20,  'dias_colheita': 45,   'agua_necessaria': 60},
    'mandioca': {'dias_semente': 8,  'dias_broto': 25,  'dias_colheita': 60,   'agua_necessaria': 20},
    'banana':   {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 80,   'agua_necessaria': 50},
    'cana':     {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 90,   'agua_necessaria': 50},
    'cafe':     {'dias_semente': 15, 'dias_broto': 45,  'dias_colheita': 120,  'agua_necessaria': 40},
    'cupuacu':  {'dias_semente': 20, 'dias_broto': 60,  'dias_colheita': 150,  'agua_necessaria': 60},
    'cacau':    {'dias_semente': 20, 'dias_broto': 60,  'dias_colheita': 150,  'agua_necessaria': 60},
    'acai':     {'dias_semente': 25, 'dias_broto': 70,  'dias_colheita': 180,  'agua_necessaria': 70},
    'tomate':   {'dias_semente': 3,  'dias_broto': 10,  'dias_colheita': 25,   'agua_necessaria': 40}
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
