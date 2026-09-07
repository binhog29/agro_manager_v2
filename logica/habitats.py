from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Animal
from logica.economia import registrar_transacao

habitats_bp = Blueprint('habitats', __name__)

@habitats_bp.route('/api/pecuaria/habitat/<habitat>', methods=['GET'])
def ver_habitat(habitat):
    if 'usuario' not in session: 
        return jsonify({'animais': [], 'sucesso': False, 'erro': 'Sessão expirada.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    fazenda_id = request.args.get('fazenda_id')
    if not fazenda_id:
        return jsonify({'animais': [], 'sucesso': False, 'erro': 'Fazenda não identificada.'})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda:
        return jsonify({'animais': [], 'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    animais = Animal.query.filter_by(propriedade_id=fazenda.id, onde_esta=habitat).all()
    qtd_atual = len(animais)
    
    tem_comedouro = False
    qtd_racao = 0.0
    capacidade = 0

    if habitat == 'represa':
        tem_comedouro = getattr(fazenda, 'represa_tem_comedouro', False)
        qtd_racao = float(getattr(fazenda, 'represa_qtd_racao', 0.0) or 0.0)
        capacidade = getattr(fazenda, 'cap_represa', 200)
    elif habitat == 'chiqueiro':
        tem_comedouro = getattr(fazenda, 'chiqueiro_tem_comedouro', False)
        qtd_racao = float(getattr(fazenda, 'chiqueiro_qtd_racao', 0.0) or 0.0)
        capacidade = getattr(fazenda, 'cap_chiqueiro', 50)
    elif habitat == 'galinheiro':
        tem_comedouro = getattr(fazenda, 'galinheiro_tem_comedouro', False)
        qtd_racao = float(getattr(fazenda, 'galinheiro_qtd_racao', 0.0) or 0.0)
        capacidade = getattr(fazenda, 'cap_galinheiro', 100)
    elif habitat == 'haras':
        tem_comedouro = getattr(fazenda, 'haras_tem_comedouro', False)
        qtd_racao = float(getattr(fazenda, 'haras_qtd_racao', 0.0) or 0.0)
        capacidade = getattr(fazenda, 'cap_haras', 10)
    elif habitat == 'aprisco':
        tem_comedouro = getattr(fazenda, 'aprisco_tem_comedouro', False)
        qtd_racao = float(getattr(fazenda, 'aprisco_qtd_racao', 0.0) or 0.0)
        capacidade = getattr(fazenda, 'cap_aprisco', 30)
    
    lista = [{
        'id': a.id, 
        'raca': a.raca.capitalize(), 
        'fase': getattr(a, 'fase', 'Adulto'),
        'sexo': getattr(a, 'sexo', 'M'),
        'peso': float(getattr(a, 'peso', 0.0)),
        'saude': float(getattr(a, 'saude', 100.0)),
        'fome': float(getattr(a, 'fome', 0.0)),
        'prenha': getattr(a, 'prenha', False),
        'dias_prenhez': int(getattr(a, 'dias_gestacao', 0))
    } for a in animais]
    
    return jsonify({
        'sucesso': True,
        'animais': lista,
        'tem_comedouro': tem_comedouro,
        'qtd_racao': qtd_racao,
        'qtd_atual': qtd_atual,
        'capacidade': capacidade
    })

@habitats_bp.route('/api/habitat/construir_comedouro', methods=['POST'])
def construir_comedouro_habitat():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    dados = request.get_json()
    habitat = dados.get('habitat')
    fazenda_id = dados.get('fazenda_id')
    
    if not fazenda_id:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não identificada.'})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    custos = {'represa': 800.0, 'chiqueiro': 1000.0, 'galinheiro': 600.0, 'haras': 1500.0, 'aprisco': 900.0}
    if habitat not in custos:
        return jsonify({'sucesso': False, 'erro': 'Habitat inválido.'})
        
    custo = custos[habitat]
    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente (Custo: R$ {custo:,.2f})'})
        
    coluna_tem = f'{habitat}_tem_comedouro'
    if getattr(fazenda, coluna_tem, False):
        return jsonify({'sucesso': False, 'erro': 'Este habitat já possui um comedouro!'})
        
    setattr(fazenda, coluna_tem, True)
    setattr(fazenda, f'{habitat}_qtd_racao', 0.0)
    usuario.saldo -= custo
    
    registrar_transacao(usuario.id, 'saida', custo, f'Construção de Comedouro no(a) {habitat.capitalize()}')
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Comedouro do(a) {habitat.capitalize()} construído com sucesso!'})

@habitats_bp.route('/api/habitat/reabastecer', methods=['POST'])
def reabastecer_comedouro_habitat():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    dados = request.get_json() or {}
    habitat = dados.get('habitat')
    tipo_grao = dados.get('tipo_grao', 'soja')
    fazenda_id = dados.get('fazenda_id')
    
    if not fazenda_id:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não identificada.'})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    try:
        quantidade = int(dados.get('quantidade', 0))
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
    
    if quantidade <= 0:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
        
    if not getattr(fazenda, f'{habitat}_tem_comedouro', False):
        return jsonify({'sucesso': False, 'erro': 'Construa um comedouro neste habitat primeiro!'})
        
    if habitat == 'chiqueiro':
        if tipo_grao == 'milho':
            coluna_estoque, nome_insumo, tipo_local = ('est_milho', 'Milho (Silo)', 'silo')
        else:
            coluna_estoque, nome_insumo, tipo_local = ('est_soja', 'Soja (Silo)', 'silo')
    else:
        mapa_insumo = {
            'represa': ('est_racao_peixe', 'Ração de Peixe', 'armazem'),
            'galinheiro': ('est_milho', 'Milho (Silo)', 'silo'),
            'haras': ('est_racao', 'Ração (Gado)', 'armazem'),
            'aprisco': ('est_racao', 'Ração (Gado)', 'armazem')
        }
        if habitat not in mapa_insumo:
            return jsonify({'sucesso': False, 'erro': 'Habitat desconhecido.'})
        coluna_estoque, nome_insumo, tipo_local = mapa_insumo[habitat]
    
    estoque_atual = int(getattr(fazenda, coluna_estoque, 0) or 0)
    qtd_atual_comedouro = float(getattr(fazenda, f'{habitat}_qtd_racao', 0.0) or 0.0)
    capacidade_maxima = 200.0
    espaco_livre = capacidade_maxima - qtd_atual_comedouro
    
    if espaco_livre <= 0:
        return jsonify({'sucesso': False, 'erro': 'O comedouro está cheio!'})
        
    if quantidade > espaco_livre:
        quantidade = int(espaco_livre)
        
    if estoque_atual < quantidade:
        local_nome = "Armazém" if tipo_local == 'armazem' else "Silo"
        return jsonify({'sucesso': False, 'erro': f'Você não tem {nome_insumo} suficiente no {local_nome}! (Tem: {estoque_atual} un)'})
        
    setattr(fazenda, coluna_estoque, estoque_atual - quantidade)
    setattr(fazenda, f'{habitat}_qtd_racao', qtd_atual_comedouro + float(quantidade))
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 10
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{quantidade} unidades de {nome_insumo} despejadas no comedouro!'})

@habitats_bp.route('/api/habitat/expandir', methods=['POST'])
def expandir_habitat():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    dados = request.get_json()
    fazenda_id = dados.get('fazenda_id')
    habitat = dados.get('habitat')
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.get(fazenda_id)
    
    if not fazenda or fazenda.dono_id != jogador.id: 
        return jsonify({'sucesso': False, 'erro': 'Esta fazenda não é sua.'})
    
    # 🔥 INFLAÇÃO DAS OBRAS: Preços atualizados do Late-Game
    custos_exp = {'represa': 15000, 'chiqueiro': 35000, 'galinheiro': 12000, 'haras': 80000, 'aprisco': 40000}
    inc_exp = {'represa': 100, 'chiqueiro': 50, 'galinheiro': 100, 'haras': 5, 'aprisco': 15}
    
    if habitat not in custos_exp:
        return jsonify({'sucesso': False, 'erro': 'Habitat inválido.'})
        
    custo = custos_exp[habitat]
    incremento = inc_exp[habitat]
    
    if jogador.saldo < custo: 
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente no caixa da fazenda!'})
    
    jogador.saldo -= custo
    
    col_cap = f'cap_{habitat}'
    # 🔥 A CORREÇÃO DO BUG: "or 0" impede que o Python tente somar None + Número
    capacidade_atual = getattr(fazenda, col_cap) or 0
    setattr(fazenda, col_cap, capacidade_atual + incremento)
        
    registrar_transacao(jogador.id, 'saida', custo, f'Engenharia: Expansão do {habitat.capitalize()} (+{incremento} vagas)')    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Capacidade aumentada com sucesso em +{incremento} vagas!'})

# ==========================================
# ROTA PARA ALIMENTAÇÃO MANUAL DOS HABITATS
# ==========================================
@habitats_bp.route('/api/pecuaria/alimentar_habitat', methods=['POST'])
def alimentar_habitat_manual():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    dados = request.get_json()
    habitat = dados.get('habitat')
    fazenda_id = dados.get('fazenda_id')
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    
    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
        
    animais = Animal.query.filter_by(propriedade_id=fazenda.id, onde_esta=habitat).all()
    if not animais:
        return jsonify({'sucesso': False, 'erro': 'Não há animais neste local para alimentar.'})
        
    # Verifica se existe um comedouro construído no local
    tem_comedouro = getattr(fazenda, f'{habitat}_tem_comedouro', False)
    if not tem_comedouro:
        return jsonify({'sucesso': False, 'erro': 'Você precisa construir um depósito de ração/comedouro neste habitat primeiro!'})
        
    # Puxa a ração disponível no cocho
    qtd_racao_cocho = float(getattr(fazenda, f'{habitat}_qtd_racao', 0.0) or 0.0)
    
    if qtd_racao_cocho <= 0:
        return jsonify({'sucesso': False, 'erro': 'O comedouro está vazio! Abasteça-o puxando grãos do Silo ou do Armazém.'})

    # Calcula o consumo (Padrão: 0.10 por animal por clique)
    consumo_total = len(animais) * 0.10
    
    if qtd_racao_cocho < consumo_total:
        return jsonify({'sucesso': False, 'erro': 'A ração no comedouro não é suficiente para todos os animais. Reabasteça!'})
        
    # Desconta a ração do cocho e zera a fome dos animais
    setattr(fazenda, f'{habitat}_qtd_racao', qtd_racao_cocho - consumo_total)
    
    for a in animais:
        a.fome = 0.0
        # Dar comida manualmente dá um pequeno "boost" na saúde
        a.saude = min(100.0, float(a.saude or 100) + 5.0)
        
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Todos os animais do recinto foram alimentados e a fome foi zerada!'})
