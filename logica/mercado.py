from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from sqlalchemy import func
from database import db, Jogador, Anuncio, Propriedade, Animal, TABELA_PRECOS
from logica.economia import registrar_transacao  # Importando nossa função de caixa

mercado_bp = Blueprint('mercado', __name__)

@mercado_bp.route('/api/mercado/precos')
def get_precos():
    return jsonify(TABELA_PRECOS)

@mercado_bp.route('/mercado')
def ver_mercado():
    if 'usuario' not in session: return redirect(url_for('login'))
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario: return redirect(url_for('login'))

    minhas_terras = Propriedade.query.filter_by(dono_id=usuario.id).all()
    anuncios = Anuncio.query.all()
    
    vendedores_ia = []
    for raca, info in TABELA_PRECOS.items():
        vendedores_ia.append({'id_ia': raca, 'valor': int(info['adulto'] * 1.1)})
        
    return render_template('mercado.html', 
                           anuncios=anuncios, 
                           anuncios_ia=vendedores_ia,
                           TABELA_PRECOS=TABELA_PRECOS,
                           minhas_terras=minhas_terras,
                           user=usuario)

@mercado_bp.route('/api/mercado/comprar_ia', methods=['POST'])
def comprar_ia():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    raca = dados.get('raca')
    fase = dados.get('fase')
    sexo = dados.get('sexo')
    quantidade = int(dados.get('quantidade', 1))
    destino_id = dados.get('destino_id')

    # Configurações de Logística Regional
    LIMITE_ADULTO = 20
    LIMITE_FILHOTE = 40
    FRETE_POR_CABECA = 50.0

    espaco_necessario = (quantidade * 0.5) if fase == 'filhote' else (quantidade * 1.0)
    capacidade_caminhao = LIMITE_FILHOTE if fase == 'filhote' else LIMITE_ADULTO

    if espaco_necessario > capacidade_caminhao:
        return jsonify({'sucesso': False, 'erro': f'Caminhão terceirizado não suporta essa quantidade de {fase}s.'})

    if raca not in TABELA_PRECOS: 
        return jsonify({'sucesso': False, 'erro': 'Raça inválida.'})
        
    propriedade = Propriedade.query.get(destino_id)
    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Destino inválido ou não pertence a você.'})

    # Cálculo do custo (Gado + Frete)
    preco_unitario = int(TABELA_PRECOS[raca][fase] * 1.1)
    custo_gado = preco_unitario * quantidade
    custo_frete = quantidade * FRETE_POR_CABECA
    custo_total = custo_gado + custo_frete

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! (Custo: R${custo_gado:,.2f} + Frete: R${custo_frete:,.2f})'})

    # Mapeamento de habitats
    raca_lower = raca.lower()
    if raca_lower in ['galinha', 'pato', 'peru']:
        habitat = 'galinheiro'
        if getattr(propriedade, 'tem_galinheiro', False) == False:
            return jsonify({'sucesso': False, 'erro': 'Você precisa construir um Galinheiro nesta propriedade primeiro!'})
            
    elif raca_lower == 'porco':
        habitat = 'chiqueiro'
        if getattr(propriedade, 'tem_chiqueiro', False) == False:
            return jsonify({'sucesso': False, 'erro': 'Você precisa construir um Chiqueiro nesta propriedade primeiro!'})
            
    elif raca_lower in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau']:
        habitat = 'represa'
        # AQUI ESTÁ A TRAVA DO PEIXE
        if getattr(propriedade, 'tem_represa_geral', False) == False:
            return jsonify({'sucesso': False, 'erro': 'Você precisa construir uma Represa nesta propriedade primeiro!'})
            
    else:
        habitat = 'curral' 
        
    # Trava de lotação do curral (Mantenha o que você já tem abaixo daqui)
    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        
    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais + quantidade > limite:
            return jsonify({'sucesso': False, 'erro': f'Tronco lotado! Espaço para mais {limite - animais_atuais}.'})

    # Desconta o dinheiro
    usuario.saldo -= custo_total
    
    # --- REGISTRA NO FLUXO DE CAIXA ---
    registrar_transacao(
        jogador_id=usuario.id, 
        tipo='saida', 
        valor=custo_total, 
        descricao=f'Compra de {quantidade}x {raca.capitalize()} + Frete'
    )

    animais_para_adicionar = []
    for _ in range(quantidade):
        peso_inicial = 6.0 if fase == 'filhote' else 18.0 
        novo_animal = Animal(
            propriedade_id=propriedade.id, raca=raca, fase=fase.capitalize(),
            sexo=sexo, peso=peso_inicial, onde_esta=habitat, origem='Mercado Oficial'
        )
        animais_para_adicionar.append(novo_animal)

    db.session.add_all(animais_para_adicionar)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Entrega realizada! Adquiriu {quantidade}x {raca.capitalize()} com frete de R${custo_frete:,.2f}.'})

