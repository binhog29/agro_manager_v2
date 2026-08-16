from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Lote, Transacao
from logica.economia import registrar_transacao

cultivo_bp = Blueprint('cultivo', __name__)

# =======================================================
# ARQUITETURA OOP: O "DNA" DE CADA PLANTA
# =======================================================
class CultivoBase:
    def __init__(self, nome, ciclo, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita):
        self.nome = nome
        self.ciclo = ciclo # 'temporario' (morre após colher) ou 'perene' (rebrota/continua)
        self.custo_semente = custo_semente
        self.producao_kg = producao_kg
        self.tempo_colheita = tempo_colheita # em dias reais de jogo
        self.preparo_exigido = preparo_exigido # 'arado' ou 'coveado'
        self.custo_maquina_plantio = custo_maquina_plantio
        self.custo_maquina_colheita = custo_maquina_colheita

# Catálogo oficial integrando os itens da sua loja e do silo
CATALOGO_CULTIVOS = {
    # GRÃOS E CEREAIS (Plantio Direto/Arado - Morrem após colher)
    'soja': CultivoBase('Soja', 'temporario', 350, 3600, 100, 'arado', 300, 500),
    'milho': CultivoBase('Milho', 'temporario', 200, 6000, 90, 'arado', 300, 500),
    'arroz': CultivoBase('Arroz', 'temporario', 180, 4200, 110, 'arado', 300, 500),
    'feijao': CultivoBase('Feijão', 'temporario', 250, 2000, 80, 'arado', 300, 500),
    'algodao': CultivoBase('Algodão', 'temporario', 400, 3000, 150, 'arado', 400, 700),
    'cana': CultivoBase('Cana-de-Açúcar', 'perene', 300, 80000, 360, 'arado', 300, 600), 
    'mandioca': CultivoBase('Mandioca', 'temporario', 150, 20000, 240, 'arado', 100, 200),
    'tomate': CultivoBase('Tomate', 'temporario', 15, 6000, 90, 'arado', 100, 150),
    
    # POMARES E FRUTAS (Covas - Perenes, continuam vivos após a colheita)
    'cafe': CultivoBase('Café Clonal', 'perene', 500, 4000, 365, 'coveado', 150, 300), 
    'cacau': CultivoBase('Cacau', 'perene', 600, 1500, 500, 'coveado', 150, 200),
    'acai': CultivoBase('Açaí', 'perene', 450, 5000, 730, 'coveado', 150, 200),
    'cupuacu': CultivoBase('Cupuaçu', 'perene', 400, 2000, 730, 'coveado', 150, 200),
    'banana': CultivoBase('Banana', 'perene', 200, 15000, 300, 'coveado', 100, 150),
    'abacaxi': CultivoBase('Abacaxi', 'temporario', 250, 25000, 400, 'coveado', 100, 150),
    'melancia': CultivoBase('Melancia', 'temporario', 50, 15000, 85, 'coveado', 100, 150),
    'pimenta': CultivoBase('Pimenta', 'perene', 300, 2500, 120, 'coveado', 100, 150)
}

@cultivo_bp.route('/api/cultivo/detalhes', methods=['GET'])
def detalhes_cultivo():
    lote_id = request.args.get('lote_id')
    lote = Lote.query.get(lote_id)
    if not lote: return jsonify({'sucesso': False})
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    
    return jsonify({
        'sucesso': True,
        'fertilidade': getattr(lote, 'fertilidade_solo', 100),
        'pragas': getattr(lote, 'nivel_pragas', 0),
        'produtividade': getattr(lote, 'produtividade_atual', 100),
        'est_adubo': getattr(fazenda, 'est_adubo', 0),
        'est_veneno': getattr(fazenda, 'est_veneno', 0)
    })

@cultivo_bp.route('/api/cultivo/plantar', methods=['POST'])
def plantar():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    tipo = dados.get('tipo_cultivo')

    if tipo not in CATALOGO_CULTIVOS: 
        return jsonify({'sucesso': False, 'erro': 'Semente não cadastrada no catálogo.'})
    
    dna_planta = CATALOGO_CULTIVOS[tipo]

    if lote.status != dna_planta.preparo_exigido:
        prep_nome = "Arada (Trator)" if dna_planta.preparo_exigido == 'arado' else "com Covas Abertas"
        return jsonify({'sucesso': False, 'erro': f'Esta cultura exige que a terra esteja {prep_nome}.'})

    custo_total = dna_planta.custo_semente + dna_planta.custo_maquina_plantio

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custo: R$ {custo_total} (Mudas/Sementes + Maquinário)'})

    usuario.saldo -= custo_total
    
    lote.status = 'plantado'
    lote.tipo_cultivo = tipo
    lote.dias_plantado = 0
    lote.produtividade_atual = 100
    lote.nivel_pragas = 0
    # Plantar consome nutrientes iniciais
    lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 20)

    registrar_transacao(usuario.id, 'saida', custo_total, f'Plantio de {dna_planta.nome} ({lote.nome})')
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{dna_planta.nome} plantado com sucesso!'})

