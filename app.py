import re
import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate 

from database import db, Jogador, Propriedade, Animal, HistoricoMorte

from logica.mercado import mercado_bp
from logica.economia import economia_bp
from logica.agricultura import agricultura_bp
from logica.pecuaria import pecuaria_bp
from logica.tempo import tempo_bp, GerenciadorTempo # <-- Importação do motor de tempo
from logica.terras import terras_bp
from logica.cultivo import cultivo_bp
from logica.loja import loja_bp
from logica.silo import silo_bp
from logica.armazem import armazem_bp

app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "banco_dados.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'chave_super_secreta_para_sessoes' 

db.init_app(app)
migrate = Migrate(app, db) 

# AQUI ESTÁ A CORREÇÃO: Limite global removido para não bloquear o jogo
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://"
)

app.register_blueprint(mercado_bp)
app.register_blueprint(economia_bp)
app.register_blueprint(agricultura_bp)
app.register_blueprint(pecuaria_bp)
app.register_blueprint(tempo_bp)
app.register_blueprint(terras_bp)
app.register_blueprint(cultivo_bp)
app.register_blueprint(loja_bp)
app.register_blueprint(silo_bp)
app.register_blueprint(armazem_bp)

with app.app_context():
    db.create_all()
    from database import popular_mapa_inicial
    popular_mapa_inicial()

@app.route('/')
@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/autenticar', methods=['POST'])
@limiter.limit("10 per minute")
def autenticar():
    acao = request.form.get('acao')
    username = request.form.get('usuario').strip()
    senha = request.form.get('senha')
    
    if not re.match("^[a-zA-Z0-9]{3,15}$", username):
        flash("O usuário deve ter entre 3 e 15 caracteres, sem espaços ou símbolos.")
        return redirect(url_for('login'))

    if acao == 'criar':
        dificuldade = request.form.get('dificuldade')
        
        usuario_existe = Jogador.query.filter_by(username=username).first()
        if usuario_existe:
            flash("Esse nome de usuário já está em uso!")
            return redirect(url_for('login'))
        
        is_admin = False
        if username.lower() == 'ceo':
            saldo_inicial = 999999999.0 
            is_admin = True
        else:
            if dificuldade == 'facil':
                saldo_inicial = 50000.0
            elif dificuldade == 'medio':
                saldo_inicial = 25000.0
            else:
                saldo_inicial = 10050.0 
            
        senha_segura = generate_password_hash(senha)
        novo_jogador = Jogador(username=username, senha_hash=senha_segura, saldo=saldo_inicial, is_admin=is_admin)
        db.session.add(novo_jogador)
        db.session.commit()
        
        session['usuario'] = username 
        return redirect(url_for('mapa'))

    elif acao == 'entrar':
        usuario = Jogador.query.filter_by(username=username).first()
        
        if usuario and check_password_hash(usuario.senha_hash, senha):
            session['usuario'] = username
            return redirect(url_for('mapa'))
        else:
            flash("Usuário ou senha incorretos!")
            return redirect(url_for('login'))

    flash("Erro no formulário. Por favor, tente novamente.")
    return redirect(url_for('login'))
    
@app.route('/mapa')
def mapa():
    if 'usuario' not in session:
        return redirect(url_for('login'))
        
    jogador_atual = Jogador.query.filter_by(username=session['usuario']).first()
    
    # 🔥 CORREÇÃO: Calcula o tempo offline ANTES de carregar o mapa global!
    if jogador_atual:
        GerenciadorTempo.calcular_progresso_offline(jogador_atual)
        
    return render_template('mapa.html', jogador=jogador_atual)

@app.route('/api/mapa_global')
def api_mapa_global():
    usuario_logado = None
    if 'usuario' in session:
        usuario_logado = Jogador.query.filter_by(username=session['usuario']).first()

    propriedades = Propriedade.query.all()
    lista_props = []
    
    for p in propriedades:
        e_minha = False
        dono_nome = None # Puxa o nome de quem comprou
        
        if p.dono_id:
            dono = db.session.get(Jogador, p.dono_id)
            dono_nome = dono.username if dono else "Desconhecido"
            if usuario_logado and p.dono_id == usuario_logado.id:
                e_minha = True
            
        lista_props.append({
            'id': p.id,
            'nome': p.nome,
            'preco': p.preco,
            'tipo': p.tipo,
            'dono_id': p.dono_id,
            'dono_nome': dono_nome, # Enviando o nome para o Visual
            'e_minha': e_minha
        })
        
    return jsonify(lista_props)

@app.route('/sair')
def sair():
    session.pop('usuario', None)
    return redirect(url_for('login'))
    
@app.route('/perfil')
def perfil():
    if 'usuario' not in session:
        return redirect(url_for('login'))
        
    jogador_atual = Jogador.query.filter_by(username=session['usuario']).first()
    return render_template('perfil.html', jogador=jogador_atual)

@app.route('/ajuda')
def ajuda():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    jogador_atual = Jogador.query.filter_by(username=session['usuario']).first()
    return render_template('ajuda.html', jogador=jogador_atual)

@app.route('/api/perfil/atualizar', methods=['POST'])
def atualizar_perfil():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'msg': 'Sessão expirada.'})

    dados = request.get_json()
    novo_nome = dados.get('novo_nome', '').strip()
    novo_email = dados.get('novo_email', '').strip()
    nova_senha = dados.get('nova_senha', '')

    jogador = Jogador.query.filter_by(username=session['usuario']).first()

    if novo_nome and novo_nome != jogador.username:
        existe = Jogador.query.filter_by(username=novo_nome).first()
        if existe:
            return jsonify({'sucesso': False, 'msg': 'Esse nome já está em uso.'})
        jogador.username = novo_nome
        session['usuario'] = novo_nome 

    jogador.email = novo_email
    if nova_senha:
        jogador.senha_hash = generate_password_hash(nova_senha)

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Perfil atualizado com sucesso!'})

@app.route('/fazenda/<int:prop_id>')
def fazenda(prop_id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    
    if not jogador:
        session.pop('usuario', None)
        return redirect(url_for('login'))

    # PROCESSAMENTO OFFLINE: Calcula o tempo que o jogador ficou fora e aplica na fazenda
    GerenciadorTempo.calcular_progresso_offline(jogador)

    propriedade = Propriedade.query.get(prop_id)

    if not propriedade or propriedade.dono_id != jogador.id:
        return redirect(url_for('mapa'))

    animais_no_curral = Animal.query.filter_by(propriedade_id=prop_id, onde_esta='curral').all()

    return render_template('fazenda.html', 
                           jogador=jogador, 
                           user=jogador, 
                           fazenda=propriedade, 
                           gado_curral=animais_no_curral) 
                           
@app.route('/cemiterio/<int:prop_id>')
def cemiterio(prop_id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    
    if not jogador:
        session.pop('usuario', None)
        return redirect(url_for('login'))

    propriedade = Propriedade.query.get(prop_id)

    if not propriedade or propriedade.dono_id != jogador.id:
        return redirect(url_for('mapa'))

    mortes = HistoricoMorte.query.filter_by(propriedade_id=prop_id).order_by(HistoricoMorte.data_morte.desc()).all()

    return render_template('cemiterio.html', 
                           jogador=jogador, 
                           user=jogador, 
                           fazenda=propriedade, 
                           mortes=mortes)
                           
if __name__ == '__main__':
    app.run(debug=True)
