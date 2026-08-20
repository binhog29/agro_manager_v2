# logica/motor_agricultura.py
import random
from database import db, Propriedade, Jogador, Lote
from logica.cultivo import CATALOGO_CULTIVOS

class MotorAgricultura:
    @staticmethod
    def processar_lotes(lotes, dias, clima_atual, jogador, avisos_turno):
        for lote in lotes:
            if hasattr(lote, 'processar_biologia_vegetal'):
                lote.processar_biologia_vegetal(clima_atual)
                
        lotes_ids_validos = [l.id for l in lotes]
        if not lotes_ids_validos:
            return

        lotes_plantados = Lote.query.filter(Lote.id.in_(lotes_ids_validos), Lote.status.in_(['plantado', 'colhendo'])).all()
        
        for lote in lotes_plantados:
            dna_planta = CATALOGO_CULTIVOS.get(lote.tipo_cultivo)
            if not dna_planta:
                continue

            descanso = getattr(lote, 'dias_descanso', 0.0)
            if descanso > 0:
                lote.dias_descanso = max(0.0, descanso - dias)
                continue 
                
            if lote.status == 'plantado':
                lote.dias_plantado = round(getattr(lote, 'dias_plantado', 0.0) + dias, 3)

                # 🐛 ATAQUE IMPREVISÍVEL DE PRAGAS
                # Chance menor diária (aprox 5%) resulta num ataque a cada 15 a 30 dias
                if random.random() < (0.05 * dias): 
                    severidade = random.choice([10, 15, 20, 25])
                    lote.nivel_pragas = int(min(100, getattr(lote, 'nivel_pragas', 0) + severidade))
                    avisos_turno.append(f"⚠️ Alerta: Pragas atacaram a lavoura {lote.nome}!")
                
                prod_atual = float(getattr(lote, 'produtividade_atual', 100))

                # IMPACTO CLÁSSICO DE SOLO E PRAGAS
                if getattr(lote, 'fertilidade_solo', 100) < 40:
                    prod_atual -= (5 * dias)
                if getattr(lote, 'nivel_pragas', 0) > 30:
                    prod_atual -= (10 * dias)

                # 🌦️ REALISMO CLIMÁTICO E SAZONAL
                estacao = getattr(jogador, 'estacao_atual', 'primavera') if jogador else 'primavera'
                if estacao == 'inverno' and clima_atual == 'sol':
                    prod_atual -= (3 * dias) # Seca castiga a produtividade
                elif estacao == 'verao' and clima_atual == 'chuva':
                    prod_atual += (2 * dias) # Clima ideal recupera a planta

                # Segura nos limites de 10% a 100%
                lote.produtividade_atual = int(max(10, min(100, prod_atual)))
                
                # REGRAS ORIGINAIS DE COLHEITA
                if lote.dias_plantado >= dna_planta.tempo_colheita:
                    lote.dias_plantado = float(dna_planta.tempo_colheita)
                    
                    pode_colher = True
                    if getattr(dna_planta, 'tipo_biologia', 'anual') == 'sazonal':
                        fazenda = Propriedade.query.get(lote.fazenda_id)
                        if fazenda:
                            dono = Jogador.query.get(fazenda.dono_id)
                            estacao_dono = getattr(dono, 'estacao_atual', 'primavera') if dono else 'primavera'
                            if estacao_dono not in getattr(dna_planta, 'estacoes_fruto', []):
                                pode_colher = False 
                    
                    if pode_colher:
                        lote.status = 'colhendo'
                        avisos_turno.append(f"🌾 A safra de {dna_planta.nome} em {lote.nome} está pronta para colher!")