@mercado_bp.route('/api/animal/vender_lote_curral', methods=['POST'])
def vender_lote_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    raca_alvo = dados.get('raca', '').lower()
    quantidade = int(dados.get('quantidade', 1))
    propriedade_id = dados.get('fazenda_id')
    
    animais = Animal.query.filter(
        Animal.propriedade_id == propriedade_id,
        func.lower(Animal.raca) == raca_alvo.lower(), 
        Animal.onde_esta == 'curral'
    ).limit(quantidade).all()
    
    if len(animais) < quantidade: return jsonify({'sucesso': False, 'erro': 'Quantidade insuficiente.'})
        
    valor_total = 0
    info_preco = TABELA_PRECOS.get(raca_alvo, {'adulto': 1000})
    for a in animais:
        valor_total += info_preco['adulto'] * 0.85
        db.session.delete(a)
        
    usuario.saldo += valor_total
    
    # --- REGISTRA NO FLUXO DE CAIXA ---
    registrar_transacao(
        jogador_id=usuario.id, 
        tipo='entrada', 
        valor=valor_total, 
        descricao=f'Venda Frigorífico ({quantidade}x {raca_alvo.capitalize()})'
    )
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Vendido por R$ {valor_total:,.2f}!'})

@mercado_bp.route('/api/mercado/anunciar', methods=['POST'])
def anunciar_leilao():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()

    # O int() garante que o Python não se confunda com o ID
    animal_id = int(dados.get('animal_id', 0))
    valor = float(dados.get('valor', 0))

    if valor <= 0: 
        return jsonify({'sucesso': False, 'erro': 'O valor deve ser maior que zero.'})

    from database import Animal, Propriedade, Anuncio 

    # ==========================================
    # 1. LÓGICA DE VENDA EM LOTE (animal_id == 0)
    # ==========================================
    if animal_id == 0:
        raca = dados.get('raca', '').lower()
        quantidade = int(dados.get('quantidade', 1))
        fazenda_id = int(dados.get('fazenda_id', 0))

        if not fazenda_id: 
            return jsonify({'sucesso': False, 'erro': 'Fazenda não identificada.'})

        # Puxa do curral exatamente a quantidade solicitada
        animais_disponiveis = Animal.query.filter(
            Animal.propriedade_id == fazenda_id,
            func.lower(Animal.raca) == raca,
            Animal.onde_esta == 'curral'
        ).limit(quantidade).all()

        if len(animais_disponiveis) < quantidade:
            return jsonify({'sucesso': False, 'erro': f'Você só tem {len(animais_disponiveis)} {raca.capitalize()}(s) no tronco!'})

        # Manda a boiada para o Leilão
        for a in animais_disponiveis:
            a.onde_esta = 'leilao'
            novo = Anuncio(vendedor_id=usuario.id, animal_id=a.id, valor=valor)
            db.session.add(novo)
            
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'{quantidade}x {raca.capitalize()} anunciados no Leilão!'})

    # ==========================================
    # 2. LÓGICA DE VENDA INDIVIDUAL (animal_id > 0)
    # ==========================================
    animal = Animal.query.get(animal_id)
    if not animal: 
        return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    # Confere se a propriedade onde o animal está pertence ao jogador
    prop = Propriedade.query.get(animal.propriedade_id)
    if not prop or prop.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Este animal não pertence às suas terras.'})

    # Tira do curral e anuncia
    animal.onde_esta = 'leilao'
    novo_anuncio = Anuncio(vendedor_id=usuario.id, animal_id=animal.id, valor=valor)
    
    db.session.add(novo_anuncio)
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': 'Animal anunciado com sucesso no Leilão!'})

