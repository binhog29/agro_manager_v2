from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

armazem_bp = Blueprint('armazem', __name__)

# TABELA DE PREÇOS DE VENDA DOS INSUMOS
# 🔥 CORREÇÃO: Os preços de venda agora são exatamente 50% do valor pago na Loja. Fim do dinheiro infinito!
PRECOS_VENDA_INSUMO = {
    'sal': 12.50,
    'racao': 20.0,
    'adubo': 25.0,
    'veneno': 40.0,
    'combustivel': 75.0,
    'vacina_aftosa': 25.0,
    'vacina_brucelose': 30.0,
    'medicamento_geral': 15.0,
    'suplemento_engorda': 20.0,
    'racao_peixe': 17.50
}

@armazem_bp.route('/api/armazem/vender', methods=['POST'])
def vender_insumo():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item')
    quantidade_venda = int(dados.get('quantidade', 0))

    if quantidade_venda <= 0:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})

    preco_unidade = PRECOS_VENDA_INSUMO.get(item_chave, 10)
    valor_total = quantidade_venda * preco_unidade

    usuario_sessao = session['usuario']
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    if not jogador:
        jogador = Jogador.query.get(usuario_sessao)

    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    nome_coluna = f'est_{item_chave}'
    
    try:
        estoque_atual = getattr(fazenda, nome_coluna)
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Erro no banco de dados.'})

    if estoque_atual < quantidade_venda:
        return jsonify({'sucesso': False, 'erro': f'Você não tem essa quantidade toda no armazém!'})

    # Desconta o estoque e adiciona o saldo
    setattr(fazenda, nome_coluna, estoque_atual - quantidade_venda)
    jogador.saldo += valor_total

    # Registra no fluxo de caixa
    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='entrada',
        valor=valor_total,
        descricao=f"Venda de Armazém: {quantidade_venda}x {item_chave.replace('_', ' ').capitalize()}"
    )
    db.session.add(nova_transacao)
    
    # 🔥 Trava de Segurança e Ganho de XP pela Venda
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Venda de {quantidade_venda}x gerou R$ {valor_total:.2f}!'})

@armazem_bp.route('/api/armazem/expandir', methods=['POST'])
def expandir_armazem():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json() or {}
    fazenda_id = dados.get('fazenda_id')
    pacote = dados.get('pacote', 'pequeno') # Descobre qual o pacote escolhido

    # Tabela de pacotes de expansão do Armazém
    PACOTES_OBRA_ARMAZEM = {
        'pequeno': {'custo': 4000, 'capacidade': 300},
        'medio': {'custo': 35000, 'capacidade': 3500},
        'grande': {'custo': 300000, 'capacidade': 35000},
        'gigante': {'custo': 2500000, 'capacidade': 300000}
    }

    if pacote not in PACOTES_OBRA_ARMAZEM:
        return jsonify({'sucesso': False, 'erro': 'Pacote de obra inválido.'})

    CUSTO_EXPANSAO = PACOTES_OBRA_ARMAZEM[pacote]['custo']
    AUMENTO_CAPACIDADE = PACOTES_OBRA_ARMAZEM[pacote]['capacidade']

    usuario_sessao = session['usuario']
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    if not jogador:
        jogador = Jogador.query.get(usuario_sessao)

    if fazenda_id:
        fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    else:
        fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()

    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    if jogador.saldo < CUSTO_EXPANSAO:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. A obra custa R$ {CUSTO_EXPANSAO:,.2f}.'})

    jogador.saldo -= CUSTO_EXPANSAO
    fazenda.cap_armazem += AUMENTO_CAPACIDADE

    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='saida',
        valor=CUSTO_EXPANSAO,
        descricao=f"Obra: Expansão do Armazém (+{AUMENTO_CAPACIDADE} un)"
    )
    db.session.add(nova_transacao)
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Obras finalizadas! O Armazém ganhou +{AUMENTO_CAPACIDADE:,.0f} un de capacidade.'})

# ==========================================
# ROTA EXCLUSIVA: LATICÍNIOS E DERIVADOS
# ==========================================
@armazem_bp.route('/api/armazem/vender_derivados', methods=['POST'])
def vender_derivados():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    produto = dados.get('produto') # Espera 'leite' ou 'ovos'
    quantidade = float(dados.get('quantidade', 0))
    fazenda_id = dados.get('fazenda_id')

    if quantidade <= 0:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})

    # Tabela de preços base dos derivados
    precos = {
        'leite': 2.50, # R$ 2,50 por Litro
        'ovos': 0.50   # R$ 0,50 por Ovo
    } 
    
    if produto not in precos:
        return jsonify({'sucesso': False, 'erro': 'Produto inválido.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    # Busca a fazenda de forma segura
    if fazenda_id:
        fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    else:
        fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()

    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    nome_coluna = f'est_{produto}'
    estoque_atual = float(getattr(fazenda, nome_coluna, 0.0))

    if estoque_atual < quantidade:
        return jsonify({'sucesso': False, 'erro': f'Estoque insuficiente de {produto}!'})

    # 💰 INJEÇÃO DE RH: Bônus do Capataz
    from logica.funcionarios import obter_bonus_equipe
    bonus_rh = obter_bonus_equipe(fazenda.id)
    multiplicador_venda = bonus_rh.get('bonus_venda', 1.0)

    # Calcula o valor total com o lucro extra
    valor_total = (quantidade * precos[produto]) * multiplicador_venda

    # Desconta do estoque e paga o jogador
    setattr(fazenda, nome_coluna, estoque_atual - quantidade)
    usuario.saldo += valor_total

    from logica.economia import registrar_transacao
    registrar_transacao(usuario.id, 'entrada', valor_total, f'Venda de Derivados: {quantidade}x {produto.capitalize()}')

    # Ganho de XP seguro
    if getattr(usuario, 'xp', None) is None: 
        usuario.xp = 0
    usuario.xp += 5

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Venda de {produto} rendeu R$ {valor_total:,.2f}!'})
