from flask import Blueprint, session, request, jsonify, render_template, redirect, url_for
from database import db, Jogador, Propriedade, AnuncioImovel, Animal, Lote, Maquinario, Equipe
from logica.economia import registrar_transacao

imobiliaria_bp = Blueprint('imobiliaria', __name__)

@imobiliaria_bp.route('/api/imobiliaria/anunciar', methods=['POST'])
def anunciar_imovel():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    if getattr(usuario, 'nivel', 1) < 3:
        return jsonify({'sucesso': False, 'erro': 'Apenas fazendeiros Nível 3+ podem vender imóveis!'})
        
    dados = request.get_json()
    fazenda_id = int(dados.get('fazenda_id', 0))
    valor = float(dados.get('valor', 0))

    if valor <= 0: return jsonify({'sucesso': False, 'erro': 'O valor deve ser maior que zero.'})

    fazenda = Propriedade.query.get(fazenda_id)
    if not fazenda or fazenda.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Esta propriedade não pertence a você.'})

    preco_minimo = fazenda.preco * 0.8
    preco_maximo = fazenda.preco * 2.5

    if valor < preco_minimo:
        return jsonify({'sucesso': False, 'erro': f'Valor suspeito! A Receita Federal não permite vendas abaixo do valor venal (Mín: R$ {preco_minimo:,.2f}).'})
    if valor > preco_maximo:
        return jsonify({'sucesso': False, 'erro': f'Preço abusivo! O teto desta propriedade é de R$ {preco_maximo:,.2f}.'})

    ja_anunciada = AnuncioImovel.query.filter_by(propriedade_id=fazenda.id).first()
    if ja_anunciada:
        return jsonify({'sucesso': False, 'erro': 'Esta fazenda já está à venda na Corretora!'})

    novo_anuncio = AnuncioImovel(propriedade_id=fazenda.id, vendedor_id=usuario.id, valor=valor)
    db.session.add(novo_anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'A fazenda "{fazenda.nome}" foi anunciada na Corretora!'})

@imobiliaria_bp.route('/api/imobiliaria/comprar', methods=['POST'])
def comprar_imovel():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    if getattr(usuario, 'nivel', 1) < 3:
        return jsonify({'sucesso': False, 'erro': 'Apenas fazendeiros Nível 3+ podem comprar imóveis na Corretora!'})
        
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')

    anuncio = AnuncioImovel.query.get(anuncio_id)
    if not anuncio: return jsonify({'sucesso': False, 'erro': 'Este imóvel já foi vendido ou removido!'})
    
    if anuncio.vendedor_id == usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Você não pode comprar sua própria fazenda.'})

    if usuario.saldo < anuncio.valor:
        return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente para arrematar esta propriedade.'})

    vendedor = Jogador.query.get(anuncio.vendedor_id)
    fazenda = Propriedade.query.get(anuncio.propriedade_id)

    if not fazenda or fazenda.dono_id != vendedor.id:
        return jsonify({'sucesso': False, 'erro': 'Erro: A propriedade não pertence mais ao vendedor.'})

    imposto_corretora = anuncio.valor * 0.10
    valor_liquido_vendedor = anuncio.valor - imposto_corretora

    usuario.saldo -= anuncio.valor
    vendedor.saldo += valor_liquido_vendedor

    registrar_transacao(usuario.id, 'saida', anuncio.valor, f'Compra de Imóvel: {fazenda.nome}')
    registrar_transacao(vendedor.id, 'entrada', valor_liquido_vendedor, f'Venda de Imóvel: {fazenda.nome} (Retido 10% ITBI)')

    fazenda.dono_id = usuario.id
    
    if getattr(usuario, 'xp', None) is None: usuario.xp = 0
    usuario.xp += 500

    db.session.delete(anuncio)
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Parabéns! Você adquiriu a fazenda "{fazenda.nome}"!'})

