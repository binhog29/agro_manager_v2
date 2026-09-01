from flask import Blueprint, request, jsonify, session
from database import db, Jogador, Lote, Animal, Propriedade
from logica.economia import registrar_transacao 

terras_bp = Blueprint('terras', __name__)

@terras_bp.route('/api/fazenda/obras', methods=['POST'])
def obras_terra():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    lote_id = dados.get('lote_id')
    acao = dados.get('acao')
    
    lote = Lote.query.get(lote_id)
    if not lote:
        return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})

    # 🔒 TRAVA ANTI-INJEÇÃO: Garante que o lote pertence ao logado
    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    if acao == 'limpar':
        # Verifica se a fazenda tem o Trator de Esteira no Barracão
        from database import Maquinario
        tem_esteira = Maquinario.query.filter_by(propriedade_id=lote.fazenda_id, modelo='Trator de Esteira').first()

        if tem_esteira:
            venda_madeira = 2500
            usuario.saldo += venda_madeira
            lote.status = 'limpo'
            
            registrar_transacao(usuario.id, 'entrada', venda_madeira, f'Venda de Madeira Pesada ({lote.nome})')
            
            if getattr(usuario, 'xp', None) is None: usuario.xp = 0
            usuario.xp += 15
            mensagem = f'Limpeza pesada concluída! O Trator de Esteira zerou o custo operacional e extraiu R$ 2.500 em madeira!'
        else:
            custo_trator = 500
            venda_madeira = 1500
            lucro_liquido = venda_madeira - custo_trator
            
            usuario.saldo += lucro_liquido
            lote.status = 'limpo'
            
            registrar_transacao(usuario.id, 'entrada', venda_madeira, f'Venda de Madeira Bruta ({lote.nome})')
            registrar_transacao(usuario.id, 'saida', custo_trator, f'Aluguel Trator/Desmatamento ({lote.nome})')
            
            if getattr(usuario, 'xp', None) is None: usuario.xp = 0
            usuario.xp += 15
            mensagem = f'Mato limpo! A madeira rendeu R$ 1.500 e o trator custou R$ 500. Lucro de R$ 1.000!'

    elif acao == 'cercar':
        custo = 800
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'cercado'
        lote.tem_cerca = True
        registrar_transacao(usuario.id, 'saida', custo, f'Construção de Cercas ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15
        mensagem = 'Hectare cercado com sucesso! Pronto para receber capim.'

    elif acao == 'arar':
        custo = 600
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'arado'
        registrar_transacao(usuario.id, 'saida', custo, f'Preparo de Solo/Arado ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15
        mensagem = 'Solo arado e nivelado! Pronto para plantio de Grãos e Cereais.'

    elif acao == 'covear':
        custo = 900
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'coveado'
        registrar_transacao(usuario.id, 'saida', custo, f'Abertura de Covas/Pomar ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15
        mensagem = 'Covas abertas e adubadas! Pronto para receber mudas de Frutas/Café.'

    elif acao in ['plantar_braquiaria', 'plantar_mombaca']:
        if acao == 'plantar_braquiaria':
            custo = 300
            especie_capim = 'braquiaria'
            nome_exibicao = 'Braquiária'
        else:
            custo = 450
            especie_capim = 'mombaca'
            nome_exibicao = 'Mombaça'

        if usuario.saldo < custo: 
            return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para sementes de {nome_exibicao}.'})
        
        usuario.saldo -= custo
        lote.status = 'pasto'
        lote.tipo_capim = especie_capim
        lote.qualidade_capim = 100
        registrar_transacao(usuario.id, 'saida', custo, f'Sementes de Capim {nome_exibicao} ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15
        mensagem = f'Pasto de {nome_exibicao} formado! Esta terra foi transferida para a aba "Pastos".'
        
    else:
        return jsonify({'sucesso': False, 'erro': 'Ação inválida.'})
            
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': mensagem})

@terras_bp.route('/api/fazenda/infra_pasto', methods=['POST'])
def infra_pasto():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))

    # 🔒 TRAVA ANTI-INJEÇÃO
    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    obra = dados.get('obra')

    if obra == 'cocho':
        custo = 400
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.tem_cocho = True
        registrar_transacao(usuario.id, 'saida', custo, f'Construção de Cocho ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15  
        msg = "Cocho construído! Agora você pode servir sal e suplemento."

    elif obra == 'cocho_racao':
        custo = 1200
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.tem_cocho_racao = True
        registrar_transacao(usuario.id, 'saida', custo, f'Linha de Ração ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15  
        msg = "Linha de Ração construída! Agora você pode realizar trato intensivo."

    elif obra == 'bebedouro':
        custo = 700
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.tem_bebedouro = True
        registrar_transacao(usuario.id, 'saida', custo, f'Escavação de Bebedouro ({lote.nome})')
        if getattr(usuario, 'xp', None) is None: usuario.xp = 0
        usuario.xp += 15  
        msg = "Tanque de água escavado com sucesso!"
    else:
        return jsonify({'sucesso': False, 'erro': 'Obra inválida.'})

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@terras_bp.route('/api/fazenda/reverter_pasto', methods=['POST'])
def reverter_pasto():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()

    dados = request.get_json()
    pasto_id = dados.get('pasto_id')
    pasto = Lote.query.get(pasto_id)
    if not pasto: return jsonify({'sucesso': False, 'erro': 'Pasto não encontrado.'})

    # 🔒 TRAVA ANTI-INJEÇÃO
    fazenda_alvo = Propriedade.query.get(pasto.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})
    
    animais_no_pasto = Animal.query.filter_by(onde_esta=f'pasto_{pasto_id}').count()
    if animais_no_pasto > 0:
        return jsonify({'sucesso': False, 'erro': 'Você precisa retirar todo o gado antes de destruir o pasto!'})
    
    pasto.status = 'limpo'
    pasto.tipo_capim = None
    pasto.tem_cerca = False
    pasto.tem_cocho = False
    pasto.tem_cocho_racao = False
    pasto.tem_bebedouro = False
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    # Impede que o XP fique negativo
    usuario.xp = max(0, usuario.xp - 15)  
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Pasto destruído e revertido para terra nua!'})

@terras_bp.route('/api/fazenda/reverter_cultivo', methods=['POST'])
def reverter_cultivo():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    dados = request.get_json()
    lote_id = dados.get('lote_id')
    
    lote = Lote.query.get(lote_id)
    if not lote: return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})

    # 🔒 TRAVA ANTI-INJEÇÃO
    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    custo_trator = 300
    if usuario.saldo < custo_trator:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para o aluguel do trator (R$ {custo_trator}).'})

    usuario.saldo -= custo_trator
    registrar_transacao(usuario.id, 'saida', custo_trator, f'Limpeza de Lavoura com Trator ({lote.nome})')

    lote.status = 'limpo'
    lote.tipo_cultivo = None
    lote.fase_planta = 'Nenhuma'
    lote.dias_plantado = 0.0
    lote.produtividade_atual = 100
    lote.nivel_pragas = 0
    lote.fertilidade_solo = 100
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    # Impede que o XP fique negativo
    usuario.xp = max(0, usuario.xp - 15)
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Lavoura destruída e revertida para terra nua!'})

@terras_bp.route('/api/fazenda/comprar_hectare', methods=['POST'])
def comprar_hectare():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    fazenda_id = dados.get('fazenda_id')

    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    qtd_lotes_atual = Lote.query.filter_by(fazenda_id=fazenda.id).count()
    custo = 15000.0 + (qtd_lotes_atual * 2000.0) # Cada novo hectare fica 2k mais caro

    if usuario.saldo < custo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Custa R$ {custo:,.2f}.'})

    usuario.saldo -= custo
    novo_lote = Lote(fazenda_id=fazenda.id, nome=f"Hectare {qtd_lotes_atual + 1}", status="mato")
    db.session.add(novo_lote)

    from logica.economia import registrar_transacao
    registrar_transacao(usuario.id, 'saida', custo, f'Aquisição de nova Terra (Hectare {qtd_lotes_atual + 1})')

    if getattr(usuario, 'xp', None) is None: usuario.xp = 0
    usuario.xp += 50

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Hectare comprado com sucesso por R$ {custo:,.2f}!'})
