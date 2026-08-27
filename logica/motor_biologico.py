# logica/motor_biologico.py
from database import db, Animal, Lote, Propriedade
from logica.motor_agricultura import MotorAgricultura
from logica.motor_pecuaria import MotorPecuaria
from logica.motor_avicultura import MotorAvicultura
from logica.motor_suinocultura import MotorSuinocultura
from logica.motor_piscicultura import MotorPiscicultura

class MotorBiologico:
    def __init__(self, clima_atual='chuva', jogador=None):
        self.clima_atual = clima_atual
        self.jogador = jogador

    def processar_turno(self, horas_avancadas):
        dias = horas_avancadas / 24.0
        avisos_turno = []
        
        if self.jogador:
            propriedades = Propriedade.query.filter_by(dono_id=self.jogador.id).all()
            prop_ids = [p.id for p in propriedades]
            lotes = Lote.query.filter(Lote.fazenda_id.in_(prop_ids)).all() if prop_ids else []
            animais = Animal.query.filter(Animal.propriedade_id.in_(prop_ids)).all() if prop_ids else []
        else:
            lotes = Lote.query.all()
            animais = Animal.query.all()

        # 1. O Maestro chama a Agricultura
        MotorAgricultura.processar_lotes(lotes, dias, self.clima_atual, self.jogador, avisos_turno)

        # 2. O Maestro SEPARA os animais por tipo
        gados = [a for a in animais if a.raca.lower() in ['nelore', 'angus', 'guzera', 'brahman', 'girolando', 'cavalo']]
        aves = [a for a in animais if a.raca.lower() in ['galinha', 'pato', 'peru']]
        suinos = [a for a in animais if a.raca.lower() in ['porco']]
        peixes = [a for a in animais if a.raca.lower() in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau']]

        # 3. O Maestro envia cada grupo para o seu Motor Específico
        if gados:
            MotorPecuaria.processar_animais(gados, dias, avisos_turno)
        if aves:
            MotorAvicultura.processar_animais(aves, dias, avisos_turno)
        if suinos:
            MotorSuinocultura.processar_animais(suinos, dias, avisos_turno)
        if peixes:
            MotorPiscicultura.processar_animais(peixes, dias, avisos_turno)

        db.session.commit()
        return avisos_turno
