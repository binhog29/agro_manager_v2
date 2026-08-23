# logica/motor_piscicultura.py
from database import db, Animal, Propriedade, HistoricoMorte
import random

# =======================================================
# ARQUITETURA OOP: BIOLOGIA DOS PEIXES
# =======================================================
class EspecieAquatica:
    def __init__(self, nome, taxa_crescimento_dia, consumo_racao_dia, tipo_racao_ideal):
        self.nome = nome
        self.taxa_crescimento_dia = taxa_crescimento_dia
        self.consumo_racao_dia = consumo_racao_dia
        self.tipo_racao_ideal = tipo_racao_ideal

    def processar_biologia(self, peixe, dias, ambiente, avisos_turno):
        tem_racao = ambiente.get('tem_racao', False)
        
        if tem_racao:
            peixe.peso += (self.taxa_crescimento_dia * dias)
            peixe.fome = max(0, peixe.fome - (40 * dias))
            peixe.saude = min(100, peixe.saude + (10 * dias))
        else:
            peixe.fome += (20 * dias)
            peixe.peso = max(0.1, peixe.peso - (self.taxa_crescimento_dia * 0.5 * dias))
            
            if peixe.fome >= 100:
                peixe.saude -= (15 * dias)
                
        if peixe.saude <= 0:
            causa = "Fome/Falta de oxigenação na Represa"
            avisos_turno.append(f"💀 Lote de {self.nome} (ID #{peixe.id}) morreu na represa! Causa: {causa}.")
            db.session.add(HistoricoMorte(propriedade_id=peixe.propriedade_id, raca=peixe.raca, fase=peixe.fase, causa=causa))
            db.session.delete(peixe)

CATALOGO_PEIXES = {
    'tambaqui': EspecieAquatica('Tambaqui', 0.015, 0.05, 'racao_peixe'),
    'pintado': EspecieAquatica('Pintado', 0.020, 0.08, 'racao_peixe_carnivoro'),
    'tilapia': EspecieAquatica('Tilápia', 0.010, 0.04, 'racao_peixe')
}

class MotorPiscicultura:
    @staticmethod
    def processar_peixes(animais_represa, dias, avisos_turno):
        """ Processa apenas os animais que estão na represa """
        for peixe in animais_represa:
            dna = CATALOGO_PEIXES.get(peixe.raca.lower())
            if not dna:
                continue 
                
            # 🔥 CORREÇÃO: Puxa a fazenda correta do banco de dados aqui dentro
            fazenda = Propriedade.query.get(peixe.propriedade_id)
            consumo_necessario = dna.consumo_racao_dia * dias
            tem_racao = False
            
            if getattr(fazenda, 'est_racao', 0) >= consumo_necessario:
                tem_racao = True
                fazenda.est_racao -= consumo_necessario
                
            ambiente = {'tem_racao': tem_racao}
            dna.processar_biologia(peixe, dias, ambiente, avisos_turno)
