from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Animal, Lote, Transacao
import re

pecuaria_bp = Blueprint('pecuaria', __name__)

# ==========================================
# FUNÇÃO MESTRE: DESCOBRE A FAZENDA PELA URL
# ==========================================
def obter_fazenda_atual(usuario_id, referrer):
    try:
        if referrer:
            match = re.search(r'/fazenda/(\d+)', referrer)
            if match:
                fazenda_id = int(match.group(1))
                return Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario_id).first()
    except:
        pass
    return Propriedade.query.filter_by(dono_id=usuario_id).first()

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
# LISTAGENS E INSUMOS
# ==========================================
@pecuaria_bp.route('/api/pecuaria/listar_curral', methods=['GET'])
def listar_curral():
    if 'usuario' not in session: return jsonify({'animais': []})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario: return jsonify({'animais': []})
    
    fazenda = obter_fazenda_atual(usuario.id, request.referrer)
    if not fazenda: return jsonify({'animais': []})

    animais = Animal.query.filter_by(propriedade_id=fazenda.id, onde_esta='curral').all()
    
    return jsonify({'animais': [{
        'id': a.id, 
        'raca': a.raca, 
        'fase': getattr(a, 'fase', 'Adulto'), 
        'sexo': getattr(a, 'sexo', 'M'), 
        'peso': getattr(a, 'peso', 0.0),
        'vacinado_aftosa': getattr(a, 'vacinado_aftosa', False),
        'vacinado_brucelose': getattr(a, 'vacinado_brucelose', False),
        'medicado': getattr(a, 'medicado', False),
        'suplementado': getattr(a, 'suplementado', False)
    } for a in animais]})

@pecuaria_bp.route('/api/pecuaria/listar_pasto', methods=['GET'])
def listar_pasto():
    pasto_id = request.args.get('pasto_id')
    animais = Animal.query.filter_by(lote_id=pasto_id).all() 
    return jsonify({'animais': [{
        'id': a.id, 
        'raca': a.raca, 
        'fase': getattr(a, 'fase', 'Adulto'), 
        'sexo': getattr(a, 'sexo', 'M'), 
        'peso': getattr(a, 'peso', 0.0),
        'vacinado_aftosa': getattr(a, 'vacinado_aftosa', False),
        'vacinado_brucelose': getattr(a, 'vacinado_brucelose', False),
        'medicado': getattr(a, 'medicado', False),
        'suplementado': getattr(a, 'suplementado', False)
    } for a in animais]})

@pecuaria_bp.route('/api/animal/aplicar_insumo', methods=['POST'])
def aplicar_insumo():
    dados = request.get_json()
    animal = Animal.query.get(dados.get('animal_id'))
    if not animal: return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    
    fazenda = Propriedade.query.get(animal.propriedade_id)
    if not fazenda or fazenda.dono_id != jogador.id:
        return jsonify({'sucesso': False, 'erro': 'Este animal não é seu.'})
        
    acao = dados.get('acao')

    insumos = {
        'aftosa': ('est_vacina_aftosa', 'Vacina Aftosa'),
        'brucelose': ('est_vacina_brucelose', 'Vacina Brucelose'),
        'suplemento': ('est_suplemento_engorda', 'Suplemento Engorda'),
        'medicamento': ('est_medicamento_geral', 'Medicamento Geral')
    }

    if acao not in insumos: return jsonify({'sucesso': False, 'erro': 'Ação inválida.'})
    
    if acao == 'aftosa' and animal.vacinado_aftosa:
        return jsonify({'sucesso': False, 'erro': 'Animal já vacinado contra Aftosa!'})
    if acao == 'brucelose' and animal.vacinado_brucelose:
        return jsonify({'sucesso': False, 'erro': 'Animal já vacinado contra Brucelose!'})
    if acao == 'medicamento' and animal.medicado:
        return jsonify({'sucesso': False, 'erro': 'Animal já medicado!'})
    if acao == 'suplemento' and getattr(animal, 'suplementado', False):
        return jsonify({'sucesso': False, 'erro': 'Animal já suplementado!'})
    
    coluna, nome = insumos[acao]
    if getattr(fazenda, coluna) <= 0:
        return jsonify({'sucesso': False, 'erro': f'Sem {nome} no armazém da fazenda!'})
    
    setattr(fazenda, coluna, getattr(fazenda, coluna) - 1)
    
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

