from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

armazem_bp = Blueprint('armazem', __name__)

# TABELA DE PREÇOS DE VENDA DOS INSUMOS
PRECOS_VENDA_INSUMO = {
    'sal': 40,
    'racao': 60,
    'adubo': 75,
    'veneno': 100,
    'combustivel': 220,
    'vacina_aftosa': 75,
    'vacina_brucelose': 90,
    'medicamento_geral': 45,
    'suplemento_engorda': 60
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

    # CUSTO E GANHO DA EXPANSAO (No seu HTML diz +300 un)
    CUSTO_EXPANSAO = 4000
    AUMENTO_CAPACIDADE = 300

    usuario_sessao = session['usuario']
    jogador = Jogador.query.filter_by(username=usuario_sessao).first()
    if not jogador:
        jogador = Jogador.query.get(usuario_sessao)

    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()

    if jogador.saldo < CUSTO_EXPANSAO:
        return jsonify({'sucesso': False, 'erro': f'Você precisa de R$ {CUSTO_EXPANSAO:.2f} para expandir o armazém.'})

    jogador.saldo -= CUSTO_EXPANSAO
    fazenda.cap_armazem += AUMENTO_CAPACIDADE

    nova_transacao = Transacao(
        jogador_id=jogador.id,
        tipo='saida',
        valor=CUSTO_EXPANSAO,
        descricao=f"Melhoria: Expansão do Armazém (+{AUMENTO_CAPACIDADE} un)"
    )
    db.session.add(nova_transacao)
    
    # 🔥 Trava de Segurança e Ganho de XP pela Expansão
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Armazém expandido! Nova capacidade: {fazenda.cap_armazem} un.'})
