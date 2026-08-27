from flask import Blueprint, session, request, jsonify
from sqlalchemy import func
from database import db, Jogador, Propriedade, Animal, TABELA_PRECOS, INFO_ESPECIES
from logica.economia import registrar_transacao
from logica.funcionarios import obter_bonus_equipe
import random

frigorifico_bp = Blueprint('frigorifico', __name__)

PRECOS_REAIS = {
    'bovino_corte': 250.0,
    'bovino_leite': 210.0,
    'equino': 150.0,
    'suino': 12.0,
    'ave': 8.0,
    'peixe': 15.0,
    'ovino': 20.0
}

class CotacaoMercado:
    @staticmethod
    def calcular_fator_dia(dia, mes, ano):
        semente = ano * 10000 + mes * 100 + dia
        rng = random.Random(semente)
        return round(rng.uniform(0.85, 1.15), 2)

    @classmethod
    def gerar_historico(cls, jogador, dias_retroativos=7):
        historico = []
        d = getattr(jogador, 'dia', 1)
        m = getattr(jogador, 'mes', 1)
        a = getattr(jogador, 'ano', 2026)
        
        for _ in range(dias_retroativos):
            historico.insert(0, {'label': f"{d:02d}/{m:02d}", 'fator': cls.calcular_fator_dia(d, m, a)})
            d -= 1
            if d <= 0:
                d = 30
                m -= 1
                if m <= 0:
                    m = 12
                    a -= 1
        return historico

@frigorifico_bp.route('/api/mercado/dados_grafico', methods=['POST'])
def dados_grafico_cotacao():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    raca_alvo = dados.get('raca', '').lower()

    historico = CotacaoMercado.gerar_historico(usuario, 7)
    
    familia_animal = 'bovino_corte'
    for f, d in INFO_ESPECIES.items():
        if raca_alvo in [r.lower() for r in d.get('racas', [])]:
            familia_animal = f
            break

    preco_base = PRECOS_REAIS.get(familia_animal, 200.0)
    unidade = '@' if familia_animal in ['bovino_corte', 'bovino_leite', 'equino'] else 'Kg'

    labels = [h['label'] for h in historico]
    valores = [round(preco_base * h['fator'], 2) for h in historico]

    return jsonify({'sucesso': True, 'labels': labels, 'valores': valores, 'unidade': unidade, 'raca': raca_alvo.capitalize(), 'fator_atual': historico[-1]['fator']})


# ==========================================
# NOVAS ROTAS COM SELEÇÃO POR CHECKBOX (IDs)
# ==========================================

@frigorifico_bp.route('/api/animal/estimar_frigorifico', methods=['POST'])
def estimar_frigorifico():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    animal_ids = dados.get('animal_ids', [])
    propriedade_id = dados.get('fazenda_id')
    
    prop = Propriedade.query.get(propriedade_id)
    if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False})

    if not animal_ids: 
        return jsonify({'sucesso': True, 'valor': 0, 'encontrados': 0, 'fator': 1.0})

    animais = Animal.query.filter(Animal.id.in_(animal_ids), Animal.propriedade_id == propriedade_id).all()
    if not animais: 
        return jsonify({'sucesso': True, 'valor': 0, 'encontrados': 0, 'fator': 1.0})
        
    fator = CotacaoMercado.calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    
    # 💰 INJEÇÃO DE RH: Bônus do Capataz na Estimativa
    bonus_rh = obter_bonus_equipe(prop.id)
    multiplicador_venda = bonus_rh.get('bonus_venda', 1.0)
    
    valor_total = 0

    for a in animais:
        raca_alvo = str(a.raca).lower()
        familia_animal = 'bovino_corte'
        for f, d in INFO_ESPECIES.items():
            if raca_alvo in [r.lower() for r in d.get('racas', [])]:
                familia_animal = f
                break

        preco_base = PRECOS_REAIS.get(familia_animal, 200.0)
        preco_cotacao = preco_base * fator 
        info_preco_db = TABELA_PRECOS.get(raca_alvo, {})
        fase_animal = str(a.fase).strip().lower()
        
        valor_animal_estimado = 0
        if fase_animal in ['filhote', 'jovem']:
            preco_cabeca = info_preco_db.get('filhote', 1100)
            valor_animal_estimado = preco_cabeca * fator
        else:
            if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
                valor_animal_estimado = (a.peso / 15.0) * preco_cotacao
            else:
                valor_animal_estimado = a.peso * preco_cotacao
                
        # Aplica o multiplicador do Capataz no animal
        valor_animal_estimado *= multiplicador_venda
        valor_total += valor_animal_estimado
            
    return jsonify({'sucesso': True, 'valor': valor_total, 'encontrados': len(animais), 'fator': fator})

