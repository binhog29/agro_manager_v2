# logica/motor_pecuaria.py
import random
from database import db, Lote, Animal, HistoricoMorte
from logica.funcionarios import obter_bonus_equipe

class MotorPecuaria:
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - PASTO
    # ==========================================
    GANHO_BASE_KG_DIA = 1.0        # Engorda normal diária se tiver sal/ração
    PENALIDADE_AFTOSA = 0.30       # Perde 30% do crescimento se sem vacina de aftosa
    PENALIDADE_BRUCELOSE = 0.30    # Perde 30% do crescimento se sem vacina de brucelose
    PENALIDADE_VERMIFUGO = 0.20    # Perde 20% do crescimento se sem medicamento geral
    EFICIENCIA_MINIMA = 0.20       # Gado abandonado cresce no mínimo 20%
    QUEDA_SAUDE_SEM_VACINA = 5.0   # Quanta saúde perde por dia se estiver vulnerável no pasto
    
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - CURRAL
    # ==========================================
    PERDA_PESO_CURRAL_DIA = 0.5    # Gado parado no curral perde 2 kg por dia (estresse/sem pasto)
    QUEDA_SAUDE_CURRAL_DIA = 10.0  # Saúde despenca 10% ao dia se esquecido no curral
    PESO_MINIMO_SOBREVIVENCIA = 10.0 # O animal não "some" de magreza, mas morre se a saúde zerar
    
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - FASES DA VIDA (MUDANÇA POR PESO)
    # ==========================================
    PESO_MUDANCA_JOVEM = 150.0   # Atingiu 150kg (10@), vira Jovem
    PESO_MUDANCA_ADULTO = 300.0  # Atingiu 300kg (20@), vira Adulto e pode reproduzir

    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - REPRODUÇÃO
    # ==========================================
    CHANCE_PRENHEZ_DIA = 0.05    # 5% de chance ao dia de emprenhar se tiver macho no pasto
    DIAS_GESTACAO_PADRAO = 285.0   # ~9 meses e meio de gestação (padrão bovino)
    PESO_NASCIMENTO_BASE = 30.0    # Bezerro nasce com 30kg (2 arrobas)
    # ==========================================
    
    @staticmethod
    def processar_animais(animais, dias, avisos_turno):
        cache_bonus_rh = {} # Salva a equipe para não consultar o banco a cada vaca!

        for animal in animais:
            qualidade_pasto = 0
            tem_sal = False
            tem_racao = False
            infra_completa = False
            
            consumo_sal_animal = 0.03 * dias 
            consumo_racao_animal = 0.10 * dias
            
            # 🛡️ INJEÇÃO DE RH: Carrega a equipe da fazenda onde o animal está
            if animal.propriedade_id and animal.propriedade_id not in cache_bonus_rh:
                cache_bonus_rh[animal.propriedade_id] = obter_bonus_equipe(animal.propriedade_id)
            
            bonus_rh = cache_bonus_rh.get(animal.propriedade_id, {})

            if animal.lote_id:
                pasto = Lote.query.get(animal.lote_id)
                if pasto:
                    qualidade_pasto = pasto.qualidade_capim
                    if pasto.tem_cerca and pasto.tem_cocho and pasto.tem_bebedouro: 
                        infra_completa = True
                    
                    if pasto.tem_cocho and getattr(pasto, 'qtd_sal_cocho', 0) >= consumo_sal_animal:
                        tem_sal = True
                        pasto.qtd_sal_cocho -= consumo_sal_animal

                    if getattr(pasto, 'tem_cocho_racao', False) and getattr(pasto, 'qtd_racao_cocho', 0) >= consumo_racao_animal:
                        tem_racao = True
                        pasto.qtd_racao_cocho -= consumo_racao_animal
            
            ambiente = {
                'qualidade_pasto': qualidade_pasto, 
                'tem_sal': tem_sal, 
                'tem_racao': tem_racao, 
                'infra_completa': infra_completa
            }

            peso_anterior = float(animal.peso or 0.0)
            animal.processar_biologia_animal(ambiente)
            
            # 👉 REGRA DO PASTO
            if animal.lote_id: 
                if animal.peso < peso_anterior:
                    animal.peso = peso_anterior 
                    
                eficiencia = 1.0
                if not getattr(animal, 'vacinado_aftosa', False):
                    eficiencia -= MotorPecuaria.PENALIDADE_AFTOSA
                if not getattr(animal, 'vacinado_brucelose', False):
                    eficiencia -= MotorPecuaria.PENALIDADE_BRUCELOSE
                if not getattr(animal, 'medicado', False):
                    eficiencia -= MotorPecuaria.PENALIDADE_VERMIFUGO
                    
                eficiencia = max(MotorPecuaria.EFICIENCIA_MINIMA, eficiencia)
                
                ganho_diario = 0.0
                if tem_sal and tem_racao:
                    ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA * 1.5
                elif tem_sal or tem_racao:
                    ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA
                else:
                    ganho_diario = MotorPecuaria.GANHO_BASE_KG_DIA * 0.2
                    
                ganho_final = (ganho_diario * dias) * eficiencia
                animal.peso = peso_anterior + ganho_final
                
                if eficiencia < 1.0:
                    queda_saude = MotorPecuaria.QUEDA_SAUDE_SEM_VACINA * dias
                    # 🩺 BÔNUS VETERINÁRIO: Segura 90% da perda de saúde!
                    if bonus_rh.get('reduz_doencas', False):
                        queda_saude *= 0.1 
                    animal.saude = max(0.0, float(animal.saude or 100.0) - queda_saude)

            # 👉 REGRA DO CURRAL
            elif animal.onde_esta == 'curral':
                perda_peso = MotorPecuaria.PERDA_PESO_CURRAL_DIA * dias
                queda_saude = MotorPecuaria.QUEDA_SAUDE_CURRAL_DIA * dias
                
                # 🤠 BÔNUS DO PEÃO: Trata os bichos no curral, perdendo 80% menos peso e saúde
                if bonus_rh.get('protecao_animal', False):
                    perda_peso *= 0.2
                    queda_saude *= 0.2
                    
                novo_peso = peso_anterior - perda_peso
                animal.peso = max(MotorPecuaria.PESO_MINIMO_SOBREVIVENCIA, novo_peso)
                animal.saude = max(0.0, float(animal.saude or 100.0) - queda_saude)
                
            # 🔥 REGRA DE FASES DA VIDA
            if animal.fase == 'Filhote' and animal.peso >= MotorPecuaria.PESO_MUDANCA_JOVEM:
                animal.fase = 'Jovem'
            elif animal.fase == 'Jovem' and animal.peso >= MotorPecuaria.PESO_MUDANCA_ADULTO:
                animal.fase = 'Adulto'
            
            # Verificação de Morte
            if animal.saude <= 0:
                local_morte = "Curral" if animal.onde_esta == 'curral' else f"Lote {animal.lote_id}"
                causa_morte = f"Doença/Estresse e falta de cuidados ({local_morte})"
                avisos_turno.append(f"💀 O animal {animal.raca.capitalize()} (ID #{animal.id}) morreu! Causa: {causa_morte}.")
                
                db.session.add(HistoricoMorte(propriedade_id=animal.propriedade_id, raca=animal.raca, fase=animal.fase, causa=causa_morte))
                db.session.delete(animal)
                continue 
            
            MotorPecuaria._processar_reproducao(animal, dias, avisos_turno)
            
    @staticmethod
    def _processar_reproducao(animal, dias, avisos_turno):
        
        # 🥛 LÓGICA REALISTA: Produção de Leite (Requer Lactação pós-parto)
        if animal.raca.lower() == 'girolando' and animal.sexo == 'F' and animal.fase == 'Adulto':
            dias_lactacao_atual = float(getattr(animal, 'dias_lactacao', 0.0))
            
            if dias_lactacao_atual > 0:
                # Ela só produz leite pelos dias em que ainda tiver lactação ativa
                dias_producao = min(dias, dias_lactacao_atual)
                litros_gerados = 12.0 * dias_producao # Reduzido para 12L/dia para balancear a economia
                
                # Se a saúde estiver baixa, a produção cai pela metade
                if float(animal.saude or 100.0) < 50.0:
                    litros_gerados *= 0.5
                    
                if litros_gerados > 0:
                    from database import Propriedade # Importação segura e isolada
                    fazenda = Propriedade.query.get(animal.propriedade_id)
                    if fazenda:
                        fazenda.est_leite = float(getattr(fazenda, 'est_leite', 0.0)) + litros_gerados
                
                # Desconta os dias que passaram do tempo de lactação dela
                animal.dias_lactacao = max(0, dias_lactacao_atual - dias)

        # 1. SE A FÊMEA JÁ ESTÁ PRENHA: Avançamos o tempo de gestação!
        if getattr(animal, 'prenha', False):
            animal.dias_gestacao = float(getattr(animal, 'dias_gestacao', 0.0)) + dias
            
            # Puxa a genética real da raça no banco de dados
            dna = animal.obter_dna() if hasattr(animal, 'obter_dna') else {}
            tempo_gestacao = dna.get('gestacao', MotorPecuaria.DIAS_GESTACAO_PADRAO)
            peso_nascimento = dna.get('peso_jovem', MotorPecuaria.PESO_NASCIMENTO_BASE)
            
            # 2. CHEGOU A HORA DO PARTO?
            if animal.dias_gestacao >= tempo_gestacao:
                import random
                novo_filhote = Animal(
                    propriedade_id=animal.propriedade_id, 
                    raca=animal.raca, 
                    fase='Filhote', 
                    peso=peso_nascimento, 
                    sexo=random.choice(['M', 'F']), 
                    onde_esta=animal.onde_esta, 
                    lote_id=animal.lote_id, 
                    origem='Nascimento'
                )
                db.session.add(novo_filhote)
                
                avisos_turno.append(f"🎉 Nasceu um filhote de {animal.raca.capitalize()} no Lote {animal.lote_id}!")
                animal.prenha = False
                animal.dias_gestacao = 0.0
                
                # 🔥 INICIA A LACTAÇÃO: A vaca agora dá leite por 300 dias!
                if animal.raca.lower() == 'girolando':
                    animal.dias_lactacao = 300

        # 3. SE NÃO ESTÁ PRENHA: Verifica se pode cruzar
        elif animal.sexo == 'F' and animal.fase == 'Adulto' and animal.onde_esta != 'curral':
            import random
            tem_macho = Animal.query.filter_by(lote_id=animal.lote_id, onde_esta=animal.onde_esta, sexo='M', fase='Adulto').first()
            
            if tem_macho:
                chance_real = MotorPecuaria.CHANCE_PRENHEZ_DIA * dias
                if random.random() < chance_real:
                    animal.prenha = True
                    animal.dias_gestacao = 0.0
                    avisos_turno.append(f"💘 A fêmea {animal.raca.capitalize()} (ID #{animal.id}) acabou de emprenhar no pasto!")
