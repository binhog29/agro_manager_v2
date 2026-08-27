# logica/motor_suinocultura.py
import random
from database import db, HistoricoMorte, Propriedade, Animal
from logica.funcionarios import obter_bonus_equipe

class MotorSuinocultura:
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - SUINOCULTURA
    # ==========================================
    CONFIG_SUINOS = {
        'porco':  {'crescimento': 0.8, 'consumo': 0.15},
        'leitao': {'crescimento': 0.4, 'consumo': 0.05}
    }
    
    AUMENTO_FOME_DIA = 25.0
    QUEDA_SAUDE_FOME_DIA = 20.0
    RECUPERACAO_SAUDE_DIA = 10.0
    CHANCE_PRENHEZ_DIA = 0.10 # 10% de chance ao dia
    # ==========================================

    @staticmethod
    def processar_animais(animais_chiqueiro, dias, avisos_turno):
        if not animais_chiqueiro:
            return
            
        fazenda = Propriedade.query.get(animais_chiqueiro[0].propriedade_id)
        if not fazenda:
            return
            
        cache_bonus_rh = {} 

        consumo_total = 0.0
        config_por_porco = {}
        for porco in animais_chiqueiro:
            raca = porco.raca.lower()
            config = MotorSuinocultura.CONFIG_SUINOS.get(raca, {'crescimento': 0.8, 'consumo': 2.0})
            config_por_porco[porco.id] = config
            consumo_total += config['consumo'] * dias

        qtd_comedouro = getattr(fazenda, 'chiqueiro_qtd_racao', 0.0)
        tem_racao_geral = False
        
        if qtd_comedouro >= consumo_total:
            tem_racao_geral = True
            fazenda.chiqueiro_qtd_racao -= consumo_total
        else:
            if qtd_comedouro > 0:
                fazenda.chiqueiro_qtd_racao = 0.0
            tem_racao_geral = False

        for porco in animais_chiqueiro:
            config = config_por_porco[porco.id]
                
            if porco.propriedade_id not in cache_bonus_rh:
                cache_bonus_rh[porco.propriedade_id] = obter_bonus_equipe(porco.propriedade_id)
            bonus_rh = cache_bonus_rh[porco.propriedade_id]

            peso_anterior = float(porco.peso or 0.0)
            
            if tem_racao_geral:
                porco.peso = peso_anterior + (config['crescimento'] * dias)
                porco.fome = max(0.0, float(porco.fome or 0) - (40.0 * dias))
                porco.saude = min(100.0, float(porco.saude or 100) + (MotorSuinocultura.RECUPERACAO_SAUDE_DIA * dias))
            else:
                porco.fome = min(100.0, float(porco.fome or 0) + (MotorSuinocultura.AUMENTO_FOME_DIA * dias))
                
                perda_peso = config['crescimento'] * 0.8 * dias
                if bonus_rh.get('protecao_animal', False):
                    perda_peso *= 0.2
                porco.peso = max(0.5, peso_anterior - perda_peso)
                
                if porco.fome >= 100.0:
                    queda_saude = MotorSuinocultura.QUEDA_SAUDE_FOME_DIA * dias
                    if bonus_rh.get('reduz_doencas', False):
                        queda_saude *= 0.1
                    porco.saude = max(0.0, float(porco.saude or 100) - queda_saude)
                    
            if porco.saude <= 0:
                avisos_turno.append(f"💀 Lote de {porco.raca.capitalize()} (ID #{porco.id}) morreu no chiqueiro de fome!")
                db.session.add(HistoricoMorte(propriedade_id=porco.propriedade_id, raca=porco.raca, fase=porco.fase, causa="Fome extrema (Chiqueiro)"))
                db.session.delete(porco)
                continue
                
            MotorSuinocultura._processar_reproducao(porco, dias, avisos_turno)

    @staticmethod
    def _processar_reproducao(animal, dias, avisos_turno):
        if getattr(animal, 'prenha', False):
            animal.dias_gestacao = float(getattr(animal, 'dias_gestacao', 0.0)) + dias
            
            dna = animal.obter_dna() if hasattr(animal, 'obter_dna') else {}
            tempo_gestacao = dna.get('gestacao', 114)
            peso_nascimento = dna.get('peso_jovem', 15.0)
            
            if animal.dias_gestacao >= tempo_gestacao:
                novo_filhote = Animal(
                    propriedade_id=animal.propriedade_id, 
                    raca=animal.raca, 
                    fase='Filhote', 
                    peso=peso_nascimento, 
                    sexo=random.choice(['M', 'F']), 
                    onde_esta=animal.onde_esta, 
                    origem='Nascimento'
                )
                db.session.add(novo_filhote)
                avisos_turno.append(f"🎉 Nasceram leitões de {animal.raca.capitalize()} no Chiqueiro!")
                animal.prenha = False
                animal.dias_gestacao = 0.0

        elif animal.sexo == 'F' and animal.fase == 'Adulto':
            tem_macho = Animal.query.filter_by(propriedade_id=animal.propriedade_id, onde_esta=animal.onde_esta, sexo='M', fase='Adulto').first()
            if tem_macho:
                chance_real = MotorSuinocultura.CHANCE_PRENHEZ_DIA * dias
                if random.random() < chance_real:
                    animal.prenha = True
                    animal.dias_gestacao = 0.0
                    avisos_turno.append(f"💘 Uma matriz de {animal.raca.capitalize()} (ID #{animal.id}) está prenha no chiqueiro!")
