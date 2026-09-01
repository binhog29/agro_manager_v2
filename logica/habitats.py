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

    lista = [{
        'id': a.id, 
        'raca': a.raca.capitalize(), 
        'fase': getattr(a, 'fase', 'Adulto'),
        'sexo': getattr(a, 'sexo', 'M'),
        'peso': float(getattr(a, 'peso', 0.0)),
        'saude': float(getattr(a, 'saude', 100.0)),
        'fome': float(getattr(a, 'fome', 0.0))
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
    
    # 🔥 BLINDADO
    if not fazenda_id:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não identificada.'})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    custos = {'represa': 800.0, 'chiqueiro': 1000.0, 'galinheiro': 600.0}
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
    
    # 🔥 BLINDADO
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
            'galinheiro': ('est_milho', 'Milho (Silo)', 'silo')
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
