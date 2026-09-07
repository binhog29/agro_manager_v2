import re
import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from datetime import timedelta

from database import db, Jogador, Propriedade, Animal, HistoricoMorte, Transacao

from logica.social import social_bp
from logica.mercado import mercado_bp
from logica.economia import economia_bp
from logica.agricultura import agricultura_bp
from logica.tempo import tempo_bp, GerenciadorTempo
from logica.terras import terras_bp
from logica.cultivo import cultivo_bp
from logica.loja import loja_bp
from logica.silo import silo_bp
from logica.armazem import armazem_bp
from logica.funcionarios import funcionarios_bp
from logica.frigorifico import frigorifico_bp
from logica.leilao import leilao_bp
from logica.gado import gado_bp
from logica.habitats import habitats_bp
from logica.infraestrutura import infra_bp
from logica.barracao import barracao_bp
from logica.imobiliaria import imobiliaria_bp
from logica.admin import admin_bp


app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "banco_dados.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'chave_super_secreta_para_sessoes' 
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30) # 🔥 SESSÃO DURA 30 DIAS

db.init_app(app)
migrate = Migrate(app, db) 

limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://"
)

app.register_blueprint(funcionarios_bp)
app.register_blueprint(social_bp)
app.register_blueprint(mercado_bp)
app.register_blueprint(economia_bp)
app.register_blueprint(agricultura_bp)
app.register_blueprint(tempo_bp)
app.register_blueprint(terras_bp)
app.register_blueprint(cultivo_bp)
app.register_blueprint(loja_bp)
app.register_blueprint(silo_bp)
app.register_blueprint(armazem_bp)
app.register_blueprint(frigorifico_bp)
app.register_blueprint(leilao_bp)
app.register_blueprint(gado_bp)
app.register_blueprint(habitats_bp)
app.register_blueprint(infra_bp)
app.register_blueprint(barracao_bp)
app.register_blueprint(imobiliaria_bp)
app.register_blueprint(admin_bp)


with app.app_context():
    db.create_all()
    from database import popular_mapa_inicial
    popular_mapa_inicial()

# ==========================================
# FUNÇÃO SEGURA DE NÍVEL (Unificada com o database.py)
# ==========================================
def verificar_nivel(jogador):
    if not jogador:
        return
        
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    if getattr(jogador, 'nivel', None) is None:
        jogador.nivel = 1
        
    # Chama o método oficial da classe Jogador que dá o dinheiro de prêmio!
    subiu = jogador.adicionar_xp(0) 
    
    if subiu:
        db.session.commit()

# ==========================================
# ROTAS DO SISTEMA E SEGURANÇA
# ==========================================
@app.route('/')
@app.route('/login')
def login():
    return render_template('login.html')

# 🔥 TELA DE BLOQUEIO DE IP (Dispara quando o limite é excedido)
@app.errorhandler(429)
def ratelimit_handler(e):
    return render_template_string('''
        <div style="text-align:center; margin-top:100px; font-family:'Segoe UI', sans-serif; color:white; background:#121212; padding: 40px; height: 100vh;">
            <i class="fas fa-shield-alt" style="font-size: 80px; color: #f44336; margin-bottom: 20px;"></i>
            <h1 style="color:#f44336;">IP BLOQUEADO TEMPORARIAMENTE</h1>
            <p style="font-size: 18px; color: #ccc;">Detectamos muitas tentativas de login ou criação de conta vindas da sua rede.</p>
            <p style="color: #888;">Por medidas de segurança contra robôs, aguarde alguns minutos antes de tentar novamente.</p>
            <br>
            <a href="/login" style="background: #2e7d32; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Tentar Novamente</a>
        </div>
    '''), 429

# 🔥 ROTA DE AUTENTICAÇÃO BLINDADA (Máximo de 5 tentativas por minuto por IP)
@app.route('/autenticar', methods=['POST'])
@limiter.limit("10 per minute")
def autenticar():
    acao = request.form.get('acao')
    username = request.form.get('usuario').strip()
    senha = request.form.get('senha')
    lembrar = request.form.get('lembrar') # 🔥 PEGA O CHECKBOX DO HTML
    
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
                saldo_inicial = 300000.0
            elif dificuldade == 'medio':
                saldo_inicial = 200000.0
            else:
                saldo_inicial = 150000.0 
            
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
            
            # 🔥 SE MARCOU A CAIXA, MANTÉM LOGADO NO APLICATIVO
            if lembrar:
                session.permanent = True
            else:
                session.permanent = False
                
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
    
    if jogador_atual:
        GerenciadorTempo.calcular_progresso_offline(jogador_atual)
        verificar_nivel(jogador_atual)  # 🔥 Atualiza o nível ao abrir o Mapa
        
        # ==========================================
        # 🔥 NOVO: LÓGICA DO DUPLO RANKING (NÍVEL E SALDO)
        # ==========================================
        if not jogador_atual.is_admin:
            posicao_nivel = Jogador.query.filter_by(is_admin=False).filter(Jogador.xp > jogador_atual.xp).count() + 1
            posicao_saldo = Jogador.query.filter_by(is_admin=False).filter(Jogador.saldo > jogador_atual.saldo).count() + 1
        else:
            posicao_nivel = 0
            posicao_saldo = 0
    else:
        posicao_nivel = 0
        posicao_saldo = 0	
        
    return render_template('mapa.html', jogador=jogador_atual, posicao_nivel=posicao_nivel, posicao_saldo=posicao_saldo)

