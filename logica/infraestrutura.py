from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade
from logica.economia import registrar_transacao

infra_bp = Blueprint('infra', __name__)

# Mova para cá as funções:
# @infra_bp.route('/api/fazenda/construir', ...)
# @infra_bp.route('/api/fazenda/expandir_curral', ...)

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
    custo = float(dados.get('custo', 0))
    fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    
    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente para a obra.'})
        
    coluna_bd = 'tem_represa_geral' if tipo == 'represa' else f'tem_{tipo}'
    
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
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    
    if jogador.saldo < 6000: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
    
    jogador.saldo -= 6000
    fazenda.cap_curral = getattr(fazenda, 'cap_curral', 10) + 5
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Curral expandido!'})
