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
@economia_bp.route('/financeiro', defaults={'prop_id': None})
@economia_bp.route('/financeiro/<int:prop_id>')
def financeiro(prop_id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario:
        return redirect(url_for('login'))
        
    # Se não veio o ID na URL, tenta pegar a primeira propriedade do jogador como fallback
    if not prop_id:
        primeira_prop = Propriedade.query.filter_by(dono_id=usuario.id).first()
        prop_id = primeira_prop.id if primeira_prop else 1
        
    fazenda_atual = Propriedade.query.get(prop_id)
    
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
        historico=historico,
        fazenda=fazenda_atual  # Envia a fazenda exata para o HTML
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
    
    # --- REGISTRA NO FLUXO DE CAIXA ---
    registrar_transacao(
        jogador_id=jogador.id, 
        tipo='saida', 
        valor=propriedade.preco, 
        descricao=f'Compra de Terra: {propriedade.nome}'
    )
    
    # 🔥 Trava de Segurança e Ganho de XP por Expandir o Território
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 200 # Grande conquista por adquirir uma fazenda!

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

@economia_bp.route('/api/cotacoes_diarias')
def cotacoes_diarias():
    if 'usuario' not in session: return jsonify({'sucesso': False})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario: return jsonify({'sucesso': False})

    from logica.mercado import PRECOS_REAIS, calcular_fator_dia
    from logica.silo import PRECOS_VENDA
    from logica.galpao import PRECOS_GALPAO
    from database import obter_preco_base

    fator = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)

    gado_arroba = {
        'Corte (Nelore, Angus, etc)': round(obter_preco_base('bovino_corte', PRECOS_REAIS.get('bovino_corte', 280.0)) * fator, 2),
        'Leite (Girolando)': round(obter_preco_base('bovino_leite', PRECOS_REAIS.get('bovino_leite', 250.0)) * fator, 2)
    }

    gado_kg = {
        'Suínos (Porco)': round(obter_preco_base('suino', PRECOS_REAIS.get('suino', 8.0)) * fator, 2),
        'Ovinos (Ovelha, Cabra)': round(obter_preco_base('ovino', PRECOS_REAIS.get('ovino', 20.0)) * fator, 2),
        'Aves (Galinha, Peru)': round(obter_preco_base('ave', PRECOS_REAIS.get('ave', 6.0)) * fator, 2),
        'Peixes Nobres (Pirarucu)': round(obter_preco_base('peixe_gigante', PRECOS_REAIS.get('peixe_gigante', 20.0)) * fator, 2),
        'Peixes (Tambaqui, Pacu)': round(obter_preco_base('peixe_medio', PRECOS_REAIS.get('peixe_medio', 10.0)) * fator, 2),
        'Equinos (Cavalo)': round(obter_preco_base('equino', PRECOS_REAIS.get('equino', 15.0)) * fator, 2)
    }

    derivados = {
        'Leite (Litro)': round(obter_preco_base('leite_litro', 2.50), 2),
        'Ovos (Unidade)': round(obter_preco_base('ovo_unidade', 0.50), 2)
    }

    culturas_combinadas = {**PRECOS_VENDA, **PRECOS_GALPAO}
    culturas = {}
    for k, v in culturas_combinadas.items():
        chave_db = k.lower()
        preco_padrao = v if isinstance(v, (int, float)) else (v.get('preco', 3.0) if isinstance(v, dict) else 3.0)
        preco_editado = obter_preco_base(chave_db, preco_padrao)
        culturas[k.capitalize()] = round(preco_editado * fator, 2)

    return jsonify({
        'sucesso': True,
        'gado_arroba': gado_arroba,
        'gado_kg': gado_kg,
        'derivados': derivados,
        'culturas': culturas,
        'fator': fator
    })
