from flask import Blueprint, request, jsonify, session
from database import db, Jogador
from logica.economia import registrar_transacao
from logica.motor_biologico import MotorBiologico
from datetime import datetime
import random

tempo_bp = Blueprint('tempo', __name__)

class GerenciadorTempo:
    MINUTOS_POR_HORA_ONLINE = 0.5
    MINUTOS_POR_HORA_OFFLINE = 1.0 
    LIMITE_AFK_MINUTOS = 10.0 

    # Mapeamento correto das estações (Dezembro, Janeiro e Fevereiro = Verão)
    ESTACOES = {
        12: 'verao', 1: 'verao', 2: 'verao',             
        3: 'outono', 4: 'outono', 5: 'outono',          
        6: 'inverno', 7: 'inverno', 8: 'inverno',       
        9: 'primavera', 10: 'primavera', 11: 'primavera' 
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

        horas_jogo_passadas = 0
        
        if minutos_passados <= cls.LIMITE_AFK_MINUTOS:
            horas_jogo_passadas = int(minutos_passados // cls.MINUTOS_POR_HORA_ONLINE)
        else:
            horas_online = int(cls.LIMITE_AFK_MINUTOS // cls.MINUTOS_POR_HORA_ONLINE)
            minutos_restantes = minutos_passados - cls.LIMITE_AFK_MINUTOS
            horas_offline = int(minutos_restantes // cls.MINUTOS_POR_HORA_OFFLINE)
            
            horas_jogo_passadas = horas_online + horas_offline

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

        meses_passados = 0 

        if dias_passados > 0:
            # Cálculo correto de virada de dias (base 1 a 30)
            total_dias = (jogador.dia - 1) + dias_passados
            jogador.dia = (total_dias % 30) + 1
            meses_passados = total_dias // 30

            if meses_passados > 0:
                # Cálculo correto de virada de meses (base 1 a 12)
                total_meses = (jogador.mes - 1) + meses_passados
                jogador.mes = (total_meses % 12) + 1
                anos_passados = total_meses // 12

                if anos_passados > 0:
                    jogador.ano += anos_passados

        cls._atualizar_clima_e_estacao(jogador)

        from database import Propriedade, Equipe, Maquinario
        from logica.barracao import Concessionaria
        avisos_automacao = []
        
        propriedades = Propriedade.query.filter_by(dono_id=jogador.id).all()
        for prop in propriedades:
            equipe = Equipe.query.filter_by(propriedade_id=prop.id).first()
            
            if equipe and getattr(equipe, 'tratoristas', 0) > 0:
                maquinas = Maquinario.query.filter_by(propriedade_id=prop.id).all()
                for maq in maquinas:
                    if maq.nivel_combustivel < 20 and getattr(prop, 'est_combustivel', 0) > 0:
                        espaco = 100 - maq.nivel_combustivel
                        gasto = min(espaco, prop.est_combustivel)
                        prop.est_combustivel -= gasto
                        maq.nivel_combustivel += gasto
                        avisos_automacao.append(f"🚜 O Tratorista abasteceu o {maq.modelo} com {gasto}L de Diesel.")
                    
                    if maq.estado_conservacao < 15:
                        dano = 100 - maq.estado_conservacao
                        preco_base = 0
                        for chave, info in Concessionaria.CATALOGO.items():
                            if info['nome'] == maq.modelo:
                                preco_base = info['preco']
                                break
                        
                        custo_reparo = dano * (preco_base * 0.0015) if preco_base > 0 else dano * 350.0
                        
                        if jogador.saldo >= custo_reparo:
                            jogador.saldo -= custo_reparo
                            maq.estado_conservacao = 100
                            registrar_transacao(jogador.id, 'saida', custo_reparo, f'Oficina Automática: {maq.modelo}')
                            avisos_automacao.append(f"🔧 O Tratorista levou o {maq.modelo} para a revisão. Custo: R$ {custo_reparo:,.2f}.")

        motor = MotorBiologico(clima_atual=getattr(jogador, 'clima_atual', 'limpo'), jogador=jogador)
        avisos = avisos_automacao + motor.processar_turno(horas)
        
        # BALANCEAMENTO MESTRE: FOLHA DE PAGAMENTO E ITR PROGRESSIVO
        if meses_passados > 0:
            from logica.funcionarios import cobrar_folha_pagamento
            from database import Lote
            
            horas_cobradas = meses_passados * 240
            custo_rh = cobrar_folha_pagamento(jogador, horas_cobradas)
            
            lotes_jogador = Lote.query.join(Propriedade).filter(Propriedade.dono_id == jogador.id).all()
            total_hectares_reais = 0
            
            for lote in lotes_jogador:
                prop_itr = Propriedade.query.get(lote.fazenda_id)
                area_lote = {'Chácara': 1, 'Sítio': 5, 'Fazenda': 15, 'Latifúndio': 30}.get(getattr(prop_itr, 'tipo', 'Chácara'), 1)
                total_hectares_reais += area_lote
                
            if total_hectares_reais <= 10:
                imposto_itr = (total_hectares_reais * 150.0) * meses_passados 
            else:
                hectares_extras = total_hectares_reais - 10
                multiplicador_imposto = 1.0 + (hectares_extras * 0.02)
                valor_por_hectare = 200.0 * multiplicador_imposto
                imposto_itr = (total_hectares_reais * valor_por_hectare) * meses_passados
            
            taxa_fortuna = 0
            if jogador.saldo > 10000000:
                taxa_fortuna = (jogador.saldo * 0.05) * meses_passados
            elif jogador.saldo > 3000000:
                taxa_fortuna = (jogador.saldo * 0.02) * meses_passados
                
            imposto_total = imposto_itr + taxa_fortuna
            
            if imposto_total > 0:
                valor_cobrado = imposto_total if jogador.saldo >= imposto_total else jogador.saldo
                jogador.saldo -= valor_cobrado
                registrar_transacao(jogador.id, 'saida', valor_cobrado, f'Impostos (ITR Progressivo + Tributos) ref. a {meses_passados} mês(es)')
                
                texto_fortuna = " e Tributo de Fortuna" if taxa_fortuna > 0 else ""
                avisos.append(f"🏛️ Receita Federal: R$ {valor_cobrado:,.2f} retidos em impostos patrimoniais{texto_fortuna}.")

            if custo_rh > 0:
                texto_mes = "mês" if meses_passados == 1 else "meses"
                avisos.append(f"💼 Folha de Pagamento: R$ {custo_rh:,.2f} descontados (Ref: Salário mensal por {meses_passados} {texto_mes}).")

        if avisos:
            from database import Notificacao
            data_jogo_str = f"{jogador.dia:02d}/{jogador.mes:02d}/{jogador.ano} {jogador.hora:02d}:00"
            for aviso in avisos:
                try:
                    nova_not = Notificacao(jogador_id=jogador.id, texto=aviso, data_jogo=data_jogo_str)
                except TypeError:
                    texto_adaptado = f"[{data_jogo_str}] {aviso}"
                    nova_not = Notificacao(jogador_id=jogador.id, texto=texto_adaptado)
                db.session.add(nova_not)

        return avisos

    @classmethod
    def _atualizar_clima_e_estacao(cls, jogador):
        jogador.estacao_atual = cls.ESTACOES.get(jogador.mes, 'primavera')
        sorteio = random.random()

        if jogador.estacao_atual == 'verao':
            if sorteio < 0.15:
                jogador.clima_atual = 'tempestade'
            elif sorteio < 0.65:
                jogador.clima_atual = 'chuvoso'
            else:
                jogador.clima_atual = 'limpo'
        elif jogador.estacao_atual == 'outono':
            if sorteio < 0.08:
                jogador.clima_atual = 'tempestade'
            elif sorteio < 0.40:
                jogador.clima_atual = 'chuvoso'
            else:
                jogador.clima_atual = 'limpo'
        elif jogador.estacao_atual == 'inverno':
            if sorteio < 0.10:
                jogador.clima_atual = 'chuvoso'
            else:
                jogador.clima_atual = 'limpo'
        else:  # primavera
            if sorteio < 0.05:
                jogador.clima_atual = 'tempestade'
            elif sorteio < 0.35:
                jogador.clima_atual = 'chuvoso'
            else:
                jogador.clima_atual = 'limpo'

@tempo_bp.route('/api/avancar_tempo', methods=['POST'])
def avancar_tempo_manual():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    horas_avancar = int(dados.get('horas', 0))
    TABELA_CUSTOS_BASE = { 1: 1000.0, 6: 5000.0, 24: 20000.0, 168: 120000.0 }
    
    if horas_avancar not in TABELA_CUSTOS_BASE:
        return jsonify({'sucesso': False, 'erro': 'Quantidade de horas inválida.'})
        
    from database import Propriedade
    qtd_prop = Propriedade.query.filter_by(dono_id=usuario.id).count()
    fator_escala = 1.0 + (getattr(usuario, 'nivel', 1) * 0.02) + (qtd_prop * 0.05)
    
    custo = TABELA_CUSTOS_BASE[horas_avancar] * fator_escala

    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para pagar os custos administrativos (R$ {custo:,.2f}).'})

    if custo > 0:
        usuario.saldo -= custo
        registrar_transacao(usuario.id, 'saida', custo, f'Custos Operacionais ({horas_avancar}h adiantadas)')

    avisos_motor = []
    if horas_avancar > 0:
        avisos_motor = GerenciadorTempo.avancar_tempo(usuario, horas_avancar)
        usuario.ultima_acao = datetime.utcnow()

    db.session.commit()
    
    return jsonify({
        'sucesso': True, 
        'msg': 'O tempo avançou e a natureza seguiu seu curso!', 
        'avisos': avisos_motor,
        'clima': getattr(usuario, 'clima_atual', 'limpo'),
        'estacao': getattr(usuario, 'estacao_atual', 'primavera'),
        'hora': f"{usuario.hora:02d}:00",
        'dia': usuario.dia,
        'mes': usuario.mes,
        'ano': usuario.ano
    })

@tempo_bp.route('/api/tempo_atual', methods=['GET'])
def tempo_atual():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Não logado'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    GerenciadorTempo.calcular_progresso_offline(usuario)
    return jsonify({
        'sucesso': True, 
        'hora': usuario.hora, 
        'dia': usuario.dia, 
        'mes': usuario.mes, 
        'ano': usuario.ano,
        'clima': getattr(usuario, 'clima_atual', 'limpo'), 
        'estacao': getattr(usuario, 'estacao_atual', 'primavera')
    })

@tempo_bp.route('/api/notificacoes', methods=['GET'])
def get_notificacoes():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    from database import Jogador, Notificacao
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    nots = Notificacao.query.filter_by(jogador_id=usuario.id).order_by(Notificacao.id.desc()).limit(50).all()
    dados = []
    for n in nots:
        data_exibicao = getattr(n, 'data_jogo', None)
        if not data_exibicao: data_exibicao = n.data.strftime("%d/%m/%Y %H:%M") if n.data else ""
        dados.append({'id': n.id, 'texto': n.texto, 'lida': n.lida, 'data': data_exibicao})
        n.lida = True 
    db.session.commit()
    return jsonify({'sucesso': True, 'notificacoes': dados})

@tempo_bp.route('/api/notificacoes/nao_lidas', methods=['GET'])
def get_nao_lidas():
    if 'usuario' not in session: return jsonify({'qtd': 0})
    from database import Jogador, Notificacao
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    qtd = Notificacao.query.filter_by(jogador_id=usuario.id, lida=False).count()
    return jsonify({'qtd': qtd})

@tempo_bp.route('/api/notificacoes/limpar', methods=['POST'])
def limpar_notificacoes():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    from database import Jogador, Notificacao
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    Notificacao.query.filter_by(jogador_id=usuario.id).delete()
    db.session.commit()
    return jsonify({'sucesso': True})

@tempo_bp.route('/api/tempo/sincronizar_offline', methods=['POST'])
def sincronizar_offline():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    horas_processadas = GerenciadorTempo.calcular_progresso_offline(usuario)
    return jsonify({'sucesso': True, 'horas': horas_processadas})
