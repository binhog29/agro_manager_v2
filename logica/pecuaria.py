from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Animal, Lote, Transacao

pecuaria_bp = Blueprint('pecuaria', __name__)

# ==========================================
# 1. ROTA CENTRAL DE MOVIMENTAÇÃO (INDIVIDUAL)
# ==========================================
@pecuaria_bp.route('/api/animal/manejo_curral', methods=['POST'])
def manejar_curral():
    dados = request.get_json()
    animal_id = dados.get('animal_id')
    destino = dados.get('destino') 
    
    animal = Animal.query.get(animal_id)
    if not animal:
        return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    if destino.startswith('pasto_'):
        try:
            id_do_lote = int(destino.split('_')[1])
            lote = Lote.query.get(id_do_lote)
            
            if not lote or lote.status != 'pasto':
                return jsonify({'sucesso': False, 'erro': f'O Lote {id_do_lote} não existe ou não está formado como pasto!'})
            
            animais_no_pasto = Animal.query.filter_by(lote_id=id_do_lote).count()
            if animais_no_pasto >= 10:
                return jsonify({'sucesso': False, 'erro': 'Pasto lotado!'})
            
            animal.lote_id = id_do_lote
            animal.onde_esta = destino
            
        except ValueError:
            return jsonify({'sucesso': False, 'erro': 'Número de pasto inválido.'})
            
    elif destino == 'curral':
        animal.lote_id = None
        animal.onde_esta = 'curral'
    else:
        return jsonify({'sucesso': False, 'erro': 'Destino desconhecido.'})
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Movimentação concluída com sucesso!'})

# ==========================================
# 4. ROTA PARA MOVER EM LOTE
# ==========================================
@pecuaria_bp.route('/api/animal/manejo_lote', methods=['POST'])
def manejar_lote():
    dados = request.get_json()
    animal_ids = dados.get('animal_ids', [])
    destino = dados.get('destino')

    if not animal_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado.'})

    animais = Animal.query.filter(Animal.id.in_(animal_ids)).all()
    movidos = 0
    novo_lote_id = None

    if destino.startswith('pasto_'):
        try:
            id_do_lote = int(destino.split('_')[1])
            lote = Lote.query.get(id_do_lote)
            if not lote or lote.status != 'pasto':
                return jsonify({'sucesso': False, 'erro': 'Pasto não formado!'})
            
            animais_no_pasto = Animal.query.filter_by(lote_id=id_do_lote).count()
            vagas_livres = 10 - animais_no_pasto
            
            animais_para_mover = animais[:vagas_livres]
            novo_lote_id = id_do_lote
            
            for animal in animais_para_mover:
                animal.onde_esta = destino
                animal.lote_id = novo_lote_id
                movidos += 1
        except ValueError:
            return jsonify({'sucesso': False, 'erro': 'Erro no ID do pasto.'})
    else:
        for animal in animais:
            animal.onde_esta = 'curral'
            animal.lote_id = None
            movidos += 1

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{movidos} animais movidos.'})

# ==========================================
# LISTAGENS E INSUMOS (MANTIDOS IGUAIS)
# ==========================================
@pecuaria_bp.route('/api/pecuaria/listar_curral', methods=['GET'])
def listar_curral():
    animais = Animal.query.filter_by(onde_esta='curral').all()
    return jsonify({'animais': [{'id': a.id, 'raca': a.raca, 'fase': getattr(a, 'fase', 'Adulto'), 'sexo': getattr(a, 'sexo', 'M'), 'peso': getattr(a, 'peso', 0.0)} for a in animais]})

@pecuaria_bp.route('/api/pecuaria/listar_pasto', methods=['GET'])
def listar_pasto():
    pasto_id = request.args.get('pasto_id')
    animais = Animal.query.filter_by(lote_id=pasto_id).all() # Busca pelo lote_id para ser preciso
    return jsonify({'animais': [{'id': a.id, 'raca': a.raca, 'fase': getattr(a, 'fase', 'Adulto'), 'sexo': getattr(a, 'sexo', 'M'), 'peso': getattr(a, 'peso', 0.0)} for a in animais]})

