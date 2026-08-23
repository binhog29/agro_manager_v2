from database import db, HistoricoMorte, Propriedade

class EspecieSuino:
    def __init__(self, nome, taxa_crescimento_dia, consumo_racao_dia):
        self.nome = nome
        self.taxa_crescimento_dia = taxa_crescimento_dia
        self.consumo_racao_dia = consumo_racao_dia

    def processar_biologia(self, porco, dias, ambiente, avisos_turno):
        tem_racao = ambiente.get('tem_racao', False)
        
        if tem_racao:
            porco.peso += (self.taxa_crescimento_dia * dias)
            porco.fome = max(0, porco.fome - (40 * dias))
            porco.saude = min(100, porco.saude + (10 * dias))
        else:
            porco.fome += (25 * dias)
            porco.peso = max(0.5, porco.peso - (self.taxa_crescimento_dia * 0.8 * dias))
            
            if porco.fome >= 100:
                porco.saude -= (20 * dias)
                
        if porco.saude <= 0:
            avisos_turno.append(f"💀 Lote de {self.nome} (ID #{porco.id}) morreu no chiqueiro de fome!")
            db.session.add(HistoricoMorte(propriedade_id=porco.propriedade_id, raca=porco.raca, fase=porco.fase, causa="Fome extrema (Chiqueiro)"))
            db.session.delete(porco)

CATALOGO_SUINOS = {
    'porco': EspecieSuino('Porco Caipira', 0.8, 2.0),
    'leitao': EspecieSuino('Leitão', 0.4, 1.0)
}

class MotorSuinocultura:
    @staticmethod
    def processar_porcos(animais_chiqueiro, dias, avisos_turno):
        for porco in animais_chiqueiro:
            dna = CATALOGO_SUINOS.get(porco.raca.lower())
            if not dna: continue
                
            fazenda = Propriedade.query.get(porco.propriedade_id)
            consumo_necessario = dna.consumo_racao_dia * dias
            
            # Checa o estoque da fazenda (futuramente est_racao_suino)
            tem_racao = False
            if getattr(fazenda, 'est_racao', 0) >= consumo_necessario:
                tem_racao = True
                fazenda.est_racao -= consumo_necessario
                
            ambiente = {'tem_racao': tem_racao}
            dna.processar_biologia(porco, dias, ambiente, avisos_turno)