@mercado_bp.route('/api/mercado/cancelar', methods=['POST'])
def cancelar_anuncio():
    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')

    from database import Anuncio
    anuncio = Anuncio.query.get(anuncio_id)
    
    if not anuncio or anuncio.vendedor_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Anúncio não encontrado ou não é seu.'})

    # Devolve o animal em segurança para o curral
    animal = Animal.query.get(anuncio.animal_id)
    if animal:
        animal.onde_esta = 'curral' 

    db.session.delete(anuncio)
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': 'Anúncio cancelado! O animal voltou para o seu curral.'})

@mercado_bp.route('/api/mercado/comprar_leilao', methods=['POST'])
def comprar_leilao():
    from database import db, Animal, Propriedade, Anuncio, Jogador
    from logica.economia import registrar_transacao

    if 'usuario' not in session: 
        return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()

    anuncio_id = dados.get('anuncio_id')
    fazenda_id = dados.get('fazenda_id')

    # Se o jogador novo não tiver terras, a compra não passa
    if not fazenda_id:
        return jsonify({'sucesso': False, 'erro': 'Você precisa comprar uma fazenda no mapa para receber o animal.'})
            
    anuncio = Anuncio.query.get(anuncio_id)
    if not anuncio:
        return jsonify({'sucesso': False, 'erro': 'Este animal já foi arrematado por outro jogador!'})

    # Evita que o jogador compre dele mesmo
    if anuncio.vendedor_id == usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Você não pode comprar seu próprio animal.'})

    propriedade = Propriedade.query.get(fazenda_id)
    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Propriedade de destino inválida.'})

    animal = Animal.query.get(anuncio.animal_id)
    if not animal:
        return jsonify({'sucesso': False, 'erro': 'Erro de registro. Animal não encontrado.'})

    # ========================================
    # CHECAGEM DE HABITAT E INFRAESTRUTURA
    # ========================================
    raca_lower = animal.raca.lower()
    if raca_lower in ['galinha', 'pato', 'peru']:
        habitat = 'galinheiro'
        if not getattr(propriedade, 'tem_galinheiro', False):
            return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro para abrigar aves!'})
            
    elif raca_lower == 'porco':
        habitat = 'chiqueiro'
        if not getattr(propriedade, 'tem_chiqueiro', False):
            return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro primeiro!'})
            
    elif raca_lower in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau']:
        habitat = 'represa'
        if not getattr(propriedade, 'tem_represa_geral', False):
            return jsonify({'sucesso': False, 'erro': 'Você precisa escavar uma Represa para este peixe!'})
            
    else:
        habitat = 'curral'

    # Trava de Lotação do Curral
    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais >= limite:
            return jsonify({'sucesso': False, 'erro': 'O tronco dessa propriedade está lotado!'})

    valor_compra = anuncio.valor

    # ========================================
    # TRANSFERÊNCIA FINANCEIRA (P2P)
    # ========================================
    if usuario.saldo < valor_compra:
        return jsonify({'sucesso': False, 'erro': 'Seu saldo é insuficiente.'})

    vendedor = Jogador.query.get(anuncio.vendedor_id)
    if vendedor:
        vendedor.saldo += valor_compra
        registrar_transacao(
            jogador_id=vendedor.id, 
            tipo='entrada', 
            valor=valor_compra, 
            descricao=f'Venda Leilão: {animal.raca.capitalize()}'
        )

    usuario.saldo -= valor_compra
    registrar_transacao(
        jogador_id=usuario.id, 
        tipo='saida', 
        valor=valor_compra, 
        descricao=f'Compra Leilão: {animal.raca.capitalize()}'
    )

    # ========================================
    # TRANSFERÊNCIA DO ANIMAL
    # ========================================
    animal.propriedade_id = propriedade.id
    animal.onde_esta = habitat
    animal.origem = 'Comunidade'
    
    # Remove a placa de venda
    db.session.delete(anuncio)
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Você arrematou um {animal.raca.capitalize()}!'})
