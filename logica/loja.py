from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

loja_bp = Blueprint('loja', __name__)

@loja_bp.route('/api/loja/comprar', methods=['POST'])
def comprar_item():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item') 
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        preco_unidade = float(dados.get('preco', 0))
        
        if quantidade <= 0:
            return jsonify({'sucesso': False, 'erro': 'A quantidade deve ser maior que zero!'})
        if preco_unidade < 0:
            return jsonify({'sucesso': False, 'erro': 'Preço inválido detectado!'})
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Valores numéricos corrompidos.'})
    
    nome_banco = item_chave.replace('sem_', '') 
    custo_total = quantidade * preco_unidade
    usuario_sessao = session['usuario']
    
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    if not jogador:
        jogador = Jogador.query.get(usuario_sessao)

    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()

    if jogador.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente!'})

    try:
        # 🔥 Ração de peixe incluída corretamente nos itens do armazém
        itens_armazem = [
            'sal', 'racao', 'adubo', 'veneno', 'combustivel', 
            'vacina_aftosa', 'vacina_brucelose', 'medicamento_geral', 
            'suplemento_engorda', 'racao_peixe'
        ]
        itens_silo_graos = ['soja', 'milho', 'arroz', 'feijao'] 
        itens_galpao = ['algodao', 'cana', 'mandioca', 'cafe', 'cacau', 'acai', 'cupuacu', 'pimenta', 'banana', 'abacaxi', 'melancia']
        
        if nome_banco in itens_armazem:
            total_atual = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_armazem if hasattr(fazenda, f'est_{i}'))
            if (total_atual + quantidade) > fazenda.cap_armazem:
                espaco_livre = fazenda.cap_armazem - total_atual
                return jsonify({'sucesso': False, 'erro': f'Armazém lotado! Você só tem espaço livre para mais {espaco_livre} un.'})
                
        elif nome_banco in itens_silo_graos:
            total_silo = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_silo_graos if hasattr(fazenda, f'est_{i}'))
            if (total_silo + quantidade) > fazenda.cap_silo:
                espaco_livre = fazenda.cap_silo - total_silo
                return jsonify({'sucesso': False, 'erro': f'Silo de Grãos cheio! Você só tem {espaco_livre} kg de espaço. Expanda-o primeiro!'})

        nome_coluna = f'est_{nome_banco}'
        estoque_atual = getattr(fazenda, nome_coluna)
        
        setattr(fazenda, nome_coluna, estoque_atual + quantidade)
        jogador.saldo -= custo_total
        
        nova_transacao = Transacao(
            jogador_id=jogador.id,
            tipo='saida',
            valor=custo_total,
            descricao=f"Compra na loja: {quantidade}x {nome_banco.capitalize()}"
        )
        db.session.add(nova_transacao)
        
        if getattr(jogador, 'xp', None) is None:
            jogador.xp = 0
        jogador.xp += 10
        
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'Compra realizada com sucesso!'})
        
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': f'A coluna {nome_coluna} não existe no banco de dados!'})

@loja_bp.route('/api/loja/checkout_carrinho', methods=['POST'])
def checkout_carrinho():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    usuario_sessao = session['usuario']
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()

    dados = request.get_json()
    carrinho = dados.get('carrinho', [])

    if not carrinho:
        return jsonify({'sucesso': False, 'erro': 'Seu carrinho está vazio!'})

    custo_total_carrinho = 0
    resumo_compra = []

    itens_armazem = [
        'sal', 'racao', 'adubo', 'veneno', 'combustivel', 
        'vacina_aftosa', 'vacina_brucelose', 'medicamento_geral', 
        'suplemento_engorda', 'racao_peixe'
    ]
    itens_silo_graos = ['soja', 'milho', 'arroz', 'feijao']

    qtd_total_armazem = 0
    qtd_total_silo = 0

    for item in carrinho:
        try:
            qtd = int(item.get('quantidade', 0))
            preco = float(item.get('preco', 0))
        except ValueError:
            return jsonify({'sucesso': False, 'erro': 'Dados numéricos corrompidos.'})

        chave = item.get('item', '').replace('sem_', '')

        if qtd <= 0 or preco < 0:
            return jsonify({'sucesso': False, 'erro': 'Valores inválidos no carrinho.'})

        custo_total_carrinho += (qtd * preco)
        
        if chave in itens_armazem:
            qtd_total_armazem += qtd
        elif chave in itens_silo_graos:
            qtd_total_silo += qtd

    if jogador.saldo < custo_total_carrinho:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Sua compra custa R$ {custo_total_carrinho:.2f}'})

    total_atual_armazem = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_armazem if hasattr(fazenda, f'est_{i}'))
    if (total_atual_armazem + qtd_total_armazem) > fazenda.cap_armazem:
        return jsonify({'sucesso': False, 'erro': 'Você não tem espaço no Armazém para todos esses insumos!'})

    total_atual_silo = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_silo_graos if hasattr(fazenda, f'est_{i}'))
    if (total_atual_silo + qtd_total_silo) > fazenda.cap_silo:
        return jsonify({'sucesso': False, 'erro': 'Você não tem espaço no Silo para todas essas sementes!'})

    for item in carrinho:
        chave = item.get('item', '').replace('sem_', '')
        qtd = int(item.get('quantidade', 0))
        
        nome_coluna = f'est_{chave}'
        if hasattr(fazenda, nome_coluna):
            estoque_atual = getattr(fazenda, nome_coluna)
            setattr(fazenda, nome_coluna, estoque_atual + qtd)
            resumo_compra.append(f"{qtd}x {chave.capitalize()}")

    jogador.saldo -= custo_total_carrinho
    
    texto_desc = "Compra Múltipla: " + ", ".join(resumo_compra)
    if len(texto_desc) > 200: texto_desc = texto_desc[:197] + "..." 

    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='saida',
        valor=custo_total_carrinho,
        descricao=texto_desc
    )
    db.session.add(nova_transacao)
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += (10 * len(carrinho))
    
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Sua compra de R$ {custo_total_carrinho:.2f} foi entregue na fazenda!'})
