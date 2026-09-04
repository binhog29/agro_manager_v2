from flask import Blueprint, jsonify, request, session, render_template, redirect, url_for
from database import db, Jogador, MensagemChat
from datetime import datetime

social_bp = Blueprint('social', __name__)

@social_bp.route('/api/chat/listar', methods=['GET'])
def listar_mensagens():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Não logado'})
    
    # Busca as últimas 50 mensagens
    mensagens = MensagemChat.query.order_by(MensagemChat.data_hora.desc()).limit(50).all()
    mensagens.reverse() # Coloca na ordem cronológica (mais antigas em cima, novas embaixo)
    
    dados = []
    for m in mensagens:
        dados.append({
            'autor': m.jogador.username,
            'is_admin': m.jogador.is_admin,
            'nivel': m.jogador.nivel,
            'texto': m.texto,
            'hora': m.data_hora.strftime("%H:%M")
        })
        
    return jsonify({'sucesso': True, 'mensagens': dados, 'usuario_atual': session['usuario']})

@social_bp.route('/api/chat/enviar', methods=['POST'])
def enviar_mensagem():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Não logado'})
        
    dados = request.get_json()
    texto = dados.get('texto', '').strip()
    
    if not texto:
        return jsonify({'sucesso': False, 'erro': 'Mensagem vazia'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    # Limita o texto a 300 caracteres para ninguém quebrar o layout
    nova_msg = MensagemChat(jogador_id=usuario.id, texto=texto[:300]) 
    db.session.add(nova_msg)
    
    # 🎁 Opcional: Dá 5 XP pro jogador por interagir na comunidade!
    usuario.adicionar_xp(5) 
    
    db.session.commit()
    return jsonify({'sucesso': True})

@social_bp.route('/ranking')
def ranking():
    if 'usuario' not in session:
        return redirect(url_for('login'))
        
    usuario_atual = Jogador.query.filter_by(username=session['usuario']).first()
    
    # 🏆 Busca o Top 10 por Nível (Descartando o CEO para ser justo)
    top_nivel = Jogador.query.filter_by(is_admin=False).order_by(Jogador.xp.desc()).limit(10).all()
    
    # 💰 Busca o Top 10 mais ricos
    top_ricos = Jogador.query.filter_by(is_admin=False).order_by(Jogador.saldo.desc()).limit(10).all()
    
    return render_template('ranking.html', user=usuario_atual, top_nivel=top_nivel, top_ricos=top_ricos)
