from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Maquinario, Transacao
from logica.economia import registrar_transacao

barracao_bp = Blueprint('barracao', __name__)

class Concessionaria:
    CATALOGO = {
        'trator_leve': {'nome': 'Trator Leve', 'tipo': 'Trator', 'hp': 75, 'preco': 85000},
        'trator_pesado': {'nome': 'Trator Pesado', 'tipo': 'Trator', 'hp': 220, 'preco': 350000},
        'trator_esteira': {'nome': 'Trator de Esteira', 'tipo': 'Trator', 'hp': 170, 'preco': 450000},
        'escavadeira': {'nome': 'Escavadeira', 'tipo': 'Escavadeira', 'hp': 140, 'preco': 550000},
        'colheitadeira': {'nome': 'Colheitadeira Grãos', 'tipo': 'Colheitadeira', 'hp': 320, 'preco': 850000},
        'pulverizador': {'nome': 'Pulverizador', 'tipo': 'Implemento', 'hp': 190, 'preco': 420000},
        'pulv_arrasto': {'nome': 'Pulverizador de Arrasto', 'tipo': 'Implemento', 'hp': 75, 'preco': 35000},
        'plantadeira': {'nome': 'Plantadeira', 'tipo': 'Implemento', 'hp': 120, 'preco': 150000},
        'grade_aradora': {'nome': 'Grade Aradora', 'tipo': 'Implemento', 'hp': 140, 'preco': 65000},
        'caminhonete_usada': {'nome': 'Caminhonete Usada', 'tipo': 'Veiculo', 'hp': 110, 'preco': 45000},
        'caminhonete_nova': {'nome': 'Caminhonete Nova', 'tipo': 'Veiculo', 'hp': 160, 'preco': 180000},
        'caminhao_boiadeiro': {'nome': 'Caminhão Boiadeiro', 'tipo': 'Caminhao', 'hp': 300, 'preco': 250000},
        'caminhao_bau': {'nome': 'Caminhão Baú (Frios)', 'tipo': 'Caminhao', 'hp': 250, 'preco': 200000},
        'caminhao_prancha': {'nome': 'Caminhão Prancha', 'tipo': 'Caminhao', 'hp': 400, 'preco': 380000}
    }

def get_imagem(modelo):
    mapa = {
        'Trator Leve': 'trator_leve.png',
        'Trator Pesado': 'trator_pesado.png',
        'Trator de Esteira': 'trator_esteira.png',
        'Escavadeira': 'escavadeira.png',
        'Colheitadeira Grãos': 'colheitadeira.png',
        'Pulverizador': 'pulverizador.png',
        'Pulverizador de Arrasto': 'pulv_arrasto.png',
        'Plantadeira': 'plantadeira.png',
        'Grade Aradora': 'grade_aradora.png',
        'Caminhão Boiadeiro': 'caminhao_boiadeiro.png',
        'Caminhão Baú (Frios)': 'caminhao_bau.png',
        'Caminhonete Usada': 'caminhonete_usada.png',
        'Caminhonete Nova': 'caminhonete_nova.png',
        'Caminhão Prancha': 'caminhao_prancha.png'
    }
    return mapa.get(modelo, 'trator.png')

@barracao_bp.route('/api/barracao/listar', methods=['GET'])
def listar_barracao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Não autenticado'})
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda_id = request.args.get('fazenda_id')
    
    if not fazenda_id: return jsonify({'sucesso': False, 'erro': 'ID não fornecido'})
    
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada'})

    # Traz somente as máquinas que estão na fazenda e paradas (não em viagem)
    maquinas = Maquinario.query.filter(
        Maquinario.propriedade_id == fazenda.id,
        db.or_(Maquinario.horas_viagem == None, Maquinario.horas_viagem <= 0)
    ).all()
    
    limite_vagas = fazenda.cap_barracao if getattr(fazenda, 'cap_barracao', 0) > 0 else 4
    
    lista = [{
        'id': m.id,
        'tipo': m.tipo,
        'modelo': m.modelo,
        'potencia_hp': m.potencia_hp,
        'saude': m.estado_conservacao,
        'combustivel': m.nivel_combustivel,
        'ipva': m.ipva_pago,
        'imagem': get_imagem(m.modelo),
        'em_viagem': bool(getattr(m, 'horas_viagem', 0) and m.horas_viagem > 0),
        'horas_restantes': getattr(m, 'horas_viagem', 0) or 0
    } for m in maquinas]
    
    return jsonify({
        'sucesso': True, 
        'maquinas': lista, 
        'estoque_diesel': getattr(fazenda, 'est_combustivel', 0) or 0,
        'limite_vagas': limite_vagas
    })

