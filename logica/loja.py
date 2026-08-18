from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Transacao

loja_bp = Blueprint('loja', __name__)

@loja_bp.route('/api/loja/comprar', methods=['POST'])
def comprar_item():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    item_chave = dados.get('item') 
    
    # 🔒 CAMADA DE SEGURANÇA 1: Bloqueio de Injeção de Valores
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
        # 🔒 CAMADA DE SEGURANÇA 2: Verificação do Limite do Armazém
        itens_armazem = ['sal', 'racao', 'adubo', 'veneno', 'combustivel', 'vacina_aftosa', 'vacina_brucelose', 'medicamento_geral', 'suplemento_engorda']
        total_atual = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_armazem if hasattr(fazenda, f'est_{i}'))
        
        if (total_atual + quantidade) > fazenda.cap_armazem:
            espaco_livre = fazenda.cap_armazem - total_atual
            return jsonify({'sucesso': False, 'erro': f'Armazém lotado! Você só tem espaço livre para mais {espaco_livre} un.'})

        # Processa a compra se passou na fiscalização
        nome_coluna = f'est_{nome_banco}'
        estoque_atual = getattr(fazenda, nome_coluna)
        
        setattr(fazenda, nome_coluna, estoque_atual + quantidade)
        jogador.saldo -= custo_total
        
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
