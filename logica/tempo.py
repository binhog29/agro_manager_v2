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
        
        # ==========================================
        # NOVO: PROGRESSÃO DE XP POR GESTÃO DO TEMPO
        # ==========================================
        xp_ganho = int(horas * 5)  # 15 XP por cada hora paga/gerenciada
        
        # Chama a inteligência do banco para somar XP e checar se subiu de nível
        if jogador.adicionar_xp(xp_ganho):
            # Se subiu, dispara um aviso que vai direto pra tela do jogador
            bonus = jogador.nivel * 1000
            valor_formatado = f"{bonus:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            avisos.append(f"🎉 LEVEL UP! Parabéns, você alcançou o Nível {jogador.nivel} e ganhou R$ {valor_formatado} de bônus!")
            
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

    # 💰 TABELA DE PREÇOS FIXOS BALANCEADOS
    # Valores justos para não quebrar os iniciantes, mas pesar no bolso
    tabela_precos = {
        1: 1000.0,       # 1 Hora = R$ 1.000
        6: 5000.0,       # 6 Horas = R$ 5.000
        24: 20000.0,     # 1 Dia = R$ 20.000
        168: 120000.0    # 1 Semana = R$ 120.000
    }

    # Pega o custo fixo baseado na quantidade de horas.
    custo_real = tabela_precos.get(horas_avancar, horas_avancar * 500.0)

    # 2. Verifica se o jogador aguenta pagar as despesas
    if usuario.saldo < custo_real:
        valor_formatado = f"{custo_real:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return jsonify({
            'sucesso': False, 
            'erro': f'Saldo insuficiente para pagar as despesas operacionais! Custo: R$ {valor_formatado}'
        })

    # 3. Cobra o jogador e registra a transação
    if custo_real > 0:
        usuario.saldo -= custo_real
        registrar_transacao(
            jogador_id=usuario.id,
            tipo='saida',
            valor=custo_real,
            descricao=f'Despesas Fixas de Operação ({horas_avancar}h)'
        )

    # 4. Avança o tempo biológico da fazenda com segurança
    avisos_motor = []
    if horas_avancar > 0:
        avisos_motor = GerenciadorTempo.avancar_tempo(usuario, horas_avancar)
        usuario.ultima_acao = datetime.utcnow()

    db.session.commit()
    
    valor_formatado = f"{custo_real:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return jsonify({
        'sucesso': True, 
        'msg': f'O tempo avançou! Despesas pagas: R$ {valor_formatado}',
        'avisos': avisos_motor
    })
    
@tempo_bp.route('/api/tempo_atual', methods=['GET'])
def tempo_atual():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Não logado'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    # 🔥 A MÁGICA VOLTA AQUI: Calcula todo o tempo offline antes de devolver a hora atualizada para a tela!
    GerenciadorTempo.calcular_progresso_offline(usuario)
    
    return jsonify({
        'sucesso': True,
        'hora': usuario.hora,
        'dia': usuario.dia,
        'mes': usuario.mes,
        'ano': usuario.ano,
        'clima': getattr(usuario, 'clima_atual', 'sol'),
        'estacao': getattr(usuario, 'estacao_atual', 'primavera')
    })
