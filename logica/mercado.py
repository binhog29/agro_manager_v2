from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Anuncio, Propriedade, Animal, TABELA_PRECOS, INFO_ESPECIES
from logica.economia import registrar_transacao
import random

mercado_bp = Blueprint('mercado', __name__)

PRECOS_REAIS = {
    'bovino_corte': 250.0,  # R$ 250,00 por Arroba (@)
    'bovino_leite': 210.0,  # R$ 210,00 por Arroba (@)
    'equino': 150.0,        # R$ 150,00 por Arroba (@)
    'suino': 12.0,          # R$ 12,00 por Kg
    'ave': 8.0,             # R$ 8,00 por Kg
    'peixe': 15.0,          # R$ 15,00 por Kg
    'ovino': 20.0           # R$ 20,00 por Kg
}

def calcular_fator_dia(dia, mes, ano):
    semente = ano * 10000 + mes * 100 + dia
    rng = random.Random(semente)
    return round(rng.uniform(0.85, 1.15), 2)

@mercado_bp.route('/api/mercado/precos')
def get_precos():
    usuario = Jogador.query.filter_by(username=session.get('usuario')).first()
    fator = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano) if usuario else 1.0
    
    precos_dinamicos = {}
    for raca, info in TABELA_PRECOS.items():
        raca_lower = raca.lower()
        familia = 'bovino_corte'
        peso_adulto_kg = 390.0
        peso_filhote_kg = 90.0
        
        for f, d in INFO_ESPECIES.items():
            if raca_lower in [r.lower() for r in d.get('racas', [])]:
                familia = f
                peso_adulto_kg = float(d.get('peso_adulto', 390.0))
                peso_filhote_kg = float(d.get('peso_jovem', 90.0))
                break
                
        preco_base = PRECOS_REAIS.get(familia, 200.0) * fator
        
        if familia in ['bovino_corte', 'bovino_leite', 'equino']:
            peso_formatado_adulto = round(peso_adulto_kg / 15.0, 1)
            peso_formatado_filhote = round(peso_filhote_kg / 15.0, 1)
            valor_adulto = (peso_formatado_adulto * preco_base) * 1.10
            unidade = '@'
        else:
            peso_formatado_adulto = peso_adulto_kg
            peso_formatado_filhote = peso_filhote_kg
            valor_adulto = (peso_adulto_kg * preco_base) * 1.10
            unidade = 'Kg'

        valor_filhote = (info.get('filhote', 1100) * fator) * 1.10
        
        precos_dinamicos[raca] = {
            'filhote': int(valor_filhote),
            'adulto': int(valor_adulto),
            'peso_filhote': peso_formatado_filhote,
            'peso_adulto': peso_formatado_adulto,
            'unidade': unidade
        }
        
    return jsonify(precos_dinamicos)

@mercado_bp.route('/mercado')
def ver_mercado():
    if 'usuario' not in session: return redirect(url_for('login'))
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario: return redirect(url_for('login'))

    minhas_terras = Propriedade.query.filter_by(dono_id=usuario.id).all()
    anuncios = Anuncio.query.all()
    
    fator_mercado = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    vendedores_ia = []
    
    for raca, info in TABELA_PRECOS.items():
        raca_lower = raca.lower()
        familia_animal = 'bovino_corte'
        peso_adulto_kg = 390.0
        
        for f, d in INFO_ESPECIES.items():
            if raca_lower in [r.lower() for r in d.get('racas', [])]:
                familia_animal = f
                peso_adulto_kg = float(d.get('peso_adulto', 390.0))
                break
        
        preco_base = PRECOS_REAIS.get(familia_animal, 200.0) * fator_mercado
        
        if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
            peso_arrobas = peso_adulto_kg / 15.0
            valor_adulto_justo = (peso_arrobas * preco_base) * 1.10
            info_peso_texto = f"{peso_arrobas:.1f} @"
        else:
            valor_adulto_justo = (peso_adulto_kg * preco_base) * 1.10
            info_peso_texto = f"{peso_adulto_kg:.0f} Kg"
        
        vendedores_ia.append({
            'id_ia': raca, 
            'valor': int(valor_adulto_justo),
            'peso_texto': info_peso_texto
        })
        
    return render_template('mercado.html', 
                           anuncios=anuncios, 
                           anuncios_ia=vendedores_ia,
                           TABELA_PRECOS=TABELA_PRECOS,
                           minhas_terras=minhas_terras,
                           user=usuario)

