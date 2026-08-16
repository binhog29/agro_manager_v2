from flask import Blueprint, request, jsonify, session
from database import db, Jogador, Lote, Animal
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

    if acao == 'limpar':
        custo_trator = 500
        venda_madeira = 1500
        lucro_liquido = venda_madeira - custo_trator
        
        usuario.saldo += lucro_liquido
        lote.status = 'limpo'
        
        registrar_transacao(usuario.id, 'entrada', venda_madeira, f'Venda de Madeira Bruta ({lote.nome})')
        registrar_transacao(usuario.id, 'saida', custo_trator, f'Aluguel Trator/Desmatamento ({lote.nome})')
        mensagem = f'Mato limpo! A madeira rendeu R$ 1.500 e o trator custou R$ 500. Lucro de R$ 1.000!'

    elif acao == 'cercar':
        custo = 800
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'cercado'
        lote.tem_cerca = True
        registrar_transacao(usuario.id, 'saida', custo, f'Construção de Cercas ({lote.nome})')
        mensagem = 'Hectare cercado com sucesso! Pronto para receber capim.'

    elif acao == 'arar':
        custo = 600
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'arado'
        registrar_transacao(usuario.id, 'saida', custo, f'Preparo de Solo/Arado ({lote.nome})')
        mensagem = 'Solo arado e nivelado! Pronto para plantio de Grãos e Cereais.'

    # NOVO: Preparo de solo para Frutas/Café
    elif acao == 'covear':
        custo = 900
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.status = 'coveado'
        registrar_transacao(usuario.id, 'saida', custo, f'Abertura de Covas/Pomar ({lote.nome})')
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
    obra = dados.get('obra')

    if obra == 'cocho':
        custo = 400
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.tem_cocho = True
        registrar_transacao(usuario.id, 'saida', custo, f'Construção de Cocho ({lote.nome})')
        msg = "Cocho construído! Agora você pode servir sal e suplemento."

    elif obra == 'bebedouro':
        custo = 700
        if usuario.saldo < custo: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
        usuario.saldo -= custo
        lote.tem_bebedouro = True
        registrar_transacao(usuario.id, 'saida', custo, f'Escavação de Bebedouro ({lote.nome})')
        msg = "Tanque de água escavado com sucesso!"
    else:
        return jsonify({'sucesso': False, 'erro': 'Obra inválida.'})

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@terras_bp.route('/api/fazenda/reverter_pasto', methods=['POST'])
def reverter_pasto():
    dados = request.get_json()
    pasto_id = dados.get('pasto_id')
    pasto = Lote.query.get(pasto_id)
    if not pasto: return jsonify({'sucesso': False, 'erro': 'Pasto não encontrado.'})
    
    animais_no_pasto = Animal.query.filter_by(onde_esta=f'pasto_{pasto_id}').count()
    if animais_no_pasto > 0:
        return jsonify({'sucesso': False, 'erro': 'Você precisa retirar todo o gado antes de destruir o pasto!'})
    
    pasto.status = 'limpo'
    pasto.tipo_capim = None
    pasto.tem_cerca = False
    pasto.tem_cocho = False
    pasto.tem_bebedouro = False
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Pasto destruído e revertido para terra nua!'})
