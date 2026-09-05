from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Animal, Lote

gado_bp = Blueprint('gado', __name__)

@gado_bp.route('/api/animal/manejo_curral', methods=['POST'])
def manejar_curral():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()

    dados = request.get_json()
    animal_id = dados.get('animal_id')
    destino = dados.get('destino') 
    
    animal = Animal.query.get(animal_id)
    if not animal:
        return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
        
    fazenda_alvo = Propriedade.query.get(animal.propriedade_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Este animal não é seu!'})
    
    if destino.startswith('pasto_'):
        try:
            id_do_lote = int(destino.split('_')[1])
            lote = Lote.query.get(id_do_lote)
            
            if not lote or lote.fazenda_id != fazenda_alvo.id or lote.status != 'pasto':
                return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Pasto inválido ou não pertence a esta fazenda!'})
            
            limites = {'Chácara': 10, 'Sítio': 25, 'Fazenda': 50, 'Latifúndio': 100}
            limite_pasto = limites.get(getattr(fazenda_alvo, 'tipo', 'Chácara'), 10)
            
            animais_no_pasto = Animal.query.filter_by(lote_id=id_do_lote).count()
            if animais_no_pasto >= limite_pasto:
                return jsonify({'sucesso': False, 'erro': f'Pasto lotado! O limite aqui é de {limite_pasto} cabeças.'})
            
            animal.lote_id = id_do_lote
            animal.onde_esta = destino
            
        except ValueError:
            return jsonify({'sucesso': False, 'erro': 'Número de pasto inválido.'})
            
    elif destino == 'curral':
        # 🔥 CORREÇÃO: Verificando o limite do curral!
        limite_curral = getattr(fazenda_alvo, 'cap_curral', 10)
        animais_no_curral = Animal.query.filter_by(propriedade_id=fazenda_alvo.id, onde_esta='curral').count()
        
        if animais_no_curral >= limite_curral:
            return jsonify({'sucesso': False, 'erro': f'Tronco lotado! O limite do curral é de {limite_curral} cabeças.'})

        animal.lote_id = None
        animal.onde_esta = 'curral'
    else:
        return jsonify({'sucesso': False, 'erro': 'Destino desconhecido.'})
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 5
            
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Movimentação concluída com sucesso!'})

@gado_bp.route('/api/animal/manejo_lote', methods=['POST'])
def manejar_lote():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()

    dados = request.get_json()
    animal_ids = dados.get('animal_ids', [])
    destino = dados.get('destino')

    if not animal_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado.'})

    animais = Animal.query.filter(Animal.id.in_(animal_ids)).all()
    if not animais:
        return jsonify({'sucesso': False, 'erro': 'Animais não encontrados.'})

    fazenda_alvo = Propriedade.query.get(animais[0].propriedade_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Estes animais não são seus!'})

    movidos = 0
    novo_lote_id = None

    if destino.startswith('pasto_'):
        try:
            id_do_lote = int(destino.split('_')[1])
            lote = Lote.query.get(id_do_lote)
            
            if not lote or lote.fazenda_id != fazenda_alvo.id or lote.status != 'pasto':
                return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Pasto inválido ou não pertence a esta fazenda!'})
            
            limites = {'Chácara': 10, 'Sítio': 25, 'Fazenda': 50, 'Latifúndio': 100}
            limite_pasto = limites.get(getattr(fazenda_alvo, 'tipo', 'Chácara'), 10)
            
            animais_no_pasto = Animal.query.filter_by(lote_id=id_do_lote).count()
            vagas_livres = limite_pasto - animais_no_pasto
            
            animais_para_mover = animais[:vagas_livres]
            novo_lote_id = id_do_lote
            
            for animal in animais_para_mover:
                animal.onde_esta = destino
                animal.lote_id = novo_lote_id
                movidos += 1
        except ValueError:
            return jsonify({'sucesso': False, 'erro': 'Erro no ID do pasto.'})
    else:
        # 🔥 CORREÇÃO: Verificando as vagas do curral no retorno em lote!
        limite_curral = getattr(fazenda_alvo, 'cap_curral', 10)
        animais_no_curral = Animal.query.filter_by(propriedade_id=fazenda_alvo.id, onde_esta='curral').count()
        vagas_livres = limite_curral - animais_no_curral
        
        if vagas_livres <= 0:
            return jsonify({'sucesso': False, 'erro': f'Tronco lotado! O curral suporta apenas {limite_curral} cabeças.'})
            
        animais_para_mover = animais[:vagas_livres]
        
        for animal in animais_para_mover:
            animal.onde_esta = 'curral'
            animal.lote_id = None
            movidos += 1

    if movidos > 0:
        if getattr(usuario, 'xp', None) is None:
            usuario.xp = 0
        usuario.xp += (5 * movidos)

    db.session.commit()
    
    if movidos < len(animais):
        return jsonify({'sucesso': True, 'msg': f'Apenas {movidos} animais foram movidos. Faltou espaço no destino!'})
        
    return jsonify({'sucesso': True, 'msg': f'{movidos} animais movidos.'})

@gado_bp.route('/api/pecuaria/listar_curral', methods=['GET'])
def listar_curral():
    if 'usuario' not in session: 
        return jsonify({'animais': []})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    if not jogador: 
        return jsonify({'animais': []})
        
    fazenda_id = request.args.get('fazenda_id')
    if not fazenda_id:
        return jsonify({'animais': []})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: 
        return jsonify({'animais': []})
    
    animais = Animal.query.filter_by(propriedade_id=fazenda.id, onde_esta='curral').all()
    
    return jsonify({'animais': [{
        'id': a.id, 
        'raca': a.raca, 
        'fase': getattr(a, 'fase', 'Adulto'), 
        'sexo': getattr(a, 'sexo', 'M'), 
        'peso': round(float(getattr(a, 'peso', 0.0)), 1),
        'vacinado_aftosa': getattr(a, 'vacinado_aftosa', False),
        'vacinado_brucelose': getattr(a, 'vacinado_brucelose', False),
        'medicado': getattr(a, 'medicado', False),
        'suplementado': getattr(a, 'suplementado', False),
        'prenha': getattr(a, 'prenha', False),
        'dias_gestacao': float(getattr(a, 'dias_gestacao', 0.0))
    } for a in animais]})

@gado_bp.route('/api/pecuaria/listar_pasto', methods=['GET'])
def listar_pasto():
    pasto_id = request.args.get('pasto_id')
    pasto = Lote.query.get(pasto_id)
    animais = Animal.query.filter_by(lote_id=pasto_id).all() 
    
    tem_sal = getattr(pasto, 'qtd_sal_cocho', 0) > 0 if pasto and getattr(pasto, 'tem_cocho', False) else False
    tem_racao = getattr(pasto, 'qtd_racao_cocho', 0) > 0 if pasto and getattr(pasto, 'tem_cocho_racao', False) else False
    
    lista = []
    for a in animais:
        ganho = 0.0
        if tem_sal and tem_racao: ganho = 3.0
        elif tem_sal or tem_racao: ganho = 2.0
        else: ganho = 0.4
        
        if getattr(a, 'suplementado', False): ganho += 1.0
        if not getattr(a, 'vacinado_aftosa', False): ganho *= 0.7
        if not getattr(a, 'vacinado_brucelose', False): ganho *= 0.7
        if not getattr(a, 'medicado', False): ganho *= 0.8
        
        status_peso = f"<span style='color:#4caf50;'>📈 +{ganho:.1f} kg/dia</span>"
        if float(getattr(a, 'saude', 100)) <= 30: 
            status_peso = "<span style='color:#f44336;'>📉 Doente (Perdendo Peso)</span>"
            
        lista.append({
            'id': a.id, 
            'raca': a.raca, 
            'fase': getattr(a, 'fase', 'Adulto'), 
            'sexo': getattr(a, 'sexo', 'M'),
            'peso': round(float(getattr(a, 'peso', 0.0)), 1),
            'vacinado_aftosa': getattr(a, 'vacinado_aftosa', False),
            'vacinado_brucelose': getattr(a, 'vacinado_brucelose', False),
            'medicado': getattr(a, 'medicado', False),
            'suplementado': getattr(a, 'suplementado', False),
            'status_peso': status_peso,
            'prenha': getattr(a, 'prenha', False),
            'dias_gestacao': float(getattr(a, 'dias_gestacao', 0.0))
        })
    return jsonify({'animais': lista})

@gado_bp.route('/api/animal/aplicar_insumo', methods=['POST'])
def aplicar_insumo():
    dados = request.get_json()
    animal = Animal.query.get(dados.get('animal_id'))
    if not animal: return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    fazenda = Propriedade.query.filter_by(id=animal.propriedade_id, dono_id=jogador.id).first()
    
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada ou acesso negado.'})
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
        return jsonify({'sucesso': False, 'erro': f'Sem {nome} no armazém!'})
    
    setattr(fazenda, coluna, getattr(fazenda, coluna) - 1)
    
    if acao == 'aftosa':
        animal.vacinado_aftosa = True
    elif acao == 'brucelose':
        animal.vacinado_brucelose = True
    elif acao == 'medicamento':
        animal.medicado = True
    elif acao == 'suplemento':
        animal.suplementado = True 
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 15
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{animal.raca} recebeu {nome}!'})

@gado_bp.route('/api/animal/tratamento_lote', methods=['POST'])
def tratamento_lote():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    dados = request.get_json()
    animal_ids = dados.get('animal_ids', [])
    tipo = dados.get('tipo')
    fazenda_id = dados.get('fazenda_id')
    
    if not animal_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado.'})
        
    if not fazenda_id:
        return jsonify({'sucesso': False, 'erro': 'Falha: Fazenda de destino não identificada.'})
        
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
        
    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada ou acesso negado.'})
    
    animais = Animal.query.filter(Animal.id.in_(animal_ids), Animal.propriedade_id == fazenda.id).all()
    animais_para_tratar = []
    
    for animal in animais:
        if tipo == 'aftosa' and not animal.vacinado_aftosa:
            animais_para_tratar.append(animal)
        elif tipo == 'brucelose' and not animal.vacinado_brucelose:
            animais_para_tratar.append(animal)
        elif tipo == 'medicamento' and not animal.medicado:
            animais_para_tratar.append(animal)
        elif tipo == 'suplemento' and not getattr(animal, 'suplementado', False):
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
    elif tipo == 'suplemento':
        if getattr(fazenda, 'est_suplemento_engorda', 0) < qtd_necessaria:
            return jsonify({'sucesso': False, 'erro': 'Sem Suplemento de Engorda no armazém!'})
        fazenda.est_suplemento_engorda -= qtd_necessaria
    else:
        return jsonify({'sucesso': False, 'erro': 'Tipo de tratamento inválido.'})
        
    for animal in animais_para_tratar:
        if tipo == 'aftosa':
            animal.vacinado_aftosa = True
        elif tipo == 'brucelose':
            animal.vacinado_brucelose = True
        elif tipo == 'medicamento':
            animal.medicado = True
            animal.saude = min(100, float(animal.saude or 100) + 30) 
        elif tipo == 'suplemento':
            animal.suplementado = True
            
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += (15 * qtd_necessaria)
            
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Tratamento aplicado com sucesso em {qtd_necessaria} animais!'})

@gado_bp.route('/api/pasto/reabastecer', methods=['POST'])
def reabastecer_pasto():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
        
    dados = request.get_json()
    lote_id = dados.get('lote_id')
    tipo = dados.get('tipo')
    quantidade = int(dados.get('quantidade', 1))
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    lote = Lote.query.get(lote_id)
    
    if not lote: 
        return jsonify({'sucesso': False, 'erro': 'Pasto não encontrado.'})
        
    fazenda = Propriedade.query.filter_by(id=lote.fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada ou acesso negado.'})
        
    if tipo == 'sal':
        qtd_atual = getattr(lote, 'qtd_sal_cocho', 0.0) or 0.0
        espaco_livre = 10.0 - qtd_atual 
        if espaco_livre <= 0: return jsonify({'sucesso': False, 'erro': 'O cocho mineral já está cheio!'})
        if quantidade > espaco_livre: quantidade = int(espaco_livre)
        if getattr(fazenda, 'est_sal', 0) < quantidade:
            return jsonify({'sucesso': False, 'erro': f'Sem Sal suficiente no armazém!'})
        fazenda.est_sal -= quantidade
        lote.qtd_sal_cocho = qtd_atual + float(quantidade)
        msg = f'{quantidade} sacos de Sal despejados no cocho!'
        
    elif tipo == 'racao':
        if not getattr(lote, 'tem_cocho_racao', False): 
            return jsonify({'sucesso': False, 'erro': 'Este pasto não possui Linha de Ração construída!'})
        qtd_atual = getattr(lote, 'qtd_racao_cocho', 0.0) or 0.0
        espaco_livre = 20.0 - qtd_atual 
        if espaco_livre <= 0: return jsonify({'sucesso': False, 'erro': 'A linha de ração já está cheia!'})
        if quantidade > espaco_livre: quantidade = int(espaco_livre)
        if getattr(fazenda, 'est_racao', 0) < quantidade:
            return jsonify({'sucesso': False, 'erro': f'Sem Ração suficiente no armazém!'})
        fazenda.est_racao -= quantidade
        lote.qtd_racao_cocho = qtd_atual + float(quantidade)
        msg = f'{quantidade} sacos de Ração despejados na linha!'
    else:
        return jsonify({'sucesso': False, 'erro': 'Insumo inválido.'})
        
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@gado_bp.route('/api/pecuaria/listar_pastos_disponiveis', methods=['GET'])
def listar_pastos_disponiveis():
    if 'usuario' not in session: return jsonify({'pastos': []})
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    
    fazenda_id = request.args.get('fazenda_id')
    if not fazenda_id:
        return jsonify({'pastos': []})
        
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda: return jsonify({'pastos': []})
    
    limites = {'Chácara': 10, 'Sítio': 25, 'Fazenda': 50, 'Latifúndio': 100}
    limite_pasto = limites.get(getattr(fazenda, 'tipo', 'Chácara'), 10)
    
    pastos = Lote.query.filter_by(fazenda_id=fazenda.id, status='pasto').all()
    lista_pastos = []
    for p in pastos:
        destino_pasto = f'pasto_{p.id}'
        if Animal.query.filter_by(onde_esta=destino_pasto).count() < limite_pasto:
            lista_pastos.append({'id': p.id, 'nome': p.nome})
            
    return jsonify({'pastos': lista_pastos})

@gado_bp.route('/api/pecuaria/verificar_saude', methods=['POST'])
def verificar_saude_pastos():
    lotes = Lote.query.filter_by(status='pasto').all()
    for lote in lotes:
        if not lote.tem_cocho or not lote.tem_bebedouro:
            for animal in Animal.query.filter_by(lote_id=lote.id).all():
                if animal.peso > 10: animal.peso -= 2.0
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Saúde do gado atualizada.'})

@gado_bp.route('/api/animal/transferir_lote', methods=['POST'])
def transferir_lote():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    usuario = Jogador.query.filter_by(username=session['usuario']).with_for_update().first()
    dados = request.get_json()
    
    animal_ids = dados.get('animal_ids', [])
    fazenda_origem_id = int(dados.get('fazenda_origem_id'))
    fazenda_destino_id = int(dados.get('fazenda_destino_id'))
    usa_caminhao = dados.get('usa_caminhao', False)
    
    if not animal_ids: return jsonify({'sucesso': False, 'erro': 'Nenhum animal selecionado.'})
    if fazenda_origem_id == fazenda_destino_id: return jsonify({'sucesso': False, 'erro': 'A origem e o destino são a mesma fazenda.'})
    
    prop_origem = Propriedade.query.filter_by(id=fazenda_origem_id).with_for_update().first()
    prop_destino = Propriedade.query.filter_by(id=fazenda_destino_id).with_for_update().first()
    
    if not prop_origem or prop_origem.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Origem inválida.'})
    if not prop_destino or prop_destino.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Destino inválido.'})
    
    animais = Animal.query.filter(Animal.id.in_(animal_ids), Animal.propriedade_id == prop_origem.id).all()
    if not animais: return jsonify({'sucesso': False, 'erro': 'Animais não encontrados.'})
    
    quantidade = len(animais)
    primeiro_animal = animais[0]
    raca_lower = primeiro_animal.raca.lower()
    
    from logica.constantes import INFO_ESPECIES
    from database import Maquinario
    
    familia_animal = 'bovino_corte'
    for f, d in INFO_ESPECIES.items():
        if raca_lower in [r.lower() for r in d.get('racas', [])]:
            familia_animal = f
            break
            
    # 🎯 Descobre o habitat de destino e as regras de frete
    if familia_animal == 'ave' or any(t in raca_lower for t in ['galinha', 'pato', 'peru']):
        habitat = 'galinheiro'
        if not getattr(prop_destino, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': f'O destino "{prop_destino.nome}" não possui Galinheiro!'})
        limite = getattr(prop_destino, 'cap_galinheiro', 100)
        frete_cabeca = 5.0
        modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
    elif familia_animal == 'suino' or any(t in raca_lower for t in ['porco', 'leitao', 'javali']):
        habitat = 'chiqueiro'
        if not getattr(prop_destino, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': f'O destino "{prop_destino.nome}" não possui Chiqueiro!'})
        limite = getattr(prop_destino, 'cap_chiqueiro', 50)
        frete_cabeca = 15.0
        modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
    elif 'peixe' in familia_animal or any(t in raca_lower for t in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa']):
        habitat = 'represa'
        if not getattr(prop_destino, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': f'O destino "{prop_destino.nome}" não possui Represa!'})
        limite = getattr(prop_destino, 'cap_represa', 200)
        frete_cabeca = 5.0
        modelos_aceitos = ['Caminhão Baú (Frios)']
    else:
        habitat = 'curral'
        limite = getattr(prop_destino, 'cap_curral', 10)
        frete_cabeca = 50.0
        modelos_aceitos = ['Caminhão Boiadeiro']
        
    animais_no_destino = Animal.query.filter_by(propriedade_id=prop_destino.id, onde_esta=habitat).count()
    if animais_no_destino + quantidade > limite:
        return jsonify({'sucesso': False, 'erro': f'Lotação excedida! O {habitat.capitalize()} de destino só tem {limite - animais_no_destino} vagas.'})
        
    # 🚚 Lógica de Frete vs Caminhão Próprio
    custo_frete = 0.0
    
    if usa_caminhao:
        tem_veiculo = Maquinario.query.filter(
            Maquinario.propriedade_id == prop_origem.id,
            Maquinario.modelo.in_(modelos_aceitos),
            Maquinario.nivel_combustivel >= 15,
            Maquinario.estado_conservacao >= 5
        ).first()
        
        if not tem_veiculo:
            return jsonify({'sucesso': False, 'erro': 'A fazenda de ORIGEM não tem nenhum veículo livre, abastecido (>15%) e inteiro (>5%) que suporte essa carga!'})
            
        # O veículo desgasta com a viagem!
        tem_veiculo.nivel_combustivel -= 15
        tem_veiculo.estado_conservacao -= 5
    else:
        custo_frete = quantidade * frete_cabeca
        
    if usuario.saldo < custo_frete:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para pagar a transportadora. Custa R$ {custo_frete:,.2f}.'})
        
    if custo_frete > 0:
        usuario.saldo -= custo_frete
        from logica.economia import registrar_transacao
        registrar_transacao(usuario.id, 'saida', custo_frete, f'Logística: Frete de Transferência ({quantidade} cabeças)')
        
    # Desembarca os animais no destino
    for a in animais:
        a.propriedade_id = prop_destino.id
        a.lote_id = None
        a.onde_esta = habitat
        
    if getattr(usuario, 'xp', None) is None: usuario.xp = 0
    usuario.xp += (quantidade * 2) 
        
    db.session.commit()
    
    meio_transporte = "com a sua frota própria" if usa_caminhao else "por transportadora"
    return jsonify({'sucesso': True, 'msg': f'Carga despachada {meio_transporte}! {quantidade} animais chegaram na fazenda "{prop_destino.nome}".'})
