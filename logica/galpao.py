from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade
from logica.economia import registrar_transacao
from logica.mercado import calcular_fator_dia
from logica.funcionarios import obter_bonus_equipe

galpao_bp = Blueprint('galpao', __name__)

# Tabela de preços base exclusiva do Galpão (Frutas, Raízes e Fibras)
PRECOS_GALPAO = {
    'tomate': 1.10,
    'melancia': 0.40,
    'abacaxi': 1.20,
    'mandioca': 0.35,
    'banana': 1.00,
    'cacau': 12.00,
    'acai': 3.50,
    'cupuacu': 4.00,
    'pimenta': 15.00,
    'algodao': 3.80,
    'cafe': 8.50,
    'cana': 0.35       # 🔥 Ajustado de 0.12 para 0.35 para compensar o ciclo de 1 ano!
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

    # Verifica se a coluna de estoque existe no banco de dados
    coluna_estoque = f'est_{item}'
    if not hasattr(propriedade, coluna_estoque):
        return jsonify({'sucesso': False, 'erro': 'Este item não pertence ao Galpão.'})

    estoque_atual = getattr(propriedade, coluna_estoque)
    if estoque_atual < qtd_venda:
        return jsonify({'sucesso': False, 'erro': 'Estoque insuficiente no Galpão.'})

    # 1. Aplica a Volatilidade do Mercado
    fator = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    preco_base = PRECOS_GALPAO.get(item, 1.0)
    preco_mercado = preco_base * fator

    # 2. Aplica o Bônus de Venda do Capataz
    bonus_rh = obter_bonus_equipe(propriedade.id)
    multiplicador = bonus_rh.get('bonus_venda', 1.0)

    # 3. Retém os Impostos (4% FUNRURAL)
    valor_bruto = (qtd_venda * preco_mercado) * multiplicador
    imposto = valor_bruto * 0.04
    valor_liquido = valor_bruto - imposto

    # Efetiva a venda
    setattr(propriedade, coluna_estoque, estoque_atual - qtd_venda)
    usuario.saldo += valor_liquido
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 10 # 10 XP por lote vendido do galpão

    registrar_transacao(
        usuario.id,
        'entrada',
        valor_liquido,
        f'Galpão: Venda de {qtd_venda}kg de {item.capitalize()} (Retido 4% FUNRURAL)'
    )

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Venda concluída! Foram retidos R$ {imposto:,.2f} de FUNRURAL e você recebeu R$ {valor_liquido:,.2f}'})
