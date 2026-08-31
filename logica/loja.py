from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

loja_bp = Blueprint('loja', __name__)

ITENS_ARMAZEM = [
    'sal', 'racao', 'adubo', 'veneno', 'combustivel', 
    'vacina_aftosa', 'vacina_brucelose', 'medicamento_geral', 
    'suplemento_engorda', 'racao_peixe'
]

ITENS_SILO_GRAOS = ['soja', 'milho', 'arroz', 'feijao']

ITENS_GALPAO = [
    'algodao', 'cana', 'mandioca', 'cafe', 'cacau', 'acai', 
    'cupuacu', 'pimenta', 'banana', 'abacaxi', 'melancia', 'tomate'
]

PRECOS_LOJA = {
    'sal': 25.0, 'racao': 40.0, 'adubo': 50.0, 'veneno': 80.0, 'combustivel': 150.0,
    'vacina_aftosa': 50.0, 'vacina_brucelose': 60.0, 'medicamento_geral': 30.0,
    'suplemento_engorda': 40.0, 'racao_peixe': 35.0,
    'soja': 350.0, 'milho': 200.0, 'arroz': 180.0, 'feijao': 250.0,
    'algodao': 400.0, 'mandioca': 150.0, 'tomate': 15.0, 'banana': 200.0,
    'cana': 300.0, 'cafe': 500.0, 'cacau': 600.0, 'acai': 450.0,
    'cupuacu': 400.0, 'pimenta': 300.0, 'melancia': 50.0, 'abacaxi': 250.0
}

# 🔥 A MÁGICA DA CONVERSÃO: 1 Saca/Muda na Loja = X Kg na Fazenda
CONVERSAO_KG = {
    'soja': 30, 'milho': 30, 'arroz': 20, 'feijao': 15,
    'algodao': 20, 'mandioca': 40, 'tomate': 2, 'banana': 35,
    'cana': 250, 'cafe': 15, 'cacau': 12, 'acai': 25,
    'cupuacu': 18, 'pimenta': 12, 'melancia': 10, 'abacaxi': 50
}

@loja_bp.route('/api/loja/comprar', methods=['POST'])
def comprar_item():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    dados = request.get_json()
    item_chave = dados.get('item') 
    fazenda_id = dados.get('fazenda_id')
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        if quantidade <= 0: return jsonify({'sucesso': False, 'erro': 'A quantidade deve ser maior que zero!'})
    except ValueError: return jsonify({'sucesso': False, 'erro': 'Valores numéricos corrompidos.'})
    
    nome_banco = item_chave.replace('sem_', '') 
    preco_unidade = PRECOS_LOJA.get(nome_banco, 99999.0)
    custo_total = quantidade * preco_unidade
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first() if fazenda_id else Propriedade.query.filter_by(dono_id=jogador.id).first()

    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    if jogador.saldo < custo_total: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente!'})

    try:
        # Aplica a conversão de Kg
        qtd_convertida = quantidade * CONVERSAO_KG.get(nome_banco, 1)

        if nome_banco in ITENS_ARMAZEM:
            total_atual = sum(getattr(fazenda, f'est_{i}', 0) for i in ITENS_ARMAZEM if hasattr(fazenda, f'est_{i}'))
            if (total_atual + qtd_convertida) > fazenda.cap_armazem:
                return jsonify({'sucesso': False, 'erro': f'Armazém lotado! Você só tem espaço para mais {fazenda.cap_armazem - total_atual} un.'})
                
        elif nome_banco in ITENS_SILO_GRAOS:
            total_silo = sum(getattr(fazenda, f'est_{i}', 0) for i in ITENS_SILO_GRAOS if hasattr(fazenda, f'est_{i}'))
            if (total_silo + qtd_convertida) > fazenda.cap_silo:
                return jsonify({'sucesso': False, 'erro': f'Silo cheio! Expanda-o primeiro!'})

        nome_coluna = f'est_{nome_banco}'
        estoque_atual = getattr(fazenda, nome_coluna)
        
        setattr(fazenda, nome_coluna, estoque_atual + qtd_convertida)
        jogador.saldo -= custo_total
        
        unidade_txt = "kg" if nome_banco in ITENS_SILO_GRAOS or nome_banco in ITENS_GALPAO else "un"
        db.session.add(Transacao(jogador_id=jogador.id, tipo='saida', valor=custo_total, descricao=f"Compra: {qtd_convertida}{unidade_txt} {nome_banco.capitalize()}"))
        
        if getattr(jogador, 'xp', None) is None: jogador.xp = 0
        jogador.xp += 10
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'Compra realizada! Foram entregues {qtd_convertida}{unidade_txt} no estoque.'})
        
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Erro na coluna do banco de dados!'})

