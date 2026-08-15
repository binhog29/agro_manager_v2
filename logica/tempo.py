from flask import Blueprint, request, jsonify, session
from database import db, Jogador
from logica.economia import registrar_transacao

# 1. NOVO IMPORT: Puxando o motor da pasta logica
from logica.motor_biologico import MotorBiologico 

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

    # 2. Matemática do Relógio (Meses de 30 dias padronizados)
    usuario.hora += horas_avancar

    dias_adicionais = usuario.hora // 24
    usuario.hora = usuario.hora % 24  
    usuario.dia += dias_adicionais

    while usuario.dia > 30:
        usuario.dia -= 30
        usuario.mes += 1

    while usuario.mes > 12:
        usuario.mes -= 12
        usuario.ano += 1

    # ==========================================================
    # 3. A MÁGICA DA OOP: ACIONANDO O MOTOR BIOLÓGICO
    # ==========================================================
    avisos_motor = []
    if horas_avancar > 0:
        # Instancia o motor, processa o turno e captura os avisos (mortes, nascimentos, etc.)
        motor = MotorBiologico()
        avisos_motor = motor.processar_turno(horas_avancar)

    db.session.commit()
    
    # Retorna o sucesso junto com os avisos gerados pelo motor biológico
    return jsonify({
        'sucesso': True, 
        'msg': 'O tempo avançou e a natureza seguiu seu curso!',
        'avisos': avisos_motor
    })

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