@frigorifico_bp.route('/api/animal/vender_lote_curral', methods=['POST'])
def vender_lote_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    animal_ids = dados.get('animal_ids', [])
    propriedade_id = dados.get('fazenda_id')
         
    prop = Propriedade.query.get(propriedade_id)
    if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Esta fazenda não é sua.'})
    
    if not animal_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado para venda.'})
    
    animais = Animal.query.filter(Animal.id.in_(animal_ids), Animal.propriedade_id == propriedade_id).all()
    if not animais: 
        return jsonify({'sucesso': False, 'erro': 'Animais inválidos ou já vendidos.'})

    fator = CotacaoMercado.calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    
    # 💰 INJEÇÃO DE RH: Bônus do Capataz na Venda Real
    bonus_rh = obter_bonus_equipe(prop.id)
    multiplicador_venda = bonus_rh.get('bonus_venda', 1.0)
    
    msg_resumo = []
    valor_total = 0
    quantidade = len(animais)
    
    for a in animais:
        raca_alvo = str(a.raca).lower()
        familia_animal = 'bovino_corte'
        for f, d in INFO_ESPECIES.items():
            if raca_alvo in [r.lower() for r in d.get('racas', [])]:
                familia_animal = f
                break

        preco_base = PRECOS_REAIS.get(familia_animal, 200.0)
        preco_cotacao = preco_base * fator
        info_preco_db = TABELA_PRECOS.get(raca_alvo, {})

        fase_animal = str(a.fase).strip().lower()
        if fase_animal in ['filhote', 'jovem']:
            preco_cabeca = info_preco_db.get('filhote', 1100)
            valor_animal = preco_cabeca * fator
            msg_resumo.append("1 Cab (Reposição)")
        else:
            if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
                valor_animal = (a.peso / 15.0) * preco_cotacao
                msg_resumo.append(f"{(a.peso/15.0):.1f}@")
            else:
                valor_animal = a.peso * preco_cotacao
                msg_resumo.append(f"{a.peso:.1f}Kg")
                
        # Aplica o lucro extra do Capataz
        valor_animal *= multiplicador_venda
        valor_total += valor_animal
        db.session.delete(a)
        
    usuario.saldo += valor_total
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += (quantidade * 50)
    
    registrar_transacao(usuario.id, 'entrada', valor_total, f'Frigorífico ({quantidade}x Múltiplos) - Detalhes: {", ".join(msg_resumo)[:40]}...')
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Venda concluída! O mercado te pagou R$ {valor_total:,.2f}!'})

# ==========================================
# AS ROTAS INDIVIDUAIS CONTINUAM INTACTAS
# ==========================================

@frigorifico_bp.route('/api/animal/estimar_frigorifico_individual', methods=['POST'])
def estimar_frigorifico_individual():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    animal_id = dados.get('animal_id')
    
    animal = Animal.query.get(animal_id)
    if not animal:
        return jsonify({'sucesso': False, 'valor': 0})
        
    prop = Propriedade.query.get(animal.propriedade_id)
    if not prop or prop.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'valor': 0})
        
    raca_alvo = str(animal.raca).lower()
    familia_animal = 'bovino_corte'
    for f, d in INFO_ESPECIES.items():
        if raca_alvo in [r.lower() for r in d.get('racas', [])]:
            familia_animal = f
            break
            
    fator = CotacaoMercado.calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    preco_base = PRECOS_REAIS.get(familia_animal, 200.0)
    preco_cotacao = preco_base * fator
    
    info_preco_db = TABELA_PRECOS.get(raca_alvo, {})
    fase_animal = str(animal.fase).strip().lower()
    
    if fase_animal in ['filhote', 'jovem']:
        preco_cabeca = info_preco_db.get('filhote', 1100)
        valor_total = preco_cabeca * fator
    else:
        if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
            valor_total = (animal.peso / 15.0) * preco_cotacao
        else:
            valor_total = animal.peso * preco_cotacao

    # 🔥 APLICANDO O BÔNUS DO CAPATAZ (RH) NA ESTIMATIVA
    from logica.funcionarios import obter_bonus_equipe
    bonus_rh = obter_bonus_equipe(animal.propriedade_id)
    valor_total *= bonus_rh.get('bonus_venda', 1.0)
        
    return jsonify({'sucesso': True, 'valor': valor_total, 'fator': fator, 'raca': animal.raca.capitalize(), 'peso': animal.peso})


@frigorifico_bp.route('/api/animal/vender_individual_curral', methods=['POST'])
def vender_individual_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    animal_id = dados.get('animal_id')
    
    animal = Animal.query.get(animal_id)
    if not animal:
        return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
        
    prop = Propriedade.query.get(animal.propriedade_id)
    if not prop or prop.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Este animal não pertence a você.'})
        
    raca_alvo = str(animal.raca).lower()
    familia_animal = 'bovino_corte'
    for f, d in INFO_ESPECIES.items():
        if raca_alvo in [r.lower() for r in d.get('racas', [])]:
            familia_animal = f
            break
            
    fator = CotacaoMercado.calcular_fator_dia(usuario.dia, mes=usuario.mes, ano=usuario.ano)
    preco_base = PRECOS_REAIS.get(familia_animal, 200.0)
    preco_cotacao = preco_base * fator
    
    info_preco_db = TABELA_PRECOS.get(raca_alvo, {})
    fase_animal = str(animal.fase).strip().lower()
    
    if fase_animal in ['filhote', 'jovem']:
        preco_cabeca = info_preco_db.get('filhote', 1100)
        valor_animal = preco_cabeca * fator
        resumo = f"1 Cab (Reposição, {animal.peso} Kg)"
    else:
        if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
            valor_animal = (animal.peso / 15.0) * preco_cotacao
            resumo = f"{(animal.peso/15.0):.1f}@"
        else:
            valor_animal = animal.peso * preco_cotacao
            resumo = f"{animal.peso:.1f}Kg"

    # 🔥 APLICANDO O BÔNUS DO CAPATAZ (RH) NA VENDA REAL
    from logica.funcionarios import obter_bonus_equipe
    bonus_rh = obter_bonus_equipe(animal.propriedade_id)
    valor_animal *= bonus_rh.get('bonus_venda', 1.0)
            
    usuario.saldo += valor_animal
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 50
    
    registrar_transacao(usuario.id, 'entrada', valor_animal, f'Frigorífico (1x {raca_alvo.capitalize()} ID #{animal.id}) - Detalhes: {resumo}')
    
    db.session.delete(animal)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Venda concluída! O mercado te pagou R$ {valor_animal:,.2f}!'})
