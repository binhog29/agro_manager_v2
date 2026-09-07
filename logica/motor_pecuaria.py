# logica/motor_pecuaria.py
import random
from database import db, Lote, Animal, HistoricoMorte, Propriedade
from logica.funcionarios import obter_bonus_equipe

class MotorPecuaria:
    GANHO_BASE_KG_DIA = 2.0        
    PENALIDADE_AFTOSA = 0.30       
    PENALIDADE_BRUCELOSE = 0.30    
    PENALIDADE_VERMIFUGO = 0.20    
    EFICIENCIA_MINIMA = 0.20       
    QUEDA_SAUDE_SEM_VACINA = 5.0   
    PERDA_PESO_CURRAL_DIA = 0.5    
    QUEDA_SAUDE_CURRAL_DIA = 10.0  
    PESO_MINIMO_SOBREVIVENCIA = 10.0 
    PESO_MUDANCA_JOVEM = 150.0   
    PESO_MUDANCA_ADULTO = 300.0  
    CHANCE_PRENHEZ_DIA = 0.10    
    DIAS_GESTACAO_PADRAO = 180.0   
    PESO_NASCIMENTO_BASE = 30.0    
    
    @staticmethod
    def processar_animais(animais, dias, avisos_turno):
        cache_bonus_rh = {} 

        for animal in animais:
            qualidade_pasto = 0
            tem_sal = False
            tem_racao = False
            infra_completa = False
            consumo_sal_animal = 0.03 * dias 
            consumo_racao_animal = 0.10 * dias
            
            if animal.propriedade_id and animal.propriedade_id not in cache_bonus_rh:
                cache_bonus_rh[animal.propriedade_id] = obter_bonus_equipe(animal.propriedade_id)
            bonus_rh = cache_bonus_rh.get(animal.propriedade_id, {})
            is_bovino = animal.raca.lower() in ['nelore', 'angus', 'guzera', 'brahman', 'girolando']

            if bonus_rh.get('protecao_animal', False):
                fazenda = Propriedade.query.get(animal.propriedade_id)
                
                if is_bovino:
                    if not getattr(animal, 'vacinado_aftosa', False) and getattr(fazenda, 'est_vacina_aftosa', 0) >= 1:
                        fazenda.est_vacina_aftosa -= 1
                        animal.vacinado_aftosa = True
                        msg_vac = "💉 O Peão buscou Vacina contra Aftosa no Armazém e imunizou os animais."
                        if msg_vac not in avisos_turno: avisos_turno.append(msg_vac)
                        
                    if not getattr(animal, 'vacinado_brucelose', False) and getattr(fazenda, 'est_vacina_brucelose', 0) >= 1:
                        fazenda.est_vacina_brucelose -= 1
                        animal.vacinado_brucelose = True
                        msg_vac_b = "💉 O Peão buscou Vacina contra Brucelose no Armazém e imunizou os animais."
                        if msg_vac_b not in avisos_turno: avisos_turno.append(msg_vac_b)

                if not getattr(animal, 'medicado', False) and getattr(fazenda, 'est_medicamento_geral', 0) >= 1:
                    fazenda.est_medicamento_geral -= 1
                    animal.medicado = True
                    msg_med = "💊 O Peão aplicou Medicamento Geral (Vermífugo) no gado desprotegido."
                    if msg_med not in avisos_turno: avisos_turno.append(msg_med)

                if not getattr(animal, 'suplementado', False) and getattr(fazenda, 'est_suplemento_engorda', 0) >= 1:
                    fazenda.est_suplemento_engorda -= 1
                    animal.suplementado = True
                    msg_sup = "💪 O Peão misturou Suplemento de Engorda na dieta do rebanho."
                    if msg_sup not in avisos_turno: avisos_turno.append(msg_sup)
                        
            peso_anterior = float(animal.peso or 0.0)
            dna = animal.obter_dna() if hasattr(animal, 'obter_dna') else {}
            peso_maximo = dna.get('peso_adulto', 400.0) * 1.5 
            
            if animal.lote_id:
                pasto = Lote.query.get(animal.lote_id)
                if pasto:
                    qualidade_pasto = pasto.qualidade_capim
                    if pasto.tem_cerca and pasto.tem_cocho and pasto.tem_bebedouro: infra_completa = True
                    
                    # ----------------------------------------------------
                    # 🔥 MÁGICA 1: PEÃO ABASTECENDO SAL AUTOMATICAMENTE
                    # ----------------------------------------------------
                    if pasto.tem_cocho:
                        if getattr(pasto, 'qtd_sal_cocho', 0) < consumo_sal_animal and bonus_rh.get('protecao_animal', False): 
                            buscou = False
                            # 🔥 PEÃO TRABALHADOR: Faz quantas viagens precisar!
                            while getattr(pasto, 'qtd_sal_cocho', 0) < consumo_sal_animal and getattr(fazenda, 'est_sal', 0) >= 1:
                                fazenda.est_sal -= 1
                                pasto.qtd_sal_cocho = getattr(pasto, 'qtd_sal_cocho', 0) + 10.0 
                                buscou = True
                                
                            if buscou:
                                msg_sal = f"👨‍🌾 Um Peão buscou Sal no Armazém e abasteceu o {pasto.nome}."
                                if msg_sal not in avisos_turno: avisos_turno.append(msg_sal)
                                
                        if getattr(pasto, 'qtd_sal_cocho', 0) >= consumo_sal_animal:
                            tem_sal = True
                            pasto.qtd_sal_cocho -= consumo_sal_animal

                    # ----------------------------------------------------
                    # 🔥 MÁGICA 2: PEÃO ABASTECENDO RAÇÃO AUTOMATICAMENTE
                    # ----------------------------------------------------
                    if getattr(pasto, 'tem_cocho_racao', False):
                        if getattr(pasto, 'qtd_racao_cocho', 0) < consumo_racao_animal and bonus_rh.get('protecao_animal', False): 
                            buscou = False
                            while getattr(pasto, 'qtd_racao_cocho', 0) < consumo_racao_animal and getattr(fazenda, 'est_racao', 0) >= 1:
                                fazenda.est_racao -= 1
                                pasto.qtd_racao_cocho = getattr(pasto, 'qtd_racao_cocho', 0) + 20.0 
                                buscou = True
                                
                            if buscou:
                                msg_racao = f"👨‍🌾 Um Peão buscou Ração no Armazém para a linha do {pasto.nome}."
                                if msg_racao not in avisos_turno: avisos_turno.append(msg_racao)
                                
                        if getattr(pasto, 'qtd_racao_cocho', 0) >= consumo_racao_animal:
                            tem_racao = True
                            pasto.qtd_racao_cocho -= consumo_racao_animal
            
                ambiente = {'qualidade_pasto': qualidade_pasto, 'tem_sal': tem_sal, 'tem_racao': tem_racao, 'infra_completa': infra_completa}
                animal.processar_biologia_animal(ambiente)
                
                if animal.peso < peso_anterior: animal.peso = peso_anterior 
                    
                eficiencia = 1.0
                if is_bovino:
                    if not getattr(animal, 'vacinado_aftosa', False): eficiencia -= MotorPecuaria.PENALIDADE_AFTOSA
                    if not getattr(animal, 'vacinado_brucelose', False): eficiencia -= MotorPecuaria.PENALIDADE_BRUCELOSE
                if not getattr(animal, 'medicado', False): eficiencia -= MotorPecuaria.PENALIDADE_VERMIFUGO
                    
                eficiencia = max(MotorPecuaria.EFICIENCIA_MINIMA, eficiencia)
                ganho_diario = 0.0
                if tem_sal and tem_racao: ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA * 1.5
                elif tem_sal or tem_racao: ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA
                else: ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA * 0.2
                    
                if getattr(animal, 'suplementado', False): ganho_diario += 1.0
                ganho_final = (ganho_diario * dias) * eficiencia
                animal.peso = min(peso_anterior + ganho_final, peso_maximo)
                
                if eficiencia < 1.0:
                    queda_saude = MotorPecuaria.QUEDA_SAUDE_SEM_VACINA * dias
                    if bonus_rh.get('reduz_doencas', False): queda_saude *= 0.1 
                    animal.saude = max(0.0, float(animal.saude or 100.0) - queda_saude)
                    
            # ===============================================
            # 👉 REGRA DOS NOVOS HABITATS (HARAS E APRISCO)
            # ===============================================
            elif getattr(animal, 'onde_esta', '') in ['haras', 'aprisco']:
                habitat = animal.onde_esta
                fazenda = Propriedade.query.get(animal.propriedade_id)
                qtd_racao_cocho = getattr(fazenda, f'{habitat}_qtd_racao', 0.0)
                
                consumo = 0.15 * dias if habitat == 'haras' else 0.05 * dias
                
                # 🔥 Automação do Peão para Haras/Aprisco COM AVISO E WHILE!
                if qtd_racao_cocho < consumo and bonus_rh.get('protecao_animal', False):
                    buscou = False
                    while qtd_racao_cocho < consumo and getattr(fazenda, 'est_racao', 0) >= 10:
                        fazenda.est_racao -= 10
                        qtd_racao_cocho += 10.0
                        buscou = True
                        
                    if buscou:
                        setattr(fazenda, f'{habitat}_qtd_racao', qtd_racao_cocho)
                        msg_hab = f"👨‍🌾 Um Peão buscou Ração (Gado) no Armazém para o {habitat.capitalize()}."
                        if msg_hab not in avisos_turno: avisos_turno.append(msg_hab)
                
                if qtd_racao_cocho >= consumo:
                    setattr(fazenda, f'{habitat}_qtd_racao', qtd_racao_cocho - consumo)
                    ganho = (MotorPecuaria.GANHO_BASE_KG_DIA * dias) * (1.5 if getattr(animal, 'suplementado', False) else 1.0)
                    animal.peso = min(peso_maximo, peso_anterior + ganho)
                    animal.saude = min(100.0, float(animal.saude or 100) + 10 * dias)
                    animal.fome = max(0.0, float(animal.fome or 0) - 40 * dias)
                else:
                    animal.fome = min(100.0, float(animal.fome or 0) + 20 * dias)
                    animal.peso = max(10.0, peso_anterior - (MotorPecuaria.PERDA_PESO_CURRAL_DIA * dias))
                    if animal.fome >= 100:
                        queda = 15 * dias
                        if bonus_rh.get('reduz_doencas', False): queda *= 0.1
                        animal.saude = max(0.0, float(animal.saude or 100) - queda)

            elif animal.onde_esta == 'curral':
                perda_peso = MotorPecuaria.PERDA_PESO_CURRAL_DIA * dias
                queda_saude = MotorPecuaria.QUEDA_SAUDE_CURRAL_DIA * dias
                if bonus_rh.get('protecao_animal', False):
                    perda_peso *= 0.2
                    queda_saude *= 0.2
                novo_peso = peso_anterior - perda_peso
                animal.peso = max(MotorPecuaria.PESO_MINIMO_SOBREVIVENCIA, novo_peso)
                animal.saude = max(0.0, float(animal.saude or 100.0) - queda_saude)
                
            if animal.fase == 'Filhote' and animal.peso >= MotorPecuaria.PESO_MUDANCA_JOVEM: animal.fase = 'Jovem'
            elif animal.fase == 'Jovem' and animal.peso >= MotorPecuaria.PESO_MUDANCA_ADULTO: animal.fase = 'Adulto'
            
            if animal.saude <= 0:
                local_morte = "Curral" if animal.onde_esta == 'curral' else (animal.onde_esta.capitalize() if animal.onde_esta in ['haras', 'aprisco'] else f"Lote {animal.lote_id}")
                causa_morte = f"Doença/Estresse e falta de cuidados ({local_morte})"
                avisos_turno.append(f"💀 O animal {animal.raca.capitalize()} (ID #{animal.id}) morreu! Causa: {causa_morte}.")
                db.session.add(HistoricoMorte(propriedade_id=animal.propriedade_id, raca=animal.raca, fase=animal.fase, causa=causa_morte))
                db.session.delete(animal)
                continue 
            
            MotorPecuaria._processar_reproducao(animal, dias, avisos_turno)
            
    @staticmethod
    def _processar_reproducao(animal, dias, avisos_turno):
        if animal.raca.lower() == 'girolando' and animal.sexo == 'F' and animal.fase == 'Adulto':
            dias_lactacao_atual = float(getattr(animal, 'dias_lactacao', 0.0))
            if getattr(animal, 'prenha', False) and float(getattr(animal, 'dias_gestacao', 0.0)) >= 220.0:
                animal.dias_lactacao = 0.0
                dias_lactacao_atual = 0.0

            if dias_lactacao_atual > 0:
                dias_producao = min(dias, dias_lactacao_atual)
                producao_diaria = 12.0
                if dias_lactacao_atual > 240.0: producao_diaria = 18.0  
                if dias_lactacao_atual > 210.0: producao_diaria -= 4.0
                    
                litros_gerados = producao_diaria * dias_producao 
                if float(animal.saude or 100.0) < 50.0: litros_gerados *= 0.5
                    
                if litros_gerados > 0:
                    from database import Propriedade 
                    fazenda = Propriedade.query.get(animal.propriedade_id)
                    if fazenda: fazenda.est_leite = float(getattr(fazenda, 'est_leite', 0.0)) + litros_gerados
                animal.dias_lactacao = max(0, dias_lactacao_atual - dias)

        if getattr(animal, 'prenha', False):
            animal.dias_gestacao = float(getattr(animal, 'dias_gestacao', 0.0)) + dias
            dna = animal.obter_dna() if hasattr(animal, 'obter_dna') else {}
            tempo_gestacao = dna.get('gestacao', MotorPecuaria.DIAS_GESTACAO_PADRAO)
            peso_nascimento = dna.get('peso_jovem', MotorPecuaria.PESO_NASCIMENTO_BASE)
            
            if animal.dias_gestacao >= tempo_gestacao:
                # 🔥 BALANCEAMENTO: Controle Rígido de Superlotação
                from database import Propriedade
                fazenda = Propriedade.query.get(animal.propriedade_id)
                pode_nascer = True
                
                if animal.lote_id:
                    limites = {'Chácara': 10, 'Sítio': 25, 'Fazenda': 50, 'Latifúndio': 100}
                    limite_pasto = limites.get(getattr(fazenda, 'tipo', 'Chácara'), 10)
                    if Animal.query.filter_by(lote_id=animal.lote_id).count() >= limite_pasto: pode_nascer = False
                elif animal.onde_esta == 'haras':
                    if Animal.query.filter_by(propriedade_id=animal.propriedade_id, onde_esta='haras').count() >= getattr(fazenda, 'cap_haras', 10): pode_nascer = False
                elif animal.onde_esta == 'aprisco':
                    if Animal.query.filter_by(propriedade_id=animal.propriedade_id, onde_esta='aprisco').count() >= getattr(fazenda, 'cap_aprisco', 30): pode_nascer = False
                else:
                    if Animal.query.filter_by(propriedade_id=animal.propriedade_id, onde_esta='curral').count() >= getattr(fazenda, 'cap_curral', 10): pode_nascer = False

                if pode_nascer:
                    import random
                    novo_filhote = Animal(propriedade_id=animal.propriedade_id, raca=animal.raca, fase='Filhote', peso=peso_nascimento, sexo=random.choice(['M', 'F']), onde_esta=animal.onde_esta, lote_id=animal.lote_id, origem='Nascimento')
                    db.session.add(novo_filhote)
                    local_nasc = f"no Lote {animal.lote_id}" if animal.lote_id else f"no {animal.onde_esta.capitalize()}"
                    avisos_turno.append(f"🎉 Nasceu um filhote de {animal.raca.capitalize()} {local_nasc}!")
                else:
                    local_cheio = f"Lote {animal.lote_id}" if animal.lote_id else animal.onde_esta.capitalize()
                    avisos_turno.append(f"⚠️ Tristeza: Um filhote de {animal.raca.capitalize()} não sobreviveu ao parto! O {local_cheio} está superlotado.")

                animal.prenha = False
                animal.dias_gestacao = 0.0
                if animal.raca.lower() == 'girolando': animal.dias_lactacao = 300.0

        elif animal.sexo == 'F' and animal.fase == 'Adulto' and animal.onde_esta != 'curral':
            pode_cruzar = True
            if animal.raca.lower() == 'girolando':
                dias_lactacao_atual = float(getattr(animal, 'dias_lactacao', 0.0))
                if dias_lactacao_atual > 255.0: pode_cruzar = False

            if pode_cruzar:
                import random
                tem_macho = Animal.query.filter_by(lote_id=animal.lote_id, onde_esta=animal.onde_esta, sexo='M', fase='Adulto').first()
                if tem_macho:
                    chance_real = MotorPecuaria.CHANCE_PRENHEZ_DIA * dias
                    if random.random() < chance_real:
                        animal.prenha = True
                        animal.dias_gestacao = 0.0
                        local_cruza = f"no Lote {animal.lote_id}" if animal.lote_id else f"no {animal.onde_esta.capitalize()}"
                        avisos_turno.append(f"💘 A fêmea {animal.raca.capitalize()} (ID #{animal.id}) acabou de emprenhar {local_cruza}!")