@barracao_bp.route('/api/barracao/comprar', methods=['POST'])
def comprar_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    
    chave = dados.get('chave_maquina')
    fazenda_id = dados.get('fazenda_id')
    
    maquina_info = Concessionaria.CATALOGO.get(chave)
    if not maquina_info: return jsonify({'sucesso': False, 'erro': 'Máquina não existe.'})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    limite = fazenda.cap_barracao if getattr(fazenda, 'cap_barracao', 0) > 0 else 4
    qtd_atual = Maquinario.query.filter_by(propriedade_id=fazenda.id).count()
    if qtd_atual >= limite:
        return jsonify({'sucesso': False, 'erro': f'Barracão lotado! Limite de {limite} vagas.'})

    if jogador.saldo < maquina_info['preco']:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custa R$ {maquina_info["preco"]:,.2f}.'})

    jogador.saldo -= maquina_info['preco']
    
    nova_maquina = Maquinario(
        propriedade_id=fazenda.id,
        tipo=maquina_info['tipo'],
        modelo=maquina_info['nome'],
        potencia_hp=maquina_info['hp'],
        estado_conservacao=100,
        nivel_combustivel=100,
        horas_viagem=0,
        destino_id=None
    )
    
    db.session.add(nova_maquina)
    registrar_transacao(jogador.id, 'saida', maquina_info['preco'], f'Compra de Máquina: {maquina_info["nome"]}')
    
    if getattr(jogador, 'xp', None) is None: jogador.xp = 0
    jogador.xp += 100
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{maquina_info["nome"]} estacionado no barracão!'})

@barracao_bp.route('/api/barracao/vender', methods=['POST'])
def vender_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    
    fazenda = Propriedade.query.filter_by(id=maquina.propriedade_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})

    preco_base = 0
    for chave, info in Concessionaria.CATALOGO.items():
        if info['nome'] == maquina.modelo:
            preco_base = info['preco']
            break
            
    valor_venda = preco_base * 0.50 if preco_base > 0 else 10000.0
    
    jogador.saldo += valor_venda
    registrar_transacao(jogador.id, 'entrada', valor_venda, f'Venda de Máquina (Usada): {maquina.modelo}')
    
    db.session.delete(maquina)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{maquina.modelo} vendido por R$ {valor_venda:,.2f}!'})

@barracao_bp.route('/api/barracao/expandir', methods=['POST'])
def expandir_barracao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    fazenda_id = dados.get('fazenda_id')
    
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    CUSTO_EXPANSAO = 150000.0
    VAGAS_ADCIONAIS = 4

    if jogador.saldo < CUSTO_EXPANSAO:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. A obra custa R$ {CUSTO_EXPANSAO:,.2f}.'})

    jogador.saldo -= CUSTO_EXPANSAO
    capacidade_atual = fazenda.cap_barracao if getattr(fazenda, 'cap_barracao', 0) > 0 else 4
    fazenda.cap_barracao = capacidade_atual + VAGAS_ADCIONAIS

    registrar_transacao(jogador.id, 'saida', CUSTO_EXPANSAO, f'Engenharia: Expansão do Barracão (+{VAGAS_ADCIONAIS} vagas)')
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Barracão expandido! Agora você tem {fazenda.cap_barracao} vagas.'})

@barracao_bp.route('/api/barracao/manutencao', methods=['POST'])
def manutencao_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    
    if maquina.estado_conservacao >= 100:
        return jsonify({'sucesso': False, 'erro': 'A máquina já está em perfeito estado!'})
        
    dano = 100 - maquina.estado_conservacao
    preco_base = 0
    for chave, info in Concessionaria.CATALOGO.items():
        if info['nome'] == maquina.modelo:
            preco_base = info['preco']
            break
            
    custo_reparo = dano * (preco_base * 0.0015) if preco_base > 0 else dano * 350.0
    
    if jogador.saldo < custo_reparo:
        return jsonify({'sucesso': False, 'erro': f'Faltou dinheiro pro mecânico. Custa R$ {custo_reparo:,.2f}.'})
        
    jogador.saldo -= custo_reparo
    maquina.estado_conservacao = 100
    
    registrar_transacao(jogador.id, 'saida', custo_reparo, f'Oficina: Reparo {maquina.modelo}')
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Manutenção concluída por R$ {custo_reparo:,.2f}! Máquina 100%.'})