@mercado_bp.route('/api/mercado/comprar_ia', methods=['POST'])
def comprar_ia():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    raca = dados.get('raca')
    fase = dados.get('fase', 'adulto').lower()
    sexo = dados.get('sexo')
    raca_lower = raca.lower() if raca else ''
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        if quantidade <= 0: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
        
    destino_id = dados.get('destino_id')

    LIMITE_ADULTO = 20
    LIMITE_FILHOTE = 40
    FRETE_POR_CABECA = 50.0

    espaco_necessario = (quantidade * 0.5) if fase == 'filhote' else (quantidade * 1.0)
    capacidade_caminhao = LIMITE_FILHOTE if fase == 'filhote' else LIMITE_ADULTO

    if espaco_necessario > capacidade_caminhao:
        return jsonify({'sucesso': False, 'erro': f'Caminhão não suporta essa quantidade.'})

    if raca not in TABELA_PRECOS: return jsonify({'sucesso': False, 'erro': 'Raça inválida.'})
        
    propriedade = Propriedade.query.get(destino_id)
    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Destino inválido.'})

    peso_adulto_kg = 390.0
    peso_jovem_kg = 90.0
    familia_animal = 'bovino_corte'
    
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_lower in [r.lower() for r in dados_esp.get('racas', [])]:
            peso_adulto_kg = float(dados_esp.get('peso_adulto', 390.0))
            peso_jovem_kg = float(dados_esp.get('peso_jovem', 90.0))
            familia_animal = familia
            break

    # 🔥 CORREÇÃO: O Roteador subiu! Agora sabemos o "habitat" antes de calcular o frete!
    if familia_animal == 'ave' or any(t in raca_lower for t in ['galinha', 'pato', 'peru', 'ave']):
        habitat = 'galinheiro'
        if not getattr(propriedade, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro!'})
    elif familia_animal == 'suino' or any(t in raca_lower for t in ['porco', 'leitao', 'javali', 'suino']):
        habitat = 'chiqueiro'
        if not getattr(propriedade, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro!'})
    elif 'peixe' in familia_animal or any(t in raca_lower for t in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau', 'peixe']):
        habitat = 'represa'
        if not getattr(propriedade, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': 'Construa uma Represa!'})
    else:
        habitat = 'curral' 
        
    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais + quantidade > limite: return jsonify({'sucesso': False, 'erro': 'Tronco lotado!'})

    fator_mercado = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    
    if fase == 'filhote':
        preco_base_filhote = TABELA_PRECOS.get(raca_lower, {}).get('filhote', 1100)
        preco_unitario = (preco_base_filhote * fator_mercado) * 1.10 
        peso_animal = peso_jovem_kg
    else:
        preco_base = PRECOS_REAIS.get(familia_animal, 200.0) * fator_mercado
        if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
            preco_unitario = ((peso_adulto_kg / 15.0) * preco_base) * 1.10
        else:
            preco_unitario = (peso_adulto_kg * preco_base) * 1.10
        peso_animal = peso_adulto_kg

    # 🔥 CORREÇÃO: Alinhamento correto e cálculo inteligente do Caminhão
    usa_caminhao = dados.get('usa_caminhao', False)
    
    if usa_caminhao:
        modelo_necessario = 'Caminhão Baú (Frios)' if habitat == 'represa' else 'Caminhão Boiadeiro'
        # Importação segura e local para não gerar ciclo
        from database import Maquinario
        tem_caminhao = Maquinario.query.filter_by(propriedade_id=propriedade.id, modelo=modelo_necessario).first()
        
        if not tem_caminhao:
            return jsonify({'sucesso': False, 'erro': f'Fraude detectada: Sem {modelo_necessario} na fazenda!'})
        custo_frete = 0.0
    else:
        custo_frete = quantidade * FRETE_POR_CABECA

    custo_gado = preco_unitario * quantidade
    custo_total = custo_gado + custo_frete

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Custa R$ {custo_total:,.2f}'})

    usuario.saldo -= custo_total
    
    texto_frete = " (Frete Grátis)" if usa_caminhao else " + Frete"
    registrar_transacao(usuario.id, 'saida', custo_total, f'Compra de {quantidade}x {raca.capitalize()}{texto_frete}')

    animais_para_adicionar = []
    for _ in range(quantidade):
        novo = Animal(propriedade_id=propriedade.id, raca=raca, fase=fase.capitalize(), sexo=sexo, peso=peso_animal, onde_esta=habitat, origem='Mercado Oficial')
        animais_para_adicionar.append(novo)

    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
        
    usuario.xp += 10
    
    db.session.add_all(animais_para_adicionar)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Entrega realizada! Animais no {habitat.capitalize()}'})
