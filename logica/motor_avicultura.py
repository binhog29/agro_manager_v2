from database import db, HistoricoMorte, Propriedade

class EspecieAve:
    def __init__(self, nome, taxa_crescimento_dia, consumo_racao_dia):
        self.nome = nome
        self.taxa_crescimento_dia = taxa_crescimento_dia
        self.consumo_racao_dia = consumo_racao_dia

    def processar_biologia(self, ave, dias, ambiente, avisos_turno):
        tem_racao = ambiente.get('tem_racao', False)
        
        if tem_racao:
            ave.peso += (self.taxa_crescimento_dia * dias)
            ave.fome = max(0, ave.fome - (50 * dias))
            ave.saude = min(100, ave.saude + (10 * dias))
        else:
            ave.fome += (30 * dias)
            ave.peso = max(0.1, ave.peso - (self.taxa_crescimento_dia * 0.5 * dias))
            
            if ave.fome >= 100:
                ave.saude -= (25 * dias) # Aves morrem mais rápido de fome
                
        if ave.saude <= 0:
            avisos_turno.append(f"💀 Lote de {self.nome} (ID #{ave.id}) morreu no galinheiro por desnutrição!")
            db.session.add(HistoricoMorte(propriedade_id=ave.propriedade_id, raca=ave.raca, fase=ave.fase, causa="Fome extrema (Galinheiro)"))
            db.session.delete(ave)

CATALOGO_AVES = {
    'galinha': EspecieAve('Galinha Caipira', 0.05, 0.1),
    'frango_corte': EspecieAve('Frango de Corte', 0.08, 0.15)
}

class MotorAvicultura:
    @staticmethod
    def processar_aves(animais_galinheiro, dias, avisos_turno):
        for ave in animais_galinheiro:
            dna = CATALOGO_AVES.get(ave.raca.lower())
            if not dna: continue
                
            fazenda = Propriedade.query.get(ave.propriedade_id)
            consumo_necessario = dna.consumo_racao_dia * dias
            
            # Checa o estoque da fazenda (futuramente est_racao_ave)
            tem_racao = False
            if getattr(fazenda, 'est_racao', 0) >= consumo_necessario:
                tem_racao = True
                fazenda.est_racao -= consumo_necessario
                
            ambiente = {'tem_racao': tem_racao}
            dna.processar_biologia(ave, dias, ambiente, avisos_turno)