@barracao_bp.route('/api/barracao/abastecer', methods=['POST'])
def abastecer_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    fazenda = Propriedade.query.filter_by(id=maquina.propriedade_id, dono_id=jogador.id).first()
    
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    espaco_tanque = 100 - maquina.nivel_combustivel
    if espaco_tanque <= 0:
        return jsonify({'sucesso': False, 'erro': 'O tanque já está cheio!'})
        
    estoque_diesel = getattr(fazenda, 'est_combustivel', 0)
    if estoque_diesel <= 0:
        return jsonify({'sucesso': False, 'erro': 'Você não tem Combustível no Armazém!'})
        
    gasto = min(espaco_tanque, estoque_diesel)
    fazenda.est_combustivel -= gasto
    maquina.nivel_combustivel += gasto
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{gasto} galões de Diesel transferidos pro tanque!'})

@barracao_bp.route('/api/barracao/transferir', methods=['POST'])
def transferir_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json() or {}
    
    maquina_id = dados.get('maquina_id')
    destino_id = int(dados.get('destino_id', 0))
    usa_prancha = dados.get('usa_prancha', False)
    
    maquina = Maquinario.query.get(maquina_id)
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    if getattr(maquina, 'horas_viagem', 0) > 0: return jsonify({'sucesso': False, 'erro': 'Esta máquina já está na estrada!'})
    
    prop_origem = Propriedade.query.get(maquina.propriedade_id)
    prop_destino = Propriedade.query.get(destino_id)
    
    if not prop_origem or prop_origem.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Origem inválida.'})
    if not prop_destino or prop_destino.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Destino inválido.'})
    if prop_origem.id == prop_destino.id: return jsonify({'sucesso': False, 'erro': 'A máquina já está nesta fazenda.'})
    
    limite = prop_destino.cap_barracao if getattr(prop_destino, 'cap_barracao', 0) > 0 else 4
    atual = Maquinario.query.filter_by(propriedade_id=prop_destino.id).count()
    
    if usa_prancha and maquina.tipo not in ['Veiculo', 'Caminhao']:
        if atual + 1 >= limite:
             return jsonify({'sucesso': False, 'erro': f'Barracão lotado no destino! Precisa de 2 vagas (a prancha viaja junto). Limite: {limite}.'})
    else:
        if atual >= limite:
            return jsonify({'sucesso': False, 'erro': f'O Barracão de destino está lotado! Limite: {limite} vagas.'})
        
    cidade_origem = prop_origem.nome.split(" de ")[-1]
    cidade_destino = prop_destino.nome.split(" de ")[-1]
    tempo_viagem = 6 if cidade_origem == cidade_destino else 24
    
    if maquina.tipo in ['Veiculo', 'Caminhao']:
        if maquina.nivel_combustivel < 15 or maquina.estado_conservacao < 5:
            return jsonify({'sucesso': False, 'erro': f'O {maquina.modelo} precisa ter no mínimo 15% de combustível e 5% de conservação para ir rodando.'})
        maquina.nivel_combustivel -= 15
        maquina.estado_conservacao -= 5
    else:
        if usa_prancha:
            prancha = Maquinario.query.filter(
                Maquinario.propriedade_id == prop_origem.id,
                Maquinario.modelo == 'Caminhão Prancha',
                db.or_(Maquinario.horas_viagem == None, Maquinario.horas_viagem <= 0),
                Maquinario.nivel_combustivel >= 15,
                Maquinario.estado_conservacao >= 5
            ).first()
            
            if not prancha:
                return jsonify({'sucesso': False, 'erro': 'Nenhum Caminhão Prancha disponível e abastecido nesta fazenda!'})
            
            prancha.nivel_combustivel -= 15
            prancha.estado_conservacao -= 5
            prancha.destino_id = prop_destino.id
            prancha.horas_viagem = tempo_viagem
        else:
            custo_transporte = 500.0 if cidade_origem == cidade_destino else 1500.0
            if usuario.saldo < custo_transporte:
                return jsonify({'sucesso': False, 'erro': f'Você precisa de R$ {custo_transporte:,.2f} para pagar o guincho terceirizado.'})
            usuario.saldo -= custo_transporte
            registrar_transacao(usuario.id, 'saida', custo_transporte, f'Logística: Guincho Terceirizado para {maquina.modelo}')
    
    maquina.destino_id = prop_destino.id
    maquina.horas_viagem = tempo_viagem
    
    if getattr(usuario, 'xp', None) is None: usuario.xp = 0
    usuario.xp += 15
    
    db.session.commit()
    msg_extra = "foi rodando pela estrada" if maquina.tipo in ['Veiculo', 'Caminhao'] else ("embarcado na sua Prancha" if usa_prancha else "embarcado no guincho terceirizado")
    return jsonify({'sucesso': True, 'msg': f'{maquina.modelo} {msg_extra}! Chega em {tempo_viagem} horas.'})
