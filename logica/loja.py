from flask import Blueprint, jsonify, request, session
# IMPORTANTE: Não esqueça de adicionar a Transacao aqui no import!
from database import db, Jogador, Propriedade, Transacao

loja_bp = Blueprint('loja', __name__)

@loja_bp.route('/api/loja/comprar', methods=['POST'])
def comprar_item():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item') # ex: 'sem_milho'
    quantidade = int(dados.get('quantidade', 1))
    preco_unidade = float(dados.get('preco', 0))
    
    # TRADUÇÃO DE CHAVES: Remove o 'sem_' para bater com o banco de dados
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
        # Usa o nome limpo (ex: 'milho') para buscar a coluna 'est_milho'
        nome_coluna = f'est_{nome_banco}'
        estoque_atual = getattr(fazenda, nome_coluna)
        
        setattr(fazenda, nome_coluna, estoque_atual + quantidade)
        jogador.saldo -= custo_total
        
        # Registra a transação
        nova_transacao = Transacao(
            jogador_id=jogador.id,
            tipo='saida',
            valor=custo_total,
            descricao=f"Compra na loja: {quantidade}x {nome_banco}"
        )
        db.session.add(nova_transacao)
        
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'Compra realizada com sucesso!'})
        
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': f'A coluna {nome_coluna} não existe no banco de dados!'})
