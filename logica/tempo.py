from flask import Blueprint, request, jsonify, session
from database import db, Jogador
from logica.economia import registrar_transacao
from logica.motor_biologico import MotorBiologico
from datetime import datetime
import random

tempo_bp = Blueprint('tempo', __name__)

class GerenciadorTempo:
    MINUTOS_POR_HORA_JOGO = 1.0

    ESTACOES = {
        1: 'verao', 2: 'verao', 3: 'verao',             
        4: 'outono', 5: 'outono', 6: 'outono',          
        7: 'inverno', 8: 'inverno', 9: 'inverno',       
        10: 'primavera', 11: 'primavera', 12: 'primavera' 
    }

    @classmethod
    def calcular_progresso_offline(cls, jogador):
        agora = datetime.utcnow()
        if not jogador.ultima_acao:
            jogador.ultima_acao = agora
            db.session.commit()
            return 0

        delta = agora - jogador.ultima_acao
        minutos_passados = delta.total_seconds() / 60.0

        if minutos_passados < cls.MINUTOS_POR_HORA_JOGO:
            return 0 

        horas_jogo_passadas = int(minutos_passados // cls.MINUTOS_POR_HORA_JOGO)

        if horas_jogo_passadas > 0:
            cls.avancar_tempo(jogador, horas_jogo_passadas)
            jogador.ultima_acao = agora
            db.session.commit()

        return horas_jogo_passadas

    @classmethod
    def avancar_tempo(cls, jogador, horas):
        jogador.hora += horas

        dias_passados = jogador.hora // 24
        jogador.hora = jogador.hora % 24

        if dias_passados > 0:
            jogador.dia += dias_passados
            meses_passados = jogador.dia // 30
            jogador.dia = (jogador.dia % 30)
            if jogador.dia == 0: jogador.dia = 1

            if meses_passados > 0:
                jogador.mes += meses_passados
                anos_passados = jogador.mes // 12
                jogador.mes = (jogador.mes % 12)
                if jogador.mes == 0: jogador.mes = 1

                if anos_passados > 0:
                    jogador.ano += anos_passados

        cls._atualizar_clima_e_estacao(jogador)

        # 🔒 ENVIANDO O JOGADOR PARA O MOTOR BIOLÓGICO PROCESSAR APENAS AS TERRAS DELE
        motor = MotorBiologico(clima_atual=getattr(jogador, 'clima_atual', 'sol'), jogador=jogador)
        avisos = motor.processar_turno(horas)
        return avisos

    @classmethod
    def _atualizar_clima_e_estacao(cls, jogador):
        jogador.estacao_atual = cls.ESTACOES.get(jogador.mes, 'primavera')

        chances_chuva = {
            'verao': 0.70,      
            'outono': 0.40,     
            'inverno': 0.05,    
            'primavera': 0.30   
        }

        if random.random() < chances_chuva.get(jogador.estacao_atual, 0.30):
            jogador.clima_atual = 'chuva'
        else:
            jogador.clima_atual = 'sol'

@tempo_bp.route('/api/avancar_tempo', methods=['POST'])
def avancar_tempo_manual():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    horas_avancar = int(dados.get('horas', 0))
    custo = float(dados.get('custo', 0.0))

    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente para pagar os custos deste período.'})

    if custo > 0:
        usuario.saldo -= custo
        registrar_transacao(
            jogador_id=usuario.id,
            tipo='saida',
            valor=custo,
            descricao=f'Despesas de Tempo ({horas_avancar}h)'
        )

    avisos_motor = []
    if horas_avancar > 0:
        avisos_motor = GerenciadorTempo.avancar_tempo(usuario, horas_avancar)
        usuario.ultima_acao = datetime.utcnow()

    db.session.commit()
    
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
        'ano': usuario.ano,
        'clima': getattr(usuario, 'clima_atual', 'sol'),
        'estacao': getattr(usuario, 'estacao_atual', 'primavera')
    })
