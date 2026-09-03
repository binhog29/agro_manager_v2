# logica/motor_agricultura.py
import random
from database import db, Propriedade, Jogador, Lote, Equipe, Maquinario

class MotorAgricultura:
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - CULTURAS (TEMPO E ÁGUA)
    # ==========================================
    CONFIG_CULTIVOS = {
        'feijao':   {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 80,   'agua_necessaria': 30},
        'melancia': {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 85,   'agua_necessaria': 30},
        'milho':    {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 90,   'agua_necessaria': 40},
        'tomate':   {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 90,   'agua_necessaria': 40},
        'soja':     {'dias_semente': 15, 'dias_broto': 40,  'dias_colheita': 100,  'agua_necessaria': 50},
        'arroz':    {'dias_semente': 15, 'dias_broto': 40,  'dias_colheita': 110,  'agua_necessaria': 80},
        'pimenta':  {'dias_semente': 15, 'dias_broto': 40,  'dias_colheita': 120,  'agua_necessaria': 40},
        'algodao':  {'dias_semente': 20, 'dias_broto': 50,  'dias_colheita': 150,  'agua_necessaria': 60},
        'mandioca': {'dias_semente': 30, 'dias_broto': 80,  'dias_colheita': 240,  'agua_necessaria': 20},
        'banana':   {'dias_semente': 30, 'dias_broto': 100, 'dias_colheita': 300,  'agua_necessaria': 50},
        'cana':     {'dias_semente': 30, 'dias_broto': 120, 'dias_colheita': 360,  'agua_necessaria': 50},
        'cafe':     {'dias_semente': 45, 'dias_broto': 150, 'dias_colheita': 365,  'agua_necessaria': 40},
        'abacaxi':  {'dias_semente': 45, 'dias_broto': 150, 'dias_colheita': 400,  'agua_necessaria': 40},
        'cacau':    {'dias_semente': 60, 'dias_broto': 200, 'dias_colheita': 500,  'agua_necessaria': 60},
        'cupuacu':  {'dias_semente': 90, 'dias_broto': 250, 'dias_colheita': 730,  'agua_necessaria': 60},
        'acai':     {'dias_semente': 90, 'dias_broto': 250, 'dias_colheita': 730,  'agua_necessaria': 70}
    }


    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - CLIMA E BÔNUS
    # ==========================================
    CHANCE_PRAGA_DIA = 0.05          
    PUNICAO_SOLO_FRACO = 5.0         
    PUNICAO_PRAGA = 10.0             
    PUNICAO_SECA_INVERNO = 3.0       
    BONUS_CHUVA_VERAO = 2.0          
    BONUS_AGRONOMO_PORCENTAGEM = 0.25 
    # ==========================================

    @staticmethod
    def processar_lotes(lotes, dias, clima_atual, jogador, avisos_turno):
        lotes_ids_validos = [l.id for l in lotes]
        if not lotes_ids_validos:
            return

        lotes_ativos = Lote.query.filter(Lote.id.in_(lotes_ids_validos), Lote.status.in_(['pasto', 'plantado', 'colhendo'])).all()
        
        # 🔥 CACHE DE OTIMIZAÇÃO: Evita travamentos ao pesquisar tratores para muitos hectares
        cache_fazendas = {}
        
        for lote in lotes_ativos:
            
            # ==========================================
            # 🌧️ LÓGICA UNIVERSAL DO CLIMA (ÁGUA NO SOLO)
            # ==========================================
            if clima_atual == 'chuva':
                lote.umidade_solo = min(100, float(lote.umidade_solo or 50) + (20 * dias))
            else:
                lote.umidade_solo = max(0, float(lote.umidade_solo or 50) - (10 * dias))

            # ==========================================
            # 🐄 LÓGICA DO PASTO
            # ==========================================
            if lote.status == 'pasto' and lote.tipo_capim:
                if lote.umidade_solo > 30:
                    lote.qualidade_capim = int(min(100, float(lote.qualidade_capim or 0) + (5 * dias)))
                else:
                    lote.qualidade_capim = int(max(0, float(lote.qualidade_capim or 0) - (3 * dias)))
                continue

            # ==========================================
            # 🌾 LÓGICA DA LAVOURA E CULTIVO
            # ==========================================
            if lote.status in ['plantado', 'colhendo']:
                tipo_cultivo = str(lote.tipo_cultivo).lower() if lote.tipo_cultivo else ''
                dna_planta = MotorAgricultura.CONFIG_CULTIVOS.get(tipo_cultivo)
                
                if not dna_planta:
                    continue 

                descanso = getattr(lote, 'dias_descanso', 0.0)
                if descanso > 0:
                    lote.dias_descanso = max(0.0, descanso - dias)
                    continue 

                if lote.status == 'plantado':
                    
                    # Carrega dados da fazenda na cache para o Tratorista
                    if lote.fazenda_id not in cache_fazendas:
                        f = Propriedade.query.get(lote.fazenda_id)
                        eq = Equipe.query.filter_by(propriedade_id=lote.fazenda_id).first()
                        mqs = Maquinario.query.filter_by(propriedade_id=lote.fazenda_id).all()
                        cache_fazendas[lote.fazenda_id] = {
                            'obj': f,
                            'equipe': eq,
                            'tipos_maq': [m.tipo for m in mqs],
                            'modelos_maq': [m.modelo for m in mqs]
                        }
                        
                    dados_faz = cache_fazendas[lote.fazenda_id]
                    fazenda = dados_faz['obj']
                    equipe = dados_faz['equipe']
                    
                    # 👨‍🌾 BÔNUS DO AGRÔNOMO
                    bonus_agronomo = 1.0
                    if equipe:
                        bonus_agronomo += (getattr(equipe, 'agronomos', 0) * MotorAgricultura.BONUS_AGRONOMO_PORCENTAGEM)

                    # 💧 SISTEMA DE IRRIGAÇÃO (Salva as plantas na seca)
                    if lote.umidade_solo < dna_planta['agua_necessaria'] and lote.sistema_irrigacao != 'nenhum':
                        lote.umidade_solo = dna_planta['agua_necessaria']

                    # 🌱 CRESCIMENTO REAL
                    fator_crescimento = 1.0
                    
                    if lote.umidade_solo < dna_planta['agua_necessaria']:
                        fator_crescimento = 0.3 
                        
                    if lote.compactacao_solo > 70: fator_crescimento -= 0.2
                    if lote.ph_solo < 5.0: fator_crescimento -= 0.3
                    
                    ganho_dias = (dias * max(0.1, fator_crescimento) * bonus_agronomo)
                    lote.dias_plantado = float(getattr(lote, 'dias_plantado', 0.0)) + ganho_dias
                    
                    # 📈 ATUALIZA A FASE VISUAL DA PLANTA 
                    dias_plantado_atual = lote.dias_plantado
                    if dias_plantado_atual < dna_planta['dias_semente']:
                        lote.fase_planta = 'Semente'
                    elif dias_plantado_atual < dna_planta['dias_broto']:
                        lote.fase_planta = 'Broto'
                    elif dias_plantado_atual < dna_planta['dias_colheita']:
                        lote.fase_planta = 'Crescimento'
                    else:
                        lote.fase_planta = 'Ponto de Colheita'

                    # 🐛 ATAQUE IMPREVISÍVEL DE PRAGAS
                    chance_real = MotorAgricultura.CHANCE_PRAGA_DIA * dias
                    teve_ataque = False
                    if random.random() < chance_real: 
                        severidade = random.choice([10, 15, 20, 25])
                        lote.nivel_pragas = int(min(100, getattr(lote, 'nivel_pragas', 0) + severidade))
                        teve_ataque = True
                        
                    # ----------------------------------------------------
                    # 🔥 MÁGICA 3 e 4: AUTOMAÇÃO AGRÍCOLA (TRATORISTAS)
                    # ----------------------------------------------------
                    tem_tratorista = equipe and getattr(equipe, 'tratoristas', 0) > 0
                    area_lote = {'Chácara': 1, 'Sítio': 5, 'Fazenda': 15, 'Latifúndio': 30}.get(getattr(fazenda, 'tipo', 'Chácara'), 1)

                    # 🚜 Defesa contra Pragas (Veneno)
                    if getattr(lote, 'nivel_pragas', 0) > 0:
                        if tem_tratorista and 'Pulverizador' in dados_faz['modelos_maq'] and getattr(fazenda, 'est_veneno', 0) >= area_lote:
                            fazenda.est_veneno -= area_lote
                            lote.nivel_pragas = 0
                            teve_ataque = False # Tratorista resolveu silenciosamente!
                            msg_veneno = f"🚜 Um Tratorista usou o Pulverizador e defendeu o {lote.nome} contra pragas."
                            if msg_veneno not in avisos_turno: avisos_turno.append(msg_veneno)
                            
                    if teve_ataque and getattr(lote, 'nivel_pragas', 0) > 0:
                        avisos_turno.append(f"⚠️ Pragas atacaram {lote.nome}! Sem tratorista ou defensivos.")

                    # 🚜 Recuperação de Solo (Adubo)
                    if getattr(lote, 'fertilidade_solo', 100) <= 60:
                        if tem_tratorista and 'Trator' in dados_faz['tipos_maq'] and getattr(fazenda, 'est_adubo', 0) >= area_lote:
                            fazenda.est_adubo -= area_lote
                            lote.fertilidade_solo = min(100, getattr(lote, 'fertilidade_solo', 100) + 40)
                            msg_adubo = f"🚜 O Tratorista aplicou Adubo no {lote.nome} e revitalizou a terra."
                            if msg_adubo not in avisos_turno: avisos_turno.append(msg_adubo)

                    # 📉 Punições se a automação não tiver agido
                    prod_atual = float(getattr(lote, 'produtividade_atual', 100))
                    
                    if getattr(lote, 'fertilidade_solo', 100) < 40:
                        prod_atual -= (MotorAgricultura.PUNICAO_SOLO_FRACO * dias)
                    if getattr(lote, 'nivel_pragas', 0) > 30:
                        prod_atual -= (MotorAgricultura.PUNICAO_PRAGA * dias)

                    # 🌦️ REALISMO CLIMÁTICO
                    estacao = getattr(jogador, 'estacao_atual', 'primavera') if jogador else 'primavera'
                    if estacao == 'inverno' and clima_atual == 'sol':
                        prod_atual -= (MotorAgricultura.PUNICAO_SECA_INVERNO * dias)
                    elif estacao == 'verao' and clima_atual == 'chuva':
                        prod_atual += (MotorAgricultura.BONUS_CHUVA_VERAO * dias)

                    lote.produtividade_atual = int(max(10, min(100, prod_atual)))
                    
                    # 🌽 HORA DA COLHEITA!
                    if lote.dias_plantado >= dna_planta['dias_colheita']:
                        lote.dias_plantado = float(dna_planta['dias_colheita'])
                        lote.status = 'colhendo'
                        avisos_turno.append(f"🌾 A safra de {tipo_cultivo.capitalize()} em {lote.nome} está pronta para colher!")