@cultivo_bp.route('/api/cultivo/manejo', methods=['POST'])
def manejo_lavoura():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    acao = dados.get('acao') 

    if not lote or lote.status not in ['plantado', 'colhendo']:
        return jsonify({'sucesso': False, 'erro': 'Lote inválido para manejo.'})

    if acao == 'adubar':
        if getattr(fazenda, 'est_adubo', 0) < 1:
            return jsonify({'sucesso': False, 'erro': 'Sem Adubo no armazém!'})
        if getattr(lote, 'fertilidade_solo', 100) >= 100:
            return jsonify({'sucesso': False, 'erro': 'O solo já está com 100% de fertilidade!'})
            
        fazenda.est_adubo -= 1
        lote.fertilidade_solo = min(100, getattr(lote, 'fertilidade_solo', 100) + 40)
        msg = "Adubo aplicado! Fertilidade do solo aumentada."

    elif acao == 'pulverizar':
        if getattr(fazenda, 'est_veneno', 0) < 1:
            return jsonify({'sucesso': False, 'erro': 'Sem Defensivos no armazém!'})
        if getattr(lote, 'nivel_pragas', 0) == 0:
            return jsonify({'sucesso': False, 'erro': 'A lavoura não tem pragas no momento!'})
            
        fazenda.est_veneno -= 1
        lote.nivel_pragas = 0
        msg = "Lavoura pulverizada! Pragas eliminadas."
    else:
        return jsonify({'sucesso': False, 'erro': 'Manejo inválido.'})

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@cultivo_bp.route('/api/cultivo/colher', methods=['POST'])
def colher():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))

    if not lote or lote.status != 'colhendo': 
        return jsonify({'sucesso': False, 'erro': 'A lavoura não está no ponto de colheita.'})

    tipo = lote.tipo_cultivo
    dna_planta = CATALOGO_CULTIVOS.get(tipo)
    custo_colheita = dna_planta.custo_maquina_colheita

    if usuario.saldo < custo_colheita:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para a Colheita (R$ {custo_colheita}).'})

    produtividade = getattr(lote, 'produtividade_atual', 100)
    kg_colhidos = int(dna_planta.producao_kg * (produtividade / 100.0))

    # =================================================================
    # AJUSTE CIRÚRGICO: LISTA DE VENDA DIRETA (Não vão para o Silo)
    # =================================================================
    PRECOS_VENDA_DIRETA = {
        'tomate': 4.50,
        'melancia': 2.00,
        'mandioca': 1.50,
        'banana': 2.50,
        'abacaxi': 3.00
    }

    if tipo in PRECOS_VENDA_DIRETA:
        # Vende direto na roça (CEASA)
        valor_venda = kg_colhidos * PRECOS_VENDA_DIRETA[tipo]
        usuario.saldo += valor_venda
        registrar_transacao(usuario.id, 'entrada', valor_venda, f'Venda Direta na Roça ({dna_planta.nome})')
        msg_final = f'Colheita Expressa! {kg_colhidos} kg de {dna_planta.nome} vendidos por R$ {valor_venda:,.2f}!'
    else:
        # Grãos e culturas de estocagem vão para o Silo normalmente
        coluna_silo = f'est_{tipo}'
        try:
            estoque_atual = getattr(fazenda, coluna_silo, 0)
            setattr(fazenda, coluna_silo, estoque_atual + kg_colhidos)
        except AttributeError:
            return jsonify({'sucesso': False, 'erro': 'Este item ainda não tem espaço configurado no Silo.'})
        msg_final = f'Colheita finalizada! {kg_colhidos} kg de {dna_planta.nome} foram para o Silo.'
    # =================================================================

    usuario.saldo -= custo_colheita
    
    # OOP EM AÇÃO: Verifica o Ciclo da Planta!
    if dna_planta.ciclo == 'perene':
        lote.status = 'plantado'
        lote.dias_plantado = int(dna_planta.tempo_colheita * 0.4) 
        lote.produtividade_atual = 100 
    else:
        lote.status = 'limpo'
        lote.tipo_cultivo = None

    lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 30)
    registrar_transacao(usuario.id, 'saida', custo_colheita, f'Custos de Colheita ({lote.nome})')
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': msg_final})

@cultivo_bp.route('/api/cultivo/abandonar', methods=['POST'])
def abandonar_terra():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    if lote:
        lote.status = 'mato'
        lote.tipo_cultivo = None
        lote.fase_planta = None
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': 'A terra foi abandonada e o mato tomou conta.'})
    return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})