@pecuaria_bp.route('/api/animal/tratamento_lote', methods=['POST'])
def tratamento_lote():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    dados = request.get_json()
    animal_ids = dados.get('animal_ids', [])
    tipo = dados.get('tipo')
    
    if not animal_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado.'})
        
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    
    animais = Animal.query.filter(Animal.id.in_(animal_ids)).all()
    if not animais:
        return jsonify({'sucesso': False, 'erro': 'Animais não encontrados.'})
        
    fazenda = Propriedade.query.get(animais[0].propriedade_id)
    if not fazenda or fazenda.dono_id != jogador.id:
        return jsonify({'sucesso': False, 'erro': 'Permissão negada.'})
        
    animais_para_tratar = []
    
    for animal in animais:
        if tipo == 'aftosa' and not animal.vacinado_aftosa:
            animais_para_tratar.append(animal)
        elif tipo == 'brucelose' and not animal.vacinado_brucelose:
            animais_para_tratar.append(animal)
        elif tipo == 'medicamento' and not animal.medicado:
            animais_para_tratar.append(animal)
            
    qtd_necessaria = len(animais_para_tratar)
    
    if qtd_necessaria == 0:
        return jsonify({'sucesso': False, 'erro': 'Todos os animais selecionados já receberam este tratamento!'})
        
    if tipo == 'aftosa':
        if getattr(fazenda, 'est_vacina_aftosa', 0) < qtd_necessaria:
            return jsonify({'sucesso': False, 'erro': 'Sem Vacina Aftosa no armazém!'})
        fazenda.est_vacina_aftosa -= qtd_necessaria
        
    elif tipo == 'brucelose':
        if getattr(fazenda, 'est_vacina_brucelose', 0) < qtd_necessaria:
            return jsonify({'sucesso': False, 'erro': 'Sem Vacina Brucelose no armazém!'})
        fazenda.est_vacina_brucelose -= qtd_necessaria
        
    elif tipo == 'medicamento':
        if getattr(fazenda, 'est_medicamento_geral', 0) < qtd_necessaria:
            return jsonify({'sucesso': False, 'erro': 'Sem Medicamento Geral no armazém!'})
        fazenda.est_medicamento_geral -= qtd_necessaria
    else:
        return jsonify({'sucesso': False, 'erro': 'Tipo de tratamento inválido.'})
        
    for animal in animais_para_tratar:
        if tipo == 'aftosa':
            animal.vacinado_aftosa = True
        elif tipo == 'brucelose':
            animal.vacinado_brucelose = True
        elif tipo == 'medicamento':
            animal.medicado = True
            animal.saude = min(100, animal.saude + 30) 
            
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Tratamento aplicado com sucesso em {qtd_necessaria} animais!'})

@pecuaria_bp.route('/api/pasto/reabastecer', methods=['POST'])
def reabastecer_pasto():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    dados = request.get_json()
    lote_id = dados.get('lote_id')
    tipo = dados.get('tipo')
    quantidade = int(dados.get('quantidade', 5))
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    lote = Lote.query.get(lote_id)
    if not lote:
        return jsonify({'sucesso': False, 'erro': 'Pasto não encontrado.'})
        
    # CORREÇÃO AQUI: fazenda_id no lugar de propriedade_id
    fazenda = Propriedade.query.get(lote.fazenda_id)
    if not fazenda or fazenda.dono_id != jogador.id:
        return jsonify({'sucesso': False, 'erro': 'Pasto de outro jogador.'})
        
    animais_no_pasto = Animal.query.filter_by(lote_id=lote_id).all()
    
    if not animais_no_pasto:
        return jsonify({'sucesso': False, 'erro': 'O pasto está vazio! Traga o gado antes de colocar insumos.'})
        
    if tipo == 'sal':
        if getattr(fazenda, 'est_sal', 0) < quantidade:
            return jsonify({'sucesso': False, 'erro': f'Sem Sal no armazém! Necessário: {quantidade} un.'})
        fazenda.est_sal -= quantidade
        
        for animal in animais_no_pasto:
            animal.fome = max(0, animal.fome - 20)
            animal.saude = min(100, animal.saude + 10)
            
        msg = 'Sal fornecido no cocho com sucesso!'
        
    elif tipo == 'suplemento':
        if getattr(fazenda, 'est_suplemento_engorda', 0) < quantidade:
            return jsonify({'sucesso': False, 'erro': f'Sem Suplemento no armazém! Necessário: {quantidade} un.'})
        fazenda.est_suplemento_engorda -= quantidade
        
        for animal in animais_no_pasto:
            if not getattr(animal, 'suplementado', False):
                animal.suplementado = True
                animal.peso += 2.0 
                
        msg = 'Suplemento de engorda colocado no cocho!'
    else:
        return jsonify({'sucesso': False, 'erro': 'Insumo inválido.'})
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@pecuaria_bp.route('/api/fazenda/expandir_curral', methods=['POST'])
def expandir_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    
    fazenda = obter_fazenda_atual(jogador.id, request.referrer)
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})

    if jogador.saldo < 6000: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})
    
    jogador.saldo -= 6000
    fazenda.cap_curral = getattr(fazenda, 'cap_curral', 10) + 5
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Curral expandido!'})

@pecuaria_bp.route('/api/pecuaria/listar_pastos_disponiveis', methods=['GET'])
def listar_pastos_disponiveis():
    if 'usuario' not in session: return jsonify({'pastos': []})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    fazenda = obter_fazenda_atual(usuario.id, request.referrer)
    if not fazenda: return jsonify({'pastos': []})

    # CORREÇÃO DEFINITIVA: Usando o nome correto da coluna do banco de dados (fazenda_id)
    pastos = Lote.query.filter_by(fazenda_id=fazenda.id, status='pasto').all()

    lista_pastos = []
    for p in pastos:
        destino_pasto = f'pasto_{p.id}'
        animais_no_pasto = Animal.query.filter_by(onde_esta=destino_pasto).count()
        
        if animais_no_pasto < 10:
            lista_pastos.append({'id': p.id, 'nome': p.nome})
            
    return jsonify({'pastos': lista_pastos})

@pecuaria_bp.route('/api/pecuaria/verificar_saude', methods=['POST'])
def verificar_saude_pastos():
    lotes = Lote.query.filter_by(status='pasto').all()
    for lote in lotes:
        if not lote.tem_cocho or not lote.tem_bebedouro:
            animais = Animal.query.filter_by(lote_id=lote.id).all()
            for animal in animais:
                if animal.peso > 10: 
                    animal.peso -= 2.0
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Saúde do gado atualizada.'})
