from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade
from logica.economia import registrar_transacao

infra_bp = Blueprint('infra', __name__)

@infra_bp.route('/api/fazenda/construir', methods=['POST'])
def construir_estrutura():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    tipo = dados.get('tipo') 
    fazenda_id = dados.get('fazenda_id')
    
    TABELA_CUSTOS = {
        'represa': 12000.0,
        'chiqueiro': 8000.0,
        'galinheiro': 5000.0,
        'haras': 15000.0,      # 🔥 NOVO
        'aprisco': 10000.0     # 🔥 NOVO
    }
    
    if tipo not in TABELA_CUSTOS:
        return jsonify({'sucesso': False, 'erro': 'Tipo de construção inválido.'})
        
    custo = TABELA_CUSTOS[tipo]
    
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda:
        fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first() 
    
    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente para a obra.'})
        
    # Trata o nome da coluna da represa ou dos novos habitats
    if tipo == 'represa':
        coluna_bd = 'tem_represa_geral'
    else:
        coluna_bd = f'tem_{tipo}'
    
    if getattr(fazenda, coluna_bd, False):
        return jsonify({'sucesso': False, 'erro': f'Você já construiu este {tipo.capitalize()}!'})
        
    setattr(fazenda, coluna_bd, True)
    usuario.saldo -= custo
    
    registrar_transacao(usuario.id, 'saida', custo, f'Engenharia: Construção de {tipo.capitalize()}')
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 20
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Construção do {tipo.capitalize()} concluída!'})

@infra_bp.route('/api/fazenda/expandir_curral', methods=['POST'])
def expandir_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    dados = request.get_json() or {}
    fazenda_id = dados.get('fazenda_id')
    pacote = dados.get('pacote', 'pequeno') # Descobre qual o pacote escolhido
    
    # 🔥 TABELA DE PACOTES DE OBRAS DO CURRAL
    PACOTES_OBRA_CURRAL = {
        'pequeno': {'custo': 6000.0, 'capacidade': 5},
        'medio': {'custo': 55000.0, 'capacidade': 50},
        'grande': {'custo': 250000.0, 'capacidade': 250},
        'gigante': {'custo': 900000.0, 'capacidade': 1000}
    }

    if pacote not in PACOTES_OBRA_CURRAL:
        return jsonify({'sucesso': False, 'erro': 'Pacote de obra inválido.'})

    custo_expansao = PACOTES_OBRA_CURRAL[pacote]['custo']
    aumento_capacidade = PACOTES_OBRA_CURRAL[pacote]['capacidade']

    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    if jogador.saldo < custo_expansao: 
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. O projeto custa R$ {custo_expansao:,.2f}.'})
    
    jogador.saldo -= custo_expansao
    fazenda.cap_curral = getattr(fazenda, 'cap_curral', 10) + aumento_capacidade
    
    registrar_transacao(jogador.id, 'saida', custo_expansao, f'Engenharia: Expansão do Tronco/Curral (+{aumento_capacidade} vagas)')
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 15
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Obras concluídas! Curral expandido em +{aumento_capacidade} vagas.'})