@app.route('/api/mapa_global')
def api_mapa_global():
    usuario_logado = None
    if 'usuario' in session:
        usuario_logado = Jogador.query.filter_by(username=session['usuario']).first()

    # Lista oficial na mesma ordem da geração do banco de dados
    cidades_lista = ['Mutum Paraná', 'Rio Madeira', 'Jirau', 'Jaci Paraná', 'Porto Velho', 'São Domingos', 'Itapuã do Oeste', 'Bom Futuro', 'Buritis', 'Alto Paraíso', 'Campo Novo', 'Monte Negro', 'Ariquemes', 'Rio Crespo', 'Cujubim', 'Machadinho', 'Jaru', 'São Miguel', 'Alvorada', 'Ouro Preto', 'Nova Brasilândia', 'Castanheiras', 'Santa Luzia', 'Cacoal', 'Alta Floresta', 'Rolim de Moura', 'Ji-Paraná']

    propriedades = Propriedade.query.all()
    lista_props = []
    
    for p in propriedades:
        e_minha = False
        dono_nome = None 
        
        if p.dono_id:
            dono = db.session.get(Jogador, p.dono_id)
            dono_nome = dono.username if dono else "Desconhecido"
            if usuario_logado and p.dono_id == usuario_logado.id:
                e_minha = True

        # 🔥 A MÁGICA: Descobre a cidade dividindo o ID por 20 (Já que cada cidade tem 20 lotes)
        idx_cidade = (p.id - 1) // 20
        nome_cidade = cidades_lista[idx_cidade] if idx_cidade < len(cidades_lista) else "Desconhecida"
            
        lista_props.append({
            'id': p.id,
            'nome': p.nome,
            'preco': p.preco,
            'tipo': p.tipo,
            'dono_id': p.dono_id,
            'dono_nome': dono_nome,
            'e_minha': e_minha,
            'cidade': nome_cidade  # Enviamos a cidade exata, imune a renomeações!
        })
        
    return jsonify(lista_props)

@app.route('/api/mapa_frota')
def api_mapa_frota():
    if 'usuario' not in session: return jsonify([])
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    props = Propriedade.query.filter_by(dono_id=usuario.id).all()
    prop_ids = [p.id for p in props]
    
    # Procura animais trancados no caminhão
    em_viagem = Animal.query.filter(Animal.propriedade_id.in_(prop_ids), Animal.onde_esta == 'caminhao').all()
    
    viagens = {}
    for a in em_viagem:
        # Agrupa pelo mesmo destino e mesma duração restante
        chave = f"{a.propriedade_id}_{a.destino_id}_{a.horas_viagem}"
        if chave not in viagens:
            viagens[chave] = {
                'origem_id': a.propriedade_id,
                'destino_id': a.destino_id,
                'horas_restantes': a.horas_viagem,
                'qtd': 0
            }
        viagens[chave]['qtd'] += 1
        
    return jsonify(list(viagens.values()))

@app.route('/sair')
def sair():
    session.pop('usuario', None)
    return redirect(url_for('login'))
    
@app.route('/perfil')
def perfil():
    if 'usuario' not in session:
        return redirect(url_for('login'))
        
    jogador_atual = Jogador.query.filter_by(username=session['usuario']).first()
    
    if jogador_atual:
        verificar_nivel(jogador_atual) # 🔥 Atualiza o nível ao abrir o Perfil
        
        # ==========================================
        # 🔥 CÁLCULO DOS EMBLEMAS PARA O PERFIL
        # ==========================================
        if not jogador_atual.is_admin:
            posicao_nivel = Jogador.query.filter_by(is_admin=False).filter(Jogador.xp > jogador_atual.xp).count() + 1
            posicao_saldo = Jogador.query.filter_by(is_admin=False).filter(Jogador.saldo > jogador_atual.saldo).count() + 1
        else:
            posicao_nivel = 0
            posicao_saldo = 0
    else:
        posicao_nivel = 0
        posicao_saldo = 0
        
    return render_template('perfil.html', jogador=jogador_atual, posicao_nivel=posicao_nivel, posicao_saldo=posicao_saldo)
    
