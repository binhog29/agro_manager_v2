from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao
from logica.funcionarios import obter_bonus_equipe

silo_bp = Blueprint('silo', __name__)

PRECOS_VENDA = {
    'milho': 5.00, 'soja': 8.50, 'arroz': 7.00, 'feijao': 12.00, 'algodao': 15.00,
    'mandioca': 2.50, 'cana': 0.80, 'tomate': 5.50, 'banana': 4.00, 'abacaxi': 3.50,
    'melancia': 3.00, 'pimenta': 18.00, 'cacau': 35.00, 'acai': 14.00, 'cupuacu': 16.00, 'cafe': 25.00
}

@silo_bp.route('/api/silo/vender', methods=['POST'])
def vender_grao():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item') 
    quantidade_venda = int(dados.get('quantidade', 0))
    fazenda_id = dados.get('fazenda_id') 

    if quantidade_venda <= 0:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})

    usuario_sessao = session['usuario']
    
    # 🔥 BLINDAGEM: with_for_update enfileira requisições, barrando scripts de clonagem
    jogador = Jogador.query.filter_by(username=usuario_sessao).with_for_update().first()
    if not jogador:
        jogador = Jogador.query.filter_by(id=usuario_sessao).with_for_update().first()

    if fazenda_id:
        fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).with_for_update().first()
    else:
        fazenda = Propriedade.query.filter_by(dono_id=jogador.id).with_for_update().first()

    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    nome_coluna = f'est_{item_chave}'
    
    try:
        estoque_atual = getattr(fazenda, nome_coluna)
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Erro no banco de dados.'})

    if estoque_atual < quantidade_venda:
        return jsonify({'sucesso': False, 'erro': f'Você não tem essa quantidade toda no estoque!'})

    itens_silo = ['soja', 'milho', 'arroz', 'feijao']
    local_venda = "Silo" if item_chave in itens_silo else "Galpão"

    preco_unidade = PRECOS_VENDA.get(item_chave, 50) 
    from logica.funcionarios import obter_bonus_equipe
    bonus_rh = obter_bonus_equipe(fazenda.id)
    multiplicador_venda = bonus_rh.get('bonus_venda', 1.0)
    
    valor_total = (quantidade_venda * preco_unidade) * multiplicador_venda

    setattr(fazenda, nome_coluna, estoque_atual - quantidade_venda)
    jogador.saldo += valor_total

    if multiplicador_venda > 1.0:
        texto_venda = f"Venda de {local_venda}: {quantidade_venda}x {item_chave.capitalize()} (+10% Capataz)"
    else:
        texto_venda = f"Venda de {local_venda}: {quantidade_venda}x {item_chave.capitalize()}"

    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='entrada',
        valor=valor_total,
        descricao=texto_venda
    )
    db.session.add(nova_transacao)
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Venda de {quantidade_venda}x {item_chave.capitalize()} gerou R$ {valor_total:,.2f}!'})

@silo_bp.route('/api/silo/expandir', methods=['POST'])
def expandir_silo():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json() or {}
    fazenda_id = dados.get('fazenda_id')
    pacote = dados.get('pacote', 'pequeno') 

    PACOTES_OBRA = {
        'pequeno': {'custo': 5000, 'capacidade': 500},
        'medio': {'custo': 45000, 'capacidade': 5000},
        'grande': {'custo': 400000, 'capacidade': 50000},
        'gigante': {'custo': 3500000, 'capacidade': 500000}
    }

    if pacote not in PACOTES_OBRA:
        return jsonify({'sucesso': False, 'erro': 'Pacote de obra inválido.'})

    CUSTO_EXPANSAO = PACOTES_OBRA[pacote]['custo']
    AUMENTO_CAPACIDADE = PACOTES_OBRA[pacote]['capacidade']

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
    fazenda.cap_silo += AUMENTO_CAPACIDADE

    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='saida',
        valor=CUSTO_EXPANSAO,
        descricao=f"Obra: Expansão do Silo (+{AUMENTO_CAPACIDADE} kg)"
    )
    db.session.add(nova_transacao)
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Obras finalizadas! O Silo ganhou +{AUMENTO_CAPACIDADE:,.0f} kg de capacidade.'})
