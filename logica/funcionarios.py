from flask import Blueprint, request, jsonify, session
from database import db, Jogador, Propriedade, Equipe
from logica.economia import registrar_transacao

funcionarios_bp = Blueprint('funcionarios', __name__)

class Cargo:
    def __init__(self, id_cargo, nome, custo, salario_hora, beneficio):
        self.id_cargo = id_cargo
        self.nome = nome
        self.custo = custo
        self.salario_hora = salario_hora
        self.beneficio = beneficio

class GerenciadorRH:
    """Catálogo central de profissões da fazenda."""
    CATALOGO = {
        'peoes': Cargo('peoes', 'Peão', 500.0, 4.0, 'Proteção animal básica'),
        'tratoristas': Cargo('tratoristas', 'Tratorista', 1200.0, 7.0, '+15% Colheita (Máx 5)'),
                'capatazes': Cargo('capatazes', 'Capataz', 8000.0, 50.0, '+2% Venda (Máx 5)'),
        'veterinarios': Cargo('veterinarios', 'Veterinário', 3000.0, 18.0, 'Reduz doenças'),
        'agronomos': Cargo('agronomos', 'Agrônomo', 3500.0, 22.0, '-20% Safra (Máx 2)')
    }

    @classmethod
    def obter_cargo(cls, id_cargo):
        return cls.CATALOGO.get(id_cargo)

    @classmethod
    def calcular_folha(cls, equipe, horas):
        total = 0
        for id_cargo, cargo_obj in cls.CATALOGO.items():
            quantidade = getattr(equipe, id_cargo, 0)
            total += quantidade * cargo_obj.salario_hora * horas
        return total

@funcionarios_bp.route('/api/rh/contratar', methods=['POST'])
def contratar_funcionario():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Não logado'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    propriedade_id = dados.get('propriedade_id')
    id_cargo = dados.get('cargo')
    
    cargo_obj = GerenciadorRH.obter_cargo(id_cargo)
    if not cargo_obj:
        return jsonify({'sucesso': False, 'erro': 'Cargo inválido.'})

    propriedade = Propriedade.query.filter_by(id=propriedade_id, dono_id=usuario.id).first()
    if not propriedade:
        return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada.'})

    if usuario.saldo < cargo_obj.custo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custo: R$ {cargo_obj.custo:,.2f}'})

    equipe = Equipe.query.filter_by(propriedade_id=propriedade.id).first()
    if not equipe:
        equipe = Equipe(propriedade_id=propriedade.id)
        db.session.add(equipe)

    qtd_atual = getattr(equipe, id_cargo, 0)
    if qtd_atual is None:
        qtd_atual = 0
        
    limite_maximo = 2 if id_cargo == 'agronomos' else 5
    if qtd_atual >= limite_maximo:
        return jsonify({'sucesso': False, 'erro': f'Alojamento lotado! O limite é de {limite_maximo} {cargo_obj.nome}(s) por fazenda.'})
        
    setattr(equipe, id_cargo, qtd_atual + 1)

    usuario.saldo -= cargo_obj.custo
    registrar_transacao(usuario.id, 'saida', cargo_obj.custo, f'Contratação de {cargo_obj.nome}')

    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 50

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{cargo_obj.nome} contratado com sucesso!'})

def cobrar_folha_pagamento(jogador, horas_passadas):
    if horas_passadas <= 0:
        return 0

    custo_total = 0
    propriedades = Propriedade.query.filter_by(dono_id=jogador.id).all()
    
    for prop in propriedades:
        equipe = Equipe.query.filter_by(propriedade_id=prop.id).first()
        if equipe:
            custo_total += GerenciadorRH.calcular_folha(equipe, horas_passadas)

    if custo_total > 0:
        # 🔥 BLINDAGEM: Impede a conta de cair em dívida impagável (Softlock)
        valor_cobrado = custo_total if jogador.saldo >= custo_total else jogador.saldo
        jogador.saldo -= valor_cobrado
        
        if valor_cobrado > 0:
            registrar_transacao(jogador.id, 'saida', valor_cobrado, f'Folha de Pagamento ({horas_passadas}h)')
            db.session.commit()
        
    return custo_total

def obter_bonus_equipe(propriedade_id):
    equipe = Equipe.query.filter_by(propriedade_id=propriedade_id).first()
    if not equipe:
        return {'bonus_colheita': 1.0, 'protecao_animal': False, 'bonus_venda': 1.0, 'reduz_doencas': False, 'acelera_safra': 1.0}

    bonus_trator = min(0.75, getattr(equipe, 'tratoristas', 0) * 0.15) 
    bonus_venda = min(0.10, getattr(equipe, 'capatazes', 0) * 0.02)    

    return {
        'bonus_colheita': 1.0 + bonus_trator,
        'protecao_animal': getattr(equipe, 'peoes', 0) > 0,
        'bonus_venda': 1.0 + bonus_venda,
        'reduz_doencas': getattr(equipe, 'veterinarios', 0) > 0,
        'acelera_safra': max(0.5, 1.0 - (getattr(equipe, 'agronomos', 0) * 0.20))
    }

@funcionarios_bp.route('/api/rh/listar/<int:propriedade_id>', methods=['GET'])
def listar_equipe(propriedade_id):
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Não logado'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    propriedade = Propriedade.query.filter_by(id=propriedade_id, dono_id=usuario.id).first()
    
    if not propriedade:
        return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada.'})
        
    equipe = Equipe.query.filter_by(propriedade_id=propriedade.id).first()
    
    if not equipe:
        return jsonify({'sucesso': True, 'equipe': {
            'peoes': 0, 'tratoristas': 0, 'capatazes': 0, 'veterinarios': 0, 'agronomos': 0
        }})
        
    return jsonify({'sucesso': True, 'equipe': {
        'peoes': getattr(equipe, 'peoes', 0),
        'tratoristas': getattr(equipe, 'tratoristas', 0),
        'capatazes': getattr(equipe, 'capatazes', 0),
        'veterinarios': getattr(equipe, 'veterinarios', 0),
        'agronomos': getattr(equipe, 'agronomos', 0),
    }})

@funcionarios_bp.route('/api/rh/demitir', methods=['POST'])
def demitir_funcionario():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Não logado'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    propriedade_id = dados.get('propriedade_id')
    id_cargo = dados.get('cargo')
    
    cargo_obj = GerenciadorRH.obter_cargo(id_cargo)
    if not cargo_obj:
        return jsonify({'sucesso': False, 'erro': 'Cargo inválido.'})

    propriedade = Propriedade.query.filter_by(id=propriedade_id, dono_id=usuario.id).first()
    if not propriedade:
        return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada.'})

    equipe = Equipe.query.filter_by(propriedade_id=propriedade.id).first()
    if not equipe:
        return jsonify({'sucesso': False, 'erro': 'Você não tem funcionários aqui.'})

    qtd_atual = getattr(equipe, id_cargo, 0)
    if qtd_atual <= 0:
        return jsonify({'sucesso': False, 'erro': f'Você não tem nenhum {cargo_obj.nome} para demitir.'})
        
    setattr(equipe, id_cargo, qtd_atual - 1)

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Um {cargo_obj.nome} foi demitido! Menos R$ {cargo_obj.salario_hora}/h na sua folha.'})