@loja_bp.route('/api/loja/checkout_carrinho', methods=['POST'])
def checkout_carrinho():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    carrinho = dados.get('carrinho', [])
    fazenda_id = dados.get('fazenda_id') 

    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first() if fazenda_id else Propriedade.query.filter_by(dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    if not carrinho: return jsonify({'sucesso': False, 'erro': 'Seu carrinho está vazio!'})

    custo_total_carrinho = 0
    resumo_compra = []
    qtd_total_armazem = 0
    qtd_total_silo = 0

    for item in carrinho:
        qtd = int(item.get('quantidade', 0))
        chave = item.get('item', '').replace('sem_', '')
        preco_real = PRECOS_LOJA.get(chave, 99999.0)

        if qtd <= 0: return jsonify({'sucesso': False, 'erro': 'Valores inválidos.'})
        custo_total_carrinho += (qtd * preco_real)
        
        # Aplica a conversão para validar o espaço
        qtd_convertida = qtd * CONVERSAO_KG.get(chave, 1)
        
        if chave in ITENS_ARMAZEM: qtd_total_armazem += qtd_convertida
        elif chave in ITENS_SILO_GRAOS: qtd_total_silo += qtd_convertida

    if jogador.saldo < custo_total_carrinho:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Custa R$ {custo_total_carrinho:.2f}'})

    total_armazem = sum(getattr(fazenda, f'est_{i}', 0) for i in ITENS_ARMAZEM if hasattr(fazenda, f'est_{i}'))
    if (total_armazem + qtd_total_armazem) > fazenda.cap_armazem:
        return jsonify({'sucesso': False, 'erro': 'Espaço insuficiente no Armazém!'})

    total_silo = sum(getattr(fazenda, f'est_{i}', 0) for i in ITENS_SILO_GRAOS if hasattr(fazenda, f'est_{i}'))
    if (total_silo + qtd_total_silo) > fazenda.cap_silo:
        return jsonify({'sucesso': False, 'erro': 'Espaço insuficiente no Silo!'})

    for item in carrinho:
        chave = item.get('item', '').replace('sem_', '')
        qtd = int(item.get('quantidade', 0))
        qtd_convertida = qtd * CONVERSAO_KG.get(chave, 1)
        
        nome_coluna = f'est_{chave}'
        if hasattr(fazenda, nome_coluna):
            estoque_atual = getattr(fazenda, nome_coluna)
            setattr(fazenda, nome_coluna, estoque_atual + qtd_convertida)
            
            unidade_texto = "kg" if chave in ITENS_SILO_GRAOS or chave in ITENS_GALPAO else "un"
            resumo_compra.append(f"{qtd_convertida}{unidade_texto} {chave.capitalize()}")

    jogador.saldo -= custo_total_carrinho
    texto_desc = "Compra: " + ", ".join(resumo_compra)
    if len(texto_desc) > 200: texto_desc = texto_desc[:197] + "..." 

    db.session.add(Transacao(jogador_id=jogador.id, tipo='saida', valor=custo_total_carrinho, descricao=texto_desc))
    
    if getattr(jogador, 'xp', None) is None: jogador.xp = 0
    jogador.xp += (10 * len(carrinho))
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Compra realizada! Itens convertidos e armazenados com sucesso.'})
