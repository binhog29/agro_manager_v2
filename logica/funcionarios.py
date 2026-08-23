from flask import Blueprint, request, jsonify, session
from database import db, Jogador, Propriedade, Equipe
from logica.economia import registrar_transacao

funcionarios_bp = Blueprint('funcionarios', __name__)

# ==========================================
# MOTOR ORIENTADO A OBJETOS (OOP) PARA O RH
# ==========================================
class Cargo:
    def __init__(self, id_cargo, nome, custo, salario_hora, beneficio):
        self.id_cargo = id_cargo
        self.nome = nome
        self.custo = custo
        self.salario_hora = salario_hora
        self.beneficio = beneficio

class GerenciadorRH:
    """Catálogo central de profissões da fazenda. Adicione novos aqui facilmente!"""
    CATALOGO = {
        'peoes': Cargo('peoes', 'Peão', 1000.0, 25.0, 'Proteção animal básica'),
        'tratoristas': Cargo('tratoristas', 'Tratorista', 2500.0, 45.0, '+15% Colheita'),
        'capatazes': Cargo('capatazes', 'Capataz', 10000.0, 150.0, '+10% Preço de Venda'),
        'veterinarios': Cargo('veterinarios', 'Veterinário', 8000.0, 120.0, 'Reduz doenças no rebanho'),
        'agronomos': Cargo('agronomos', 'Agrônomo', 9000.0, 130.0, '-20% Tempo de Safra')
    }

    @classmethod
    def obter_cargo(cls, id_cargo):
        return cls.CATALOGO.get(id_cargo)

    @classmethod
    def calcular_folha(cls, equipe, horas):
        """Calcula o salário de forma dinâmica para todos os cargos existentes"""
        total = 0
        for id_cargo, cargo_obj in cls.CATALOGO.items():
            # getattr busca a quantidade daquele funcionário no banco automaticamente
            quantidade = getattr(equipe, id_cargo, 0)
            total += quantidade * cargo_obj.salario_hora * horas
        return total

# ==========================================
# ROTAS E AÇÕES
# ==========================================
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
        return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada ou não pertence a você.'})

    if usuario.saldo < cargo_obj.custo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custo: R$ {cargo_obj.custo:,.2f}'})

    equipe = Equipe.query.filter_by(propriedade_id=propriedade.id).first()
    if not equipe:
        equipe = Equipe(propriedade_id=propriedade.id)
        db.session.add(equipe)

    # 🚀 MAGIA DO OOP: Pega o valor, e se o banco retornar Vazio (None), assume 0
    qtd_atual = getattr(equipe, id_cargo, 0)
    if qtd_atual is None:
        qtd_atual = 0
        
    setattr(equipe, id_cargo, qtd_atual + 1)

    usuario.saldo -= cargo_obj.custo
    registrar_transacao(usuario.id, 'saida', cargo_obj.custo, f'Contratação de {cargo_obj.nome}')

    # 🔥 Trava de Segurança e Ganho de XP pela Contratação
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 50

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{cargo_obj.nome} contratado com sucesso para {propriedade.nome}!'})

def cobrar_folha_pagamento(jogador, horas_passadas):
    """Usado pelo motor de tempo para descontar os salários"""
    if horas_passadas <= 0:
        return 0

    custo_total = 0
    propriedades = Propriedade.query.filter_by(dono_id=jogador.id).all()
    
    for prop in propriedades:
        equipe = Equipe.query.filter_by(propriedade_id=prop.id).first()
        if equipe:
            custo_total += GerenciadorRH.calcular_folha(equipe, horas_passadas)

    if custo_total > 0:
        jogador.saldo -= custo_total
        registrar_transacao(jogador.id, 'saida', custo_total, f'Folha de Pagamento ({horas_passadas}h)')
        db.session.commit()
        
    return custo_total

def obter_bonus_equipe(propriedade_id):
    """Retorna os multiplicadores ativos baseados em quem está contratado"""
    equipe = Equipe.query.filter_by(propriedade_id=propriedade_id).first()
    if not equipe:
        return {'bonus_colheita': 1.0, 'protecao_animal': False, 'bonus_venda': 1.0, 'reduz_doencas': False, 'acelera_safra': 1.0}

    return {
        'bonus_colheita': 1.0 + (getattr(equipe, 'tratoristas', 0) * 0.15),
        'protecao_animal': getattr(equipe, 'peoes', 0) > 0,
        'bonus_venda': 1.0 + (getattr(equipe, 'capatazes', 0) * 0.10),
        'reduz_doencas': getattr(equipe, 'veterinarios', 0) > 0,
        'acelera_safra': max(0.5, 1.0 - (getattr(equipe, 'agronomos', 0) * 0.20)) # Máximo de 50% de redução
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
    
    # Se não tem equipe, retorna tudo zerado
    if not equipe:
        return jsonify({'sucesso': True, 'equipe': {
            'peoes': 0, 'tratoristas': 0, 'capatazes': 0, 'veterinarios': 0, 'agronomos': 0
        }})
        
    # Se tem equipe, devolve a quantidade de cada um
    return jsonify({'sucesso': True, 'equipe': {
        'peoes': getattr(equipe, 'peoes', 0),
        'tratoristas': getattr(equipe, 'tratoristas', 0),
        'capatazes': getattr(equipe, 'capatazes', 0),
        'veterinarios': getattr(equipe, 'veterinarios', 0),
        'agronomos': getattr(equipe, 'agronomos', 0),
    }})