# 🔥 NOVA ROTA: VENDA IMEDIATA PARA O BANCO
@imobiliaria_bp.route('/api/imobiliaria/vender_banco', methods=['POST'])
def vender_banco():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    fazenda_id = dados.get('fazenda_id')

    fazenda = Propriedade.query.get(fazenda_id)
    if not fazenda or fazenda.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Propriedade inválida ou não pertence a você.'})

    # 1. Remove a fazenda dos anúncios da corretora se estiver lá
    anuncio = AnuncioImovel.query.filter_by(propriedade_id=fazenda.id).first()
    if anuncio:
        db.session.delete(anuncio)

    # 2. Calcula 70% do valor ORIGINAL da terra
    valor_venda = fazenda.preco * 0.70

    # 3. Limpeza Extrema (Wipe) para o próximo dono pegar a terra limpa
    Animal.query.filter_by(propriedade_id=fazenda.id).delete()
    Maquinario.query.filter_by(propriedade_id=fazenda.id).delete()
    Equipe.query.filter_by(propriedade_id=fazenda.id).delete()

    lotes = Lote.query.filter_by(fazenda_id=fazenda.id).all()
    for lote in lotes:
        lote.status = 'mato'
        lote.tem_cerca = False
        lote.tem_bebedouro = False
        lote.tem_cocho = False
        lote.tem_cocho_racao = False
        lote.sistema_irrigacao = 'nenhum'
        lote.tipo_cultivo = None
        lote.tipo_capim = None
        lote.dias_plantado = 0
        lote.nivel_pragas = 0
        lote.fertilidade_solo = 100

    # Reseta a infraestrutura e os estoques do banco de dados
    fazenda.cap_silo = 500
    fazenda.cap_armazem = 200
    fazenda.cap_curral = 10
    fazenda.cap_barracao = 0
    fazenda.tem_represa_geral = False
    fazenda.tem_chiqueiro = False
    fazenda.tem_galinheiro = False
    
    for campo in ['est_milho', 'est_soja', 'est_arroz', 'est_feijao', 'est_algodao', 'est_mandioca', 
                  'est_cafe', 'est_cana', 'est_tomate', 'est_banana', 'est_cacau', 'est_acai', 
                  'est_cupuacu', 'est_pimenta', 'est_melancia', 'est_abacaxi',
                  'est_sal', 'est_racao', 'est_adubo', 'est_veneno', 'est_combustivel', 
                  'est_vacina_aftosa', 'est_vacina_brucelose', 'est_medicamento_geral', 
                  'est_suplemento_engorda', 'est_racao_peixe', 'est_leite', 'est_ovos']:
        if hasattr(fazenda, campo):
            setattr(fazenda, campo, 0)

    # 4. Desapropria a fazenda
    fazenda.dono_id = None

    # 5. Paga o jogador
    usuario.saldo += valor_venda
    registrar_transacao(usuario.id, 'entrada', valor_venda, f'Liquidação Banco: {fazenda.nome} (70% do Valor)')

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Fazenda liquidada! O banco pagou R$ {valor_venda:,.2f}.'})

@imobiliaria_bp.route('/imobiliaria')
def ver_imobiliaria():
    if 'usuario' not in session: return redirect(url_for('login'))
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    anuncios = AnuncioImovel.query.all()
    # 🔥 Puxa as propriedades do usuário para o template
    minhas_propriedades = Propriedade.query.filter_by(dono_id=usuario.id).all()
    return render_template('imobiliaria.html', user=usuario, anuncios=anuncios, minhas_propriedades=minhas_propriedades)

@imobiliaria_bp.route('/api/imobiliaria/cancelar', methods=['POST'])
def cancelar_imovel():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')

    anuncio = AnuncioImovel.query.get(anuncio_id)
    if not anuncio or anuncio.vendedor_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Anúncio não encontrado ou acesso negado.'})

    db.session.delete(anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Anúncio removido! A fazenda continua sendo sua.'})
