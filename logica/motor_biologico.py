# logica/motor_biologico.py
from database import db, Animal, Lote, Propriedade
from logica.motor_agricultura import MotorAgricultura
from logica.motor_pecuaria import MotorPecuaria

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

        # 2. O Maestro chama a Pecuária
        MotorPecuaria.processar_animais(animais, dias, avisos_turno)

        db.session.commit()
        return avisos_turno