@pecuaria_bp.route('/api/animal/aplicar_insumo', methods=['POST'])
def aplicar_insumo():
    dados = request.get_json()
    animal = Animal.query.get(dados.get('animal_id'))
    if not animal: return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    acao = dados.get('acao')

    insumos = {
        'aftosa': ('est_vacina_aftosa', 'Vacina Aftosa'),
        'brucelose': ('est_vacina_brucelose', 'Vacina Brucelose'),
        'suplemento': ('est_suplemento_engorda', 'Suplemento Engorda'),
        'medicamento': ('est_medicamento_geral', 'Medicamento Geral')
    }

    if acao not in insumos: return jsonify({'sucesso': False, 'erro': 'Ação inválida.'})
    
    # --- VERIFICAÇÃO DE SAÚDE (BLOQUEIO) ---
    if acao == 'aftosa' and animal.vacinado_aftosa:
        return jsonify({'sucesso': False, 'erro': 'Animal já vacinado contra Aftosa!'})
    if acao == 'brucelose' and animal.vacinado_brucelose:
        return jsonify({'sucesso': False, 'erro': 'Animal já vacinado contra Brucelose!'})
    if acao == 'medicamento' and animal.medicado:
        return jsonify({'sucesso': False, 'erro': 'Animal já medicado!'})
    if acao == 'suplemento' and animal.suplementado:
        return jsonify({'sucesso': False, 'erro': 'Animal já suplementado!'})
    
    coluna, nome = insumos[acao]
    if getattr(fazenda, coluna) <= 0:
        return jsonify({'sucesso': False, 'erro': f'Sem {nome} no armazém!'})
    
    # Atualiza o estoque
    setattr(fazenda, coluna, getattr(fazenda, coluna) - 1)
    
    # Atualiza o estado de saúde do animal
    if acao == 'aftosa':
        animal.vacinado_aftosa = True
    elif acao == 'brucelose':
        animal.vacinado_brucelose = True
    elif acao == 'medicamento':
        animal.medicado = True
    elif acao == 'suplemento':
        animal.suplementado = True 
        animal.peso += 15.0
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{animal.raca} recebeu {nome}!'})

@pecuaria_bp.route('/api/fazenda/expandir_curral', methods=['POST'])
def expandir_curral():
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    if jogador.saldo < 6000: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
    
    jogador.saldo -= 6000
    fazenda.cap_curral = getattr(fazenda, 'cap_curral', 10) + 5
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Curral expandido!'})

# ==========================================
# 7. ROTA PARA LISTAR PASTOS DISPONÍVEIS
# ==========================================
@pecuaria_bp.route('/api/pecuaria/listar_pastos_disponiveis', methods=['GET'])
def listar_pastos_disponiveis():
    pastos = Lote.query.filter_by(status='pasto').all()
    lista_pastos = []
    for p in pastos:
        # Conta usando a string 'pasto_ID' que você já usa no 'onde_esta'
        destino_pasto = f'pasto_{p.id}'
        animais_no_pasto = Animal.query.filter_by(onde_esta=destino_pasto).count()
        
        if animais_no_pasto < 10:
            lista_pastos.append({'id': p.id, 'nome': p.nome})
            
    return jsonify({'pastos': lista_pastos})

@pecuaria_bp.route('/api/pecuaria/verificar_saude', methods=['POST'])
def verificar_saude_pastos():
    # Busca todos os lotes que são pastos
    lotes = Lote.query.filter_by(status='pasto').all()
    
    for lote in lotes:
        # Se faltar qualquer um dos dois, o gado sofre
        if not lote.tem_cocho or not lote.tem_bebedouro:
            animais = Animal.query.filter_by(lote_id=lote.id).all()
            for animal in animais:
                # Penalidade de 2 arrobas por turno de negligência
                if animal.peso > 10: 
                    animal.peso -= 2.0
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Saúde do gado atualizada.'})