# ==========================================
# 🏛️ SIF - SISTEMA DE INTELIGÊNCIA FISCAL 
# ==========================================
@app.route('/admin/receita-federal')
def receita_federal():
    if 'usuario' not in session: return redirect(url_for('login'))
    usuario_atual = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario_atual or not getattr(usuario_atual, 'is_admin', False):
        return "Acesso negado. Área restrita à Receita Federal!", 403

    transacoes = Transacao.query.order_by(Transacao.data.desc()).limit(300).all()
    
    auditoria = []
    alertas_malha_fina = []
    
    for t in transacoes:
        dono = db.session.get(Jogador, t.jogador_id)
        nome_dono = dono.username if dono else "Desconhecido"
        
        # 🔥 IA DA MALHA FINA: Detecta padrões de trapaça e lavagem de dinheiro
        suspeito = False
        motivo = ""
        
        if t.valor > 2000000 and t.tipo == 'entrada' and "Leilão" not in t.descricao:
            suspeito, motivo = True, "💰 Entrada Milionária Súbita"
        elif "Frigorífico" in t.descricao and ("200x" in t.descricao or "100x" in t.descricao):
            suspeito, motivo = True, "⚠️ Exploit Suspeito de XP (Venda em Massa)"
        elif t.valor > 500000 and "Leilão" in t.descricao:
            suspeito, motivo = True, "⚖️ Lavagem de Dinheiro (Leilão com valor irreal)"
            
        if suspeito and dono and not getattr(dono, 'is_admin', False):
            # Impede que o mesmo jogador lote a tela de alertas (agrupa por jogador)
            if not any(a['jogador_id'] == dono.id for a in alertas_malha_fina):
                alertas_malha_fina.append({
                    'jogador_id': dono.id, 'fazendeiro': nome_dono,
                    'motivo': motivo, 'valor': t.valor, 'data': t.data.strftime("%d/%m %H:%M")
                })

        auditoria.append({
            'data': t.data, 'fazendeiro': nome_dono, 
            'nivel': getattr(dono, 'nivel', 1) if dono else 1,
            'tipo': t.tipo, 'valor': t.valor, 'descricao': t.descricao, 'suspeito': suspeito
        })

    milionarios = Jogador.query.filter_by(is_admin=False).order_by(Jogador.saldo.desc()).limit(50).all()
    
    # Calcula a inflação global do servidor (Dinheiro total em jogo)
    total_circulacao = sum(j.saldo for j in Jogador.query.filter_by(is_admin=False).all())

    return render_template(
        'admin_receita.html', 
        user=usuario_atual, 
        auditoria=auditoria,
        milionarios=milionarios,
        alertas=alertas_malha_fina,
        total_circulacao=total_circulacao
    )

@app.route('/api/admin/dossie/<int:jogador_id>', methods=['GET'])
def dossie_jogador(jogador_id):
    """Gera um Raio-X completo do jogador para a Receita Federal"""
    if 'usuario' not in session: return jsonify({'sucesso': False})
    admin = Jogador.query.filter_by(username=session['usuario']).first()
    if not admin or not getattr(admin, 'is_admin', False): return jsonify({'sucesso': False})
    
    from database import Lote, Animal, Propriedade # Importação local segura
    
    alvo = db.session.get(Jogador, jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado'})
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    hectares = Lote.query.filter(Lote.fazenda_id.in_(prop_ids)).count() if prop_ids else 0
    animais = Animal.query.filter(Animal.propriedade_id.in_(prop_ids)).count() if prop_ids else 0
    
    return jsonify({
        'sucesso': True,
        'nome': alvo.username,
        'nivel': getattr(alvo, 'nivel', 1),
        'saldo': alvo.saldo,
        'fazendas': len(propriedades),
        'hectares': hectares,
        'animais': animais
    })

@app.route('/admin/multar/<int:jogador_id>', methods=['POST'])
def aplicar_multa(jogador_id):
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Não autorizado'})
    admin = Jogador.query.filter_by(username=session['usuario']).first()
    if not admin or not getattr(admin, 'is_admin', False): return jsonify({'sucesso': False}), 403

    dados = request.get_json() or {}
    try:
        valor_multa = float(dados.get('valor', 0))
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Valor inválido'})
        
    motivo = dados.get('motivo', 'Ação Fiscal / Apreensão de Bens')

    alvo = db.session.get(Jogador, jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado'})

    alvo.saldo = max(0.0, alvo.saldo - valor_multa)
    
    nova_transacao = Transacao(jogador_id=alvo.id, tipo='saida', valor=valor_multa, descricao=f'🚨 CONFISCO FEDERAL: {motivo}')
    db.session.add(nova_transacao)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Ação fiscal concluída! Foram retidos R$ {valor_multa:,.2f} da conta de {alvo.username}.'})
        
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

    propriedade = Propriedade.query.get(prop_id)
    if not propriedade:
        return redirect(url_for('mapa'))
        
    visitante = False
    
    if propriedade.dono_id == jogador.id:
        verificar_nivel(jogador) # 🔥 Atualiza o nível ao abrir a Fazenda
    else:
        visitante = True

    animais_no_curral = Animal.query.filter_by(propriedade_id=prop_id, onde_esta='curral').all()

    return render_template('fazenda.html', 
                           jogador=jogador, 
                           user=jogador, 
                           fazenda=propriedade, 
                           gado_curral=animais_no_curral,
                           visitante=visitante) 
                           
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
