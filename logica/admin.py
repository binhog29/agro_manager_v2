from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Propriedade, Transacao, MensagemChat

admin_bp = Blueprint('admin_ceo', __name__)

def verificar_admin():
    if 'usuario' not in session: return False
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    return usuario and getattr(usuario, 'is_admin', False)

@admin_bp.route('/admin/painel-ceo')
def painel_ceo():
    if not verificar_admin():
        return "Acesso Negado. Área restrita aos Administradores do Jogo.", 403
    
    usuario_atual = Jogador.query.filter_by(username=session['usuario']).first()
    # Busca todos os jogadores ordenados do mais recente para o mais antigo
    jogadores = Jogador.query.order_by(Jogador.id.desc()).all()
    
    return render_template('admin_ceo.html', user=usuario_atual, jogadores=jogadores)

@admin_bp.route('/api/admin/injetar_saldo', methods=['POST'])
def injetar_saldo():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    valor = float(dados.get('valor', 0))
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    alvo.saldo += valor
    if alvo.saldo < 0: alvo.saldo = 0
    
    tipo_transacao = 'entrada' if valor > 0 else 'saida'
    nova_transacao = Transacao(
        jogador_id=alvo.id,
        tipo=tipo_transacao,
        valor=abs(valor),
        descricao=f'⚖️ AJUSTE DO SISTEMA (Ação do Administrador)'
    )
    db.session.add(nova_transacao)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Saldo de {alvo.username} ajustado com sucesso!'})

@admin_bp.route('/api/admin/injetar_xp', methods=['POST'])
def injetar_xp():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    valor = int(dados.get('valor', 0))
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    alvo.adicionar_xp(valor)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{valor} XP injetados na conta de {alvo.username}!'})

@admin_bp.route('/api/admin/deletar_conta', methods=['POST'])
def deletar_conta():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    if getattr(alvo, 'is_admin', False): return jsonify({'sucesso': False, 'erro': 'Você não pode deletar a conta do CEO!'})
    
    # 1. Desapropria as terras (devolve para o mapa global)
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    for p in propriedades:
        p.dono_id = None
        
    # 2. Limpa os rastros do jogador para evitar erros no banco de dados
    Transacao.query.filter_by(jogador_id=alvo.id).delete()
    MensagemChat.query.filter_by(jogador_id=alvo.id).delete()
    
    try:
        from database import AnuncioImovel, Anuncio
        AnuncioImovel.query.filter_by(vendedor_id=alvo.id).delete()
        Anuncio.query.filter_by(vendedor_id=alvo.id).delete()
    except Exception:
        pass
        
    # 3. Deleta a conta em definitivo
    nome_alvo = alvo.username
    db.session.delete(alvo)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'A conta "{nome_alvo}" foi banida e suas terras devolvidas ao estado!'})
