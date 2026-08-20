# logica/motor_pecuaria.py
import random
from database import db, Lote, Animal, HistoricoMorte

class MotorPecuaria:
    @staticmethod
    def processar_animais(animais, dias, avisos_turno):
        for animal in animais:
            qualidade_pasto = 0
            tem_sal = False
            tem_racao = False
            infra_completa = False
            
            consumo_sal_animal = 0.05 * dias 
            consumo_racao_animal = 0.20 * dias

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

            animal.processar_biologia_animal(ambiente)
            
            if animal.saude <= 0:
                local_morte = "Curral" if animal.onde_esta == 'curral' else f"Lote {animal.lote_id}"
                causa_morte = f"Fome extrema e falta de cuidados ({local_morte})"
                avisos_turno.append(f"💀 O animal {animal.raca.capitalize()} (ID #{animal.id}) morreu! Causa: {causa_morte}.")
                
                db.session.add(HistoricoMorte(propriedade_id=animal.propriedade_id, raca=animal.raca, fase=animal.fase, causa=causa_morte))
                db.session.delete(animal)
                continue 
            
            MotorPecuaria._processar_reproducao(animal, dias, avisos_turno)

    @staticmethod
    def _processar_reproducao(animal, dias, avisos_turno):
        dna = animal.obter_dna()
        if not dna: return 
            
        tempo_gestacao = dna.get('gestacao', 280)
        peso_nascimento = dna.get('peso_jovem', 12.0) / 2.0 
        
        if animal.prenha and tempo_gestacao > 0 and animal.dias_gestacao >= tempo_gestacao:
            novo_filhote = Animal(propriedade_id=animal.propriedade_id, raca=animal.raca, fase='Filhote', peso=peso_nascimento, sexo=random.choice(['M', 'F']), onde_esta=animal.onde_esta, lote_id=animal.lote_id, origem='Nascimento')
            db.session.add(novo_filhote)
            avisos_turno.append(f"🎉 Nasceu um novo filhote de {animal.raca.capitalize()}!")
            animal.prenha = False
            animal.dias_gestacao = 0

        elif animal.sexo == 'F' and animal.fase == 'Adulto' and not animal.prenha and animal.onde_esta != 'curral':
            tem_macho = Animal.query.filter_by(lote_id=animal.lote_id, onde_esta=animal.onde_esta, sexo='M', fase='Adulto').first()
            if tem_macho and random.random() < (0.15 * dias):
                animal.prenha = True
                animal.dias_gestacao = 0
