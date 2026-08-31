from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Maquinario, Transacao
from logica.economia import registrar_transacao

barracao_bp = Blueprint('barracao', __name__)

# ==========================================
# OOP: CATÁLOGO DE MAQUINÁRIOS (Concessionária)
# ==========================================
class Concessionaria:
    CATALOGO = {
        'trator_leve': {'nome': 'Trator Leve', 'tipo': 'Trator', 'hp': 75, 'preco': 85000},
        'trator_pesado': {'nome': 'Trator Pesado', 'tipo': 'Trator', 'hp': 220, 'preco': 350000},
        'trator_esteira': {'nome': 'Trator de Esteira', 'tipo': 'Trator', 'hp': 170, 'preco': 450000},
        'escavadeira': {'nome': 'Escavadeira', 'tipo': 'Escavadeira', 'hp': 140, 'preco': 550000},
        'colheitadeira': {'nome': 'Colheitadeira Grãos', 'tipo': 'Colheitadeira', 'hp': 320, 'preco': 850000},
        'pulverizador': {'nome': 'Pulverizador', 'tipo': 'Implemento', 'hp': 190, 'preco': 420000},
        'caminhonete_usada': {'nome': 'Caminhonete Usada', 'tipo': 'Veiculo', 'hp': 110, 'preco': 45000},
        'caminhonete_nova': {'nome': 'Caminhonete Nova', 'tipo': 'Veiculo', 'hp': 160, 'preco': 180000},
        'caminhao_boiadeiro': {'nome': 'Caminhão Boiadeiro', 'tipo': 'Caminhao', 'hp': 300, 'preco': 250000},
        'caminhao_bau': {'nome': 'Caminhão Baú (Frios)', 'tipo': 'Caminhao', 'hp': 250, 'preco': 200000}
    }

@barracao_bp.route('/api/barracao/listar', methods=['GET'])
def listar_barracao():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda_id = request.args.get('fazenda_id')
    
    if not fazenda_id: return jsonify({'sucesso': False})
    
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False})

    maquinas = Maquinario.query.filter_by(propriedade_id=fazenda.id).all()
    limite_vagas = fazenda.cap_barracao if getattr(fazenda, 'cap_barracao', 0) > 0 else 4
    
    def get_imagem(modelo):
        mapa = {
            'Trator Leve': 'trator_leve.png',
            'Trator Pesado': 'trator_pesado.png',
            'Trator de Esteira': 'trator_esteira.png',
            'Escavadeira': 'escavadeira.png',
            'Colheitadeira Grãos': 'colheitadeira.png',
            'Pulverizador': 'pulverizador.png',
            'Caminhão Boiadeiro': 'caminhao_boiadeiro.png',
            'Caminhão Baú (Frios)': 'caminhao_bau.png',
            'Caminhonete Usada': 'caminhonete_usada.png',
            'Caminhonete Nova': 'caminhonete_nova.png'
        }
        return mapa.get(modelo, 'trator.png')
    
    lista = [{
        'id': m.id,
        'tipo': m.tipo,
        'modelo': m.modelo,
        'potencia_hp': m.potencia_hp,
        'saude': m.estado_conservacao,
        'combustivel': m.nivel_combustivel,
        'ipva': m.ipva_pago,
        'imagem': get_imagem(m.modelo)
    } for m in maquinas]
    
    return jsonify({
        'sucesso': True, 
        'maquinas': lista, 
        'estoque_diesel': getattr(fazenda, 'est_combustivel', 0),
        'limite_vagas': limite_vagas
    })

@barracao_bp.route('/api/barracao/comprar', methods=['POST'])
def comprar_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
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
        nivel_combustivel=100
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
    dados = request.get_json()
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    
    fazenda = Propriedade.query.filter_by(id=maquina.propriedade_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})

    # Busca o preço original na concessionária
    preco_base = 0
    for chave, info in Concessionaria.CATALOGO.items():
        if info['nome'] == maquina.modelo:
            preco_base = info['preco']
            break
            
    # O ferro-velho paga 50% do valor da tabela
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
    dados = request.get_json()
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
    if 'usuario' not in session: return jsonify({'sucesso': False})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
    if not maquina: return jsonify({'sucesso': False, 'erro': 'Máquina não encontrada.'})
    
    if maquina.estado_conservacao >= 100:
        return jsonify({'sucesso': False, 'erro': 'A máquina já está em perfeito estado!'})
        
    dano = 100 - maquina.estado_conservacao
    custo_reparo = dano * 350.0
    
    if jogador.saldo < custo_reparo:
        return jsonify({'sucesso': False, 'erro': f'Faltou dinheiro pro mecânico. Custa R$ {custo_reparo:,.2f}.'})
        
    jogador.saldo -= custo_reparo
    maquina.estado_conservacao = 100
    
    registrar_transacao(jogador.id, 'saida', custo_reparo, f'Oficina: Reparo {maquina.modelo}')
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Manutenção concluída! Máquina 100%.'})

@barracao_bp.route('/api/barracao/abastecer', methods=['POST'])
def abastecer_maquina():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    maquina = Maquinario.query.get(dados.get('maquina_id'))
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
