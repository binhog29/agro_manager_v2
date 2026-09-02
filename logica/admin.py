from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Propriedade, Transacao, MensagemChat, Animal, Lote

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
    nova_transacao = Transacao(jogador_id=alvo.id, tipo=tipo_transacao, valor=abs(valor), descricao=f'⚖️ AJUSTE DO SISTEMA (Ação do Administrador)')
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
    
    if valor < 0:
        return jsonify({'sucesso': True, 'msg': f'{abs(valor)} XP removidos da conta de {alvo.username}!'})
    else:
        return jsonify({'sucesso': True, 'msg': f'{valor} XP injetados na conta de {alvo.username}!'})

@admin_bp.route('/api/admin/deletar_conta', methods=['POST'])
def deletar_conta():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.get_json().get('jogador_id'))
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    if getattr(alvo, 'is_admin', False): return jsonify({'sucesso': False, 'erro': 'Você não pode deletar a conta do CEO!'})
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    for p in propriedades: p.dono_id = None
        
    Transacao.query.filter_by(jogador_id=alvo.id).delete()
    MensagemChat.query.filter_by(jogador_id=alvo.id).delete()
    
    try:
        from database import AnuncioImovel, Anuncio
        AnuncioImovel.query.filter_by(vendedor_id=alvo.id).delete()
        Anuncio.query.filter_by(vendedor_id=alvo.id).delete()
    except Exception: pass
        
    nome_alvo = alvo.username
    db.session.delete(alvo)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'A conta "{nome_alvo}" foi banida e suas terras devolvidas ao estado!'})

# ==========================================
# 🔥 NOVOS PODERES DO MODO DEUS
# ==========================================
@admin_bp.route('/api/admin/milagre_vida', methods=['POST'])
def milagre_vida():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    if not prop_ids: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    animais = Animal.query.filter(Animal.propriedade_id.in_(prop_ids)).all()
    if not animais: return jsonify({'sucesso': False, 'erro': 'Nenhum animal encontrado.'})
    
    for a in animais:
        a.saude = 100
        a.fome = 0
        a.estresse = 0
        a.doenca_atual = 'nenhuma'
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Milagre Divino! {len(animais)} animais de {alvo.username} curados e alimentados.'})

@admin_bp.route('/api/admin/bencao_colheita', methods=['POST'])
def bencao_colheita():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    if not prop_ids: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    lotes = Lote.query.filter(Lote.fazenda_id.in_(prop_ids), Lote.status.in_(['plantado', 'colheita_incompleta'])).all()
    if not lotes: return jsonify({'sucesso': False, 'erro': 'Nenhuma lavoura ativa encontrada.'})
    
    for lote in lotes:
        lote.dias_plantado = 999.0
        lote.fase_planta = 'Ponto de Colheita'
        lote.produtividade_atual = 100
        lote.nivel_pragas = 0
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Bênção da Natureza! {len(lotes)} hectares pularam para a colheita.'})

@admin_bp.route('/api/admin/injetar_insumo', methods=['POST'])
def injetar_insumo():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    alvo = Jogador.query.get(dados.get('jogador_id'))
    item = dados.get('item')
    qtd = int(dados.get('quantidade', 0))
    
    fazenda = Propriedade.query.filter_by(dono_id=alvo.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'O jogador não possui fazendas para armazenar.'})
        
    coluna = f'est_{item}'
    try:
        atual = getattr(fazenda, coluna, 0)
        setattr(fazenda, coluna, atual + qtd)
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'{qtd} {item.capitalize()} gerados na fazenda {fazenda.nome}.'})
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Item inválido.'})

@admin_bp.route('/api/admin/confiscar_terras', methods=['POST'])
def confiscar_terras():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    
    if not propriedades: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    for p in propriedades:
        p.dono_id = None
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Todas as terras de {alvo.username} foram confiscadas pelo Estado!'})
