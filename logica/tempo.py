from flask import Blueprint, request, jsonify, session
from database import db, Jogador
from logica.economia import registrar_transacao

tempo_bp = Blueprint('tempo', __name__)

@tempo_bp.route('/api/avancar_tempo', methods=['POST'])
def avancar_tempo():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    horas_avancar = int(dados.get('horas', 0))
    custo = float(dados.get('custo', 0.0))

    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente para pagar os custos deste período.'})

    # 1. Desconta o custo e registra no Histórico Financeiro
    if custo > 0:
        usuario.saldo -= custo
        registrar_transacao(
            jogador_id=usuario.id,
            tipo='saida',
            valor=custo,
            descricao=f'Despesas de Tempo ({horas_avancar}h)'
        )

    # 2. Matemática do Relógio (Meses de 30 dias padronizados para o jogo)
    usuario.hora += horas_avancar

    dias_adicionais = usuario.hora // 24
    usuario.hora = usuario.hora % 24  # O resto fica como a hora atual
    usuario.dia += dias_adicionais

    while usuario.dia > 30:
        usuario.dia -= 30
        usuario.mes += 1

    while usuario.mes > 12:
        usuario.mes -= 12
        usuario.ano += 1

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'O tempo avançou!'})

@tempo_bp.route('/api/tempo_atual', methods=['GET'])
def tempo_atual():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Não logado'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    return jsonify({
        'sucesso': True,
        'hora': usuario.hora,
        'dia': usuario.dia,
        'mes': usuario.mes,
        'ano': usuario.ano
    })
