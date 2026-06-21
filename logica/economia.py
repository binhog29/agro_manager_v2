from flask import Blueprint, render_template, session, redirect, url_for, jsonify, request
from database import db, Jogador, Propriedade, Transacao

economia_bp = Blueprint('economia', __name__)

# --- FUNÇÃO AUXILIAR GLOBAL DE CAIXA ---
def registrar_transacao(jogador_id, tipo, valor, descricao):
    nova_transacao = Transacao(
        jogador_id=jogador_id, 
        tipo=tipo, 
        valor=valor, 
        descricao=descricao
    )
    db.session.add(nova_transacao)

# --- ROTA DA TELA FINANCEIRA ---
@economia_bp.route('/financeiro')
def financeiro():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario:
        return redirect(url_for('login'))
        
    # Busca o histórico e calcula as entradas/saídas totais
    historico = Transacao.query.filter_by(jogador_id=usuario.id).order_by(Transacao.data.desc()).limit(20).all()
    todas_transacoes = Transacao.query.filter_by(jogador_id=usuario.id).all()
    
    entradas = sum(t.valor for t in todas_transacoes if t.tipo == 'entrada')
    saidas = sum(t.valor for t in todas_transacoes if t.tipo == 'saida')
    
    return render_template(
        'financeiro.html', 
        user=usuario, 
        entradas=entradas, 
        saidas=saidas, 
        saldo=usuario.saldo,
        historico=historico
    )

@economia_bp.route('/api/comprar_fazenda/<int:prop_id>', methods=['POST'])
def comprar_fazenda(prop_id):
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    propriedade = Propriedade.query.get(prop_id)
    
    if not propriedade: return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada.'})
    if propriedade.dono_id is not None: return jsonify({'sucesso': False, 'erro': 'Esta propriedade já tem dono.'})
    if jogador.saldo < propriedade.preco: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})

    jogador.saldo -= propriedade.preco
    propriedade.dono_id = jogador.id
    
    # --- NOVO: REGISTRA NO FLUXO DE CAIXA ---
    registrar_transacao(
        jogador_id=jogador.id, 
        tipo='saida', 
        valor=propriedade.preco, 
        descricao=f'Compra de Terra: {propriedade.nome}'
    )
    db.session.commit()
    return jsonify({'sucesso': True})

@economia_bp.route('/api/renomear/fazenda/<int:prop_id>', methods=['POST'])
def renomear_fazenda(prop_id):
    if 'usuario' not in session: return jsonify({'sucesso': False})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    propriedade = Propriedade.query.get(prop_id)

    if propriedade and propriedade.dono_id == jogador.id:
        dados = request.get_json()
        novo_nome = dados.get('nome', '').strip()
        if novo_nome:
            propriedade.nome = novo_nome
            db.session.commit()
            return jsonify({'sucesso': True})
    return jsonify({'sucesso': False, 'erro': 'Erro ao renomear.'})
