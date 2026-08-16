from database import db, Animal, Lote, Propriedade, HistoricoMorte
import random
from logica.cultivo import CATALOGO_CULTIVOS

class MotorBiologico:
    def __init__(self, clima_atual='chuva'):
        self.clima_atual = clima_atual

    def processar_turno(self, horas_avancadas):
        dias = horas_avancadas / 24.0
        avisos_turno = []
        
        # =======================================================
        # 1. A NATUREZA AGE: Atualizar todos os Lotes (Plantas e Pastos)
        # =======================================================
        lotes = Lote.query.all()
        for lote in lotes:
            # Mantém a função original de biologia vegetal rodando
            if hasattr(lote, 'processar_biologia_vegetal'):
                lote.processar_biologia_vegetal(self.clima_atual)
                
        # Ciclo realista de Agricultura
        lotes_plantados = Lote.query.filter(Lote.status.in_(['plantado', 'colhendo'])).all()
        for lote in lotes_plantados:
            tempo_anterior = getattr(lote, 'dias_plantado', 0)
            lote.dias_plantado = tempo_anterior + dias

            if lote.status == 'plantado':
                # A) Chance de ataque de pragas
                if random.random() < (0.15 * dias): 
                    lote.nivel_pragas = min(100, getattr(lote, 'nivel_pragas', 0) + 20)
                    avisos_turno.append(f"⚠️ Alerta: Pragas detectadas na lavoura {lote.nome}!")
                
                # B) Solo fraco destrói a produtividade
                if getattr(lote, 'fertilidade_solo', 100) < 40:
                    lote.produtividade_atual = max(10, getattr(lote, 'produtividade_atual', 100) - (5 * dias))
                    
                # C) Pragas destroem a produtividade
                if getattr(lote, 'nivel_pragas', 0) > 30:
                    lote.produtividade_atual = max(10, getattr(lote, 'produtividade_atual', 100) - (10 * dias))
                
                # D) Ponto de Colheita (Agora usando a Orientação a Objetos)
                dna_planta = CATALOGO_CULTIVOS.get(lote.tipo_cultivo)
                
                if dna_planta:
                    if lote.dias_plantado >= dna_planta.tempo_colheita:
                        lote.status = 'colhendo'
                        avisos_turno.append(f"🌾 A safra de {dna_planta.nome} em {lote.nome} está pronta para colher!")

        # =======================================================
        # 2. A FAUNA AGE: Atualizar todos os Animais
        # =======================================================
        animais = Animal.query.all()
        for animal in animais:
            qualidade_pasto = 0
            tem_sal = False
            tem_racao = False
            infra_completa = False
            
            fazenda = None
            if animal.propriedade_id:
                fazenda = Propriedade.query.get(animal.propriedade_id)
                
                if fazenda and getattr(fazenda, 'est_racao', 0) > 0 and animal.onde_esta != 'pasto':
                    tem_racao = True
                    fazenda.est_racao -= 1 
            
            if animal.lote_id:
                pasto = Lote.query.get(animal.lote_id)
                if pasto:
                    qualidade_pasto = pasto.qualidade_capim
                    
                    # Verifica infraestrutura completa do pasto
                    if pasto.tem_cerca and pasto.tem_cocho and pasto.tem_bebedouro:
                        infra_completa = True
                    
                    # Consumo de sal no cocho integrado com estoque da fazenda
                    if pasto.tem_cocho and fazenda and getattr(fazenda, 'est_sal', 0) > 0:
                        tem_sal = True
                        fazenda.est_sal -= 1 

            ambiente = {
                'qualidade_pasto': qualidade_pasto,
                'tem_sal': tem_sal,
                'tem_racao': tem_racao,
                'infra_completa': infra_completa
            }

            # Animal processa biologia
            animal.processar_biologia_animal(ambiente)
            
            # --- O CEIFADOR: Verifica se o animal morreu ---
            if animal.saude <= 0:
                local_morte = "Curral" if animal.onde_esta == 'curral' else f"Lote {animal.lote_id}"
                causa_morte = f"Fome extrema e falta de cuidados ({local_morte})"
                
                nome_animal = f"{animal.raca.capitalize()} (ID #{animal.id})"
                avisos_turno.append(f"💀 O animal {nome_animal} morreu! Causa: {causa_morte}.")
                
                registro = HistoricoMorte(
                    propriedade_id=animal.propriedade_id,
                    raca=animal.raca,
                    fase=animal.fase,
                    causa=causa_morte
                )
                db.session.add(registro)
                db.session.delete(animal)
                continue 
            
            # 3. MILAGRE DA VIDA
            self._processar_reproducao(animal, dias, avisos_turno)

        db.session.commit()
        return avisos_turno

    def _processar_reproducao(self, animal, dias, avisos_turno):
        dna = animal.obter_dna()
        if not dna: 
            return 
            
        tempo_gestacao = dna.get('gestacao', 280)
        peso_nascimento = dna.get('peso_jovem', 12.0) / 2.0 
        
        if animal.prenha and tempo_gestacao > 0 and animal.dias_gestacao >= tempo_gestacao:
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
            avisos_turno.append(f"🎉 Nasceu um novo filhote de {animal.raca.capitalize()}!")
            
            animal.prenha = False
            animal.dias_gestacao = 0

        elif animal.sexo == 'F' and animal.fase == 'Adulto' and not animal.prenha and animal.onde_esta != 'curral':
            tem_macho = Animal.query.filter_by(
                lote_id=animal.lote_id,
                onde_esta=animal.onde_esta, 
                sexo='M', 
                fase='Adulto'
            ).first()

            if tem_macho:
                chance_de_sucesso = 0.15 * dias 
                if random.random() < chance_de_sucesso:
                    animal.prenha = True
                    animal.dias_gestacao = 0
