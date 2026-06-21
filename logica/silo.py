from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

silo_bp = Blueprint('silo', __name__)

# TABELA DE PREÇOS DE VENDA (Ajuste os valores como preferir!)
PRECOS_VENDA = {
    'milho': 150,
    'soja': 250,
    'cafe': 400,
    'arroz': 120,
    'feijao': 200,
    'algodao': 300,
    'cana': 100,
    'mandioca': 80,
    'pimenta': 220,
    'cacau': 450,
    'acai': 350,
    'cupuacu': 300,
    'banana': 150,
    'abacaxi': 180,
    'melancia': 90
}

@silo_bp.route('/api/silo/vender', methods=['POST'])
def vender_grao():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item') # ex: 'milho'
    quantidade_venda = int(dados.get('quantidade', 0))

    if quantidade_venda <= 0:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})

    preco_unidade = PRECOS_VENDA.get(item_chave, 50) # Pega o preço da tabela
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
        return jsonify({'sucesso': False, 'erro': f'Você não tem essa quantidade toda no silo!'})

    # 1. Desconta o estoque e adiciona o saldo
    setattr(fazenda, nome_coluna, estoque_atual - quantidade_venda)
    jogador.saldo += valor_total

    # 2. Registra no fluxo de caixa (ENTRADA)
    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='entrada',
        valor=valor_total,
        descricao=f"Venda de Silo: {quantidade_venda}x {item_chave.capitalize()}"
    )
    db.session.add(nova_transacao)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Venda de {quantidade_venda}x {item_chave.capitalize()} gerou R$ {valor_total:.2f}!'})

@silo_bp.route('/api/silo/expandir', methods=['POST'])
def expandir_silo():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    # CUSTO E GANHO DA EXPANSAO (Ajuste como quiser)
    CUSTO_EXPANSAO = 5000
    AUMENTO_CAPACIDADE = 500

    usuario_sessao = session['usuario']
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    if not jogador:
        jogador = Jogador.query.get(usuario_sessao)

    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()

    if jogador.saldo < CUSTO_EXPANSAO:
        return jsonify({'sucesso': False, 'erro': f'Você precisa de R$ {CUSTO_EXPANSAO:.2f} para expandir o silo.'})

    # 1. Cobra o dinheiro e aumenta a capacidade
    jogador.saldo -= CUSTO_EXPANSAO
    fazenda.cap_silo += AUMENTO_CAPACIDADE

    # 2. Registra no fluxo de caixa (SAÍDA)
    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='saida',
        valor=CUSTO_EXPANSAO,
        descricao=f"Melhoria: Expansão do Silo (+{AUMENTO_CAPACIDADE} kg)"
    )
    db.session.add(nova_transacao)
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Silo expandido! Nova capacidade: {fazenda.cap_silo} kg.'})
