from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, obter_preco_base # 👈 Import adicionado aqui
from logica.economia import registrar_transacao
from logica.mercado import calcular_fator_dia
from logica.funcionarios import obter_bonus_equipe

galpao_bp = Blueprint('galpao', __name__)

PRECOS_GALPAO = {
    'tomate': 0.90,
    'melancia': 0.30,
    'abacaxi': 1.00,
    'mandioca': 0.25,
    'banana': 0.60,
    'cacau': 9.00,
    'acai': 2.80,
    'cupuacu': 3.20,
    'pimenta': 9.00,
    'algodao': 3.00,
    'cafe': 6.50,
    'cana': 0.20       
}

@galpao_bp.route('/api/galpao/vender', methods=['POST'])
def vender_galpao():
    """Rota independente e exclusiva para vendas do Galpão Agrícola"""
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()

    item = dados.get('item')
    try:
        qtd_venda = int(dados.get('quantidade', 0))
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})

    fazenda_id = dados.get('fazenda_id')
    propriedade = Propriedade.query.get(fazenda_id)

    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Esta fazenda não pertence a você.'})

    if qtd_venda <= 0:
        return jsonify({'sucesso': False, 'erro': 'A quantidade deve ser maior que zero.'})

    coluna_estoque = f'est_{item}'
    if not hasattr(propriedade, coluna_estoque):
        return jsonify({'sucesso': False, 'erro': 'Este item não pertence ao Galpão.'})

    estoque_atual = getattr(propriedade, coluna_estoque)
    if estoque_atual < qtd_venda:
        return jsonify({'sucesso': False, 'erro': 'Estoque insuficiente no Galpão.'})

    # 1. Procura o Preço Base definido pelo CEO (com fallback para a tabela padrão)
    fator = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    valor_padrao = PRECOS_GALPAO.get(item, 1.0)
    preco_base = obter_preco_base(item, valor_padrao) # 👈 Lógica do CEO aplicada aqui
    preco_mercado = preco_base * fator

    # 2. Aplica o Bônus de Venda do Capataz
    bonus_rh = obter_bonus_equipe(propriedade.id)
    multiplicador = bonus_rh.get('bonus_venda', 1.0)

    # 3. Retém os Impostos (4% FUNRURAL)
    valor_bruto = (qtd_venda * preco_mercado) * multiplicador
    imposto = valor_bruto * 0.04
    valor_liquido = valor_bruto - imposto

    setattr(propriedade, coluna_estoque, estoque_atual - qtd_venda)
    usuario.saldo += valor_liquido
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 10

    registrar_transacao(
        usuario.id,
        'entrada',
        valor_liquido,
        f'Galpão: Venda de {qtd_venda}kg de {item.capitalize()} (Retido 4% FUNRURAL)'
    )

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Venda concluída! Foram retidos R$ {imposto:,.2f} de FUNRURAL e você recebeu R$ {valor_liquido:,.2f}'})
