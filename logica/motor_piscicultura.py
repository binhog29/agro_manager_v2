# logica/motor_piscicultura.py
from database import db, Propriedade, HistoricoMorte
from logica.funcionarios import obter_bonus_equipe # 🔥 IMPORTANDO O RH

class MotorPiscicultura:
    # ==========================================
    # ⚙️ PAINEL DE CONFIGURAÇÃO - PISCICULTURA
    # ==========================================
    CONFIG_PEIXES = {
        'tambaqui': {'crescimento': 0.015, 'consumo': 0.05},
        'pintado':  {'crescimento': 0.020, 'consumo': 0.08},
        'tilapia':  {'crescimento': 0.010, 'consumo': 0.04},
        'pirarucu': {'crescimento': 0.030, 'consumo': 0.10}
    }
    
    AUMENTO_FOME_DIA = 20.0
    QUEDA_SAUDE_FOME_DIA = 15.0
    RECUPERACAO_SAUDE_DIA = 10.0
    # ==========================================
    
    @staticmethod
    def processar_animais(animais_represa, dias, avisos_turno):
        if not animais_represa:
            return
            
        fazenda = Propriedade.query.get(animais_represa[0].propriedade_id)
        if not fazenda:
            return
            
        cache_bonus_rh = {} 

        # 1. Calcula o consumo total de todos os peixes juntos para o período
        consumo_total = 0.0
        config_por_peixe = {}
        for peixe in animais_represa:
            raca = peixe.raca.lower()
            config = MotorPiscicultura.CONFIG_PEIXES.get(raca, {'crescimento': 0.01, 'consumo': 0.05})
            config_por_peixe[peixe.id] = config
            consumo_total += config['consumo'] * dias

        # 2. Desconta do comedouro coletivo uma única vez
        qtd_comedouro = getattr(fazenda, 'represa_qtd_racao', 0.0)
        tem_racao_geral = False
        
        if qtd_comedouro >= consumo_total:
            tem_racao_geral = True
            fazenda.represa_qtd_racao -= consumo_total
        else:
            if qtd_comedouro > 0:
                fazenda.represa_qtd_racao = 0.0
            tem_racao_geral = False

        # 3. Aplica o efeito no peso e fome de cada peixe
        for peixe in animais_represa:
            config = config_por_peixe[peixe.id]
            
            if peixe.propriedade_id not in cache_bonus_rh:
                cache_bonus_rh[peixe.propriedade_id] = obter_bonus_equipe(peixe.propriedade_id)
            bonus_rh = cache_bonus_rh[peixe.propriedade_id]

            peso_anterior = float(peixe.peso or 0.0)
            
            if tem_racao_geral:
                peixe.peso = peso_anterior + (config['crescimento'] * dias)
                peixe.fome = max(0.0, float(peixe.fome or 0) - (40.0 * dias))
                peixe.saude = min(100.0, float(peixe.saude or 100) + (MotorPiscicultura.RECUPERACAO_SAUDE_DIA * dias))
            else:
                peixe.fome = min(100.0, float(peixe.fome or 0) + (MotorPiscicultura.AUMENTO_FOME_DIA * dias))
                
                perda_peso = config['crescimento'] * 0.5 * dias
                if bonus_rh.get('protecao_animal', False):
                    perda_peso *= 0.2
                peixe.peso = max(0.1, peso_anterior - perda_peso)
                
                if peixe.fome >= 100.0:
                    queda_saude = MotorPiscicultura.QUEDA_SAUDE_FOME_DIA * dias
                    if bonus_rh.get('reduz_doencas', False):
                        queda_saude *= 0.1
                    peixe.saude = max(0.0, float(peixe.saude or 100) - queda_saude)
                    
            if peixe.saude <= 0:
                causa = "Fome/Falta de oxigenação na Represa"
                avisos_turno.append(f"💀 Lote de {peixe.raca.capitalize()} (ID #{peixe.id}) morreu na represa! Causa: {causa}.")
                db.session.add(HistoricoMorte(propriedade_id=peixe.propriedade_id, raca=peixe.raca, fase=peixe.fase, causa=causa))
                db.session.delete(peixe)
