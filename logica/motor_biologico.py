# logica/motor_biologico.py
from database import db, Animal, Lote, Propriedade, Maquinario
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

                # ==========================================
        # 🚚 LOGÍSTICA: ATUALIZA O TEMPO DE VIAGEM DA FROTA (ANIMAIS)
        # ==========================================
        chegadas = {}
        for a in animais:
            if getattr(a, 'onde_esta', '') == 'caminhao':
                a.horas_viagem = max(0, int(getattr(a, 'horas_viagem', 0)) - horas_avancadas)
                
                if a.horas_viagem <= 0 and getattr(a, 'destino_id', None):
                    dest_id = a.destino_id
                    if dest_id not in chegadas: chegadas[dest_id] = 0
                    chegadas[dest_id] += 1
                    
                    a.propriedade_id = a.destino_id
                    a.onde_esta = getattr(a, 'habitat_destino', 'curral')
                    a.destino_id = None
                    a.habitat_destino = None

        for dest_id, qtd in chegadas.items():
            fazenda_dest = Propriedade.query.get(dest_id)
            nome_fazenda = fazenda_dest.nome if fazenda_dest else "sua propriedade"
            avisos_turno.append(f"🚚 Logística Concluída! {qtd} animais desembarcaram com segurança em: {nome_fazenda}.")

        # ==========================================
        # 🚜 LOGÍSTICA: TRANSPORTE DE MÁQUINAS (PRANCHA)
        # ==========================================
        maquinas = Maquinario.query.filter(Maquinario.propriedade_id.in_(prop_ids)).all() if prop_ids else []
        chegadas_maq = {}
        
        for m in maquinas:
            if getattr(m, 'destino_id', None) is not None and getattr(m, 'horas_viagem', 0) > 0:
                m.horas_viagem = max(0, int(getattr(m, 'horas_viagem', 0)) - horas_avancadas)
                
                if m.horas_viagem <= 0:
                    dest_id = m.destino_id
                    if dest_id not in chegadas_maq: chegadas_maq[dest_id] = 0
                    chegadas_maq[dest_id] += 1
                    
                    m.propriedade_id = dest_id
                    m.destino_id = None
                    m.horas_viagem = 0

        for dest_id, qtd in chegadas_maq.items():
            fazenda_dest = Propriedade.query.get(dest_id)
            nome_fazenda = fazenda_dest.nome if fazenda_dest else "sua propriedade"
            avisos_turno.append(f"🚜 Guincho/Prancha: {qtd} máquina(s) chegaram no barracão de: {nome_fazenda}.")

        # ==========================================

        # 1. O Maestro chama a Agricultura
        MotorAgricultura.processar_lotes(lotes, dias, self.clima_atual, self.jogador, avisos_turno)

        # 2. O Maestro SEPARA os animais por tipo (🔥 AGORA INCLUI OVELHAS E CABRAS!)
        gados = [a for a in animais if a.raca.lower() in ['nelore', 'angus', 'guzera', 'brahman', 'girolando', 'cavalo', 'ovelha', 'cabra']]
        aves = [a for a in animais if a.raca.lower() in ['galinha', 'pato', 'peru']]
        suinos = [a for a in animais if a.raca.lower() in ['porco', 'leitao', 'javali']]
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
