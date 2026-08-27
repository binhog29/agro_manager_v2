# logica/motor_avicultura.py
import random
from database import db, HistoricoMorte, Propriedade, Animal
from logica.funcionarios import obter_bonus_equipe

class MotorAvicultura:
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - AVICULTURA
    # ==========================================
    CONFIG_AVES = {
        'galinha': {'crescimento': 0.05, 'consumo': 0.10},
        'pato':    {'crescimento': 0.06, 'consumo': 0.12},
        'peru':    {'crescimento': 0.08, 'consumo': 0.15},
    }
    
    AUMENTO_FOME_DIA = 30.0        
    QUEDA_SAUDE_FOME_DIA = 25.0    
    RECUPERACAO_SAUDE_DIA = 10.0   
    CHANCE_CHOCAR_DIA = 0.05       # 5% de chance de começar a chocar
    PRODUCAO_OVOS_DIA = 1.0        # 1 Ovo por ave adulta fêmea ao dia
    # ==========================================

    
    @staticmethod
    def processar_animais(animais_galinheiro, dias, avisos_turno):
        if not animais_galinheiro:
            return
            
        fazenda = Propriedade.query.get(animais_galinheiro[0].propriedade_id)
        if not fazenda:
            return
            
        cache_bonus_rh = {} 

        consumo_total = 0.0
        config_por_ave = {}
        for ave in animais_galinheiro:
            raca = ave.raca.lower()
            config = MotorAvicultura.CONFIG_AVES.get(raca, {'crescimento': 0.05, 'consumo': 0.1})
            config_por_ave[ave.id] = config
            consumo_total += config['consumo'] * dias

        qtd_comedouro = getattr(fazenda, 'galinheiro_qtd_racao', 0.0)
        tem_racao_geral = False
        
        if qtd_comedouro >= consumo_total:
            tem_racao_geral = True
            fazenda.galinheiro_qtd_racao -= consumo_total
        else:
            if qtd_comedouro > 0:
                fazenda.galinheiro_qtd_racao = 0.0
            tem_racao_geral = False

        for ave in animais_galinheiro:
            config = config_por_ave[ave.id]
            
            if ave.propriedade_id not in cache_bonus_rh:
                cache_bonus_rh[ave.propriedade_id] = obter_bonus_equipe(ave.propriedade_id)
            bonus_rh = cache_bonus_rh[ave.propriedade_id]

            peso_anterior = float(ave.peso or 0.0)
            
            if tem_racao_geral:
                ave.peso = peso_anterior + (config['crescimento'] * dias)
                ave.fome = max(0.0, float(ave.fome or 0) - (50.0 * dias))
                ave.saude = min(100.0, float(ave.saude or 100) + (MotorAvicultura.RECUPERACAO_SAUDE_DIA * dias))
            else:
                ave.fome = min(100.0, float(ave.fome or 0) + (MotorAvicultura.AUMENTO_FOME_DIA * dias))
                
                perda_peso = config['crescimento'] * 0.5 * dias
                if bonus_rh.get('protecao_animal', False):
                    perda_peso *= 0.2
                ave.peso = max(0.1, peso_anterior - perda_peso)
                
                if ave.fome >= 100.0:
                    queda_saude = MotorAvicultura.QUEDA_SAUDE_FOME_DIA * dias
                    if bonus_rh.get('reduz_doencas', False):
                        queda_saude *= 0.1
                    ave.saude = max(0.0, float(ave.saude or 100) - queda_saude)
                    
            if ave.saude <= 0:
                avisos_turno.append(f"💀 Lote de {ave.raca.capitalize()} (ID #{ave.id}) morreu no galinheiro por desnutrição!")
                db.session.add(HistoricoMorte(propriedade_id=ave.propriedade_id, raca=ave.raca, fase=ave.fase, causa="Fome extrema (Galinheiro)"))
                db.session.delete(ave)
                continue
                
            MotorAvicultura._processar_ovos_e_reproducao(ave, dias, avisos_turno, fazenda)

    @staticmethod
    def _processar_ovos_e_reproducao(ave, dias, avisos_turno, fazenda):
        # Só fêmeas adultas botam ovos
        if ave.sexo == 'F' and ave.fase == 'Adulto':
            ovos_gerados = int(MotorAvicultura.PRODUCAO_OVOS_DIA * dias)
            if ovos_gerados > 0:
                fazenda.est_ovos = getattr(fazenda, 'est_ovos', 0) + ovos_gerados

        if getattr(ave, 'prenha', False):
            ave.dias_gestacao = float(getattr(ave, 'dias_gestacao', 0.0)) + dias
            
            dna = ave.obter_dna() if hasattr(ave, 'obter_dna') else {}
            tempo_gestacao = dna.get('gestacao', 21)
            peso_nascimento = dna.get('peso_jovem', 0.5)
            
            if ave.dias_gestacao >= tempo_gestacao:
                novo_filhote = Animal(
                    propriedade_id=ave.propriedade_id, 
                    raca=ave.raca, 
                    fase='Filhote', 
                    peso=peso_nascimento, 
                    sexo=random.choice(['M', 'F']), 
                    onde_esta=ave.onde_esta, 
                    origem='Nascimento'
                )
                db.session.add(novo_filhote)
                avisos_turno.append(f"🐣 Nasceu um filhote de {ave.raca.capitalize()} no Galinheiro!")
                ave.prenha = False
                ave.dias_gestacao = 0.0

        elif ave.sexo == 'F' and ave.fase == 'Adulto':
            tem_macho = Animal.query.filter_by(propriedade_id=ave.propriedade_id, onde_esta=ave.onde_esta, sexo='M', fase='Adulto').first()
            if tem_macho:
                chance_real = MotorAvicultura.CHANCE_CHOCAR_DIA * dias
                if random.random() < chance_real:
                    ave.prenha = True
                    ave.dias_gestacao = 0.0
                    avisos_turno.append(f"🥚 Uma {ave.raca.capitalize()} (ID #{ave.id}) começou a chocar no galinheiro!")
