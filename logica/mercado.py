from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from sqlalchemy import func
from database import db, Jogador, Anuncio, Propriedade, Animal, TABELA_PRECOS, INFO_ESPECIES
from logica.economia import registrar_transacao  
import random

mercado_bp = Blueprint('mercado', __name__)

# =======================================================
# ARQUITETURA OOP: CLASSE DE FLUTUAÇÃO DE MERCADO
# =======================================================
class CotacaoMercado:
    @staticmethod
    def calcular_fator_dia(dia, mes, ano):
        # Cria uma semente única baseada no dia do jogador. 
        # Isso garante que a cotação não mude loucamente a cada segundo, só quando o dia virar!
        semente = ano * 10000 + mes * 100 + dia
        rng = random.Random(semente)
        # O mercado varia de 85% a 115% do preço base
        return round(rng.uniform(0.85, 1.15), 2)

    @classmethod
    def gerar_historico(cls, jogador, dias_retroativos=7):
        historico = []
        d = getattr(jogador, 'dia', 1)
        m = getattr(jogador, 'mes', 1)
        a = getattr(jogador, 'ano', 2026)
        
        # Volta no tempo para gerar os pontos do gráfico
        for _ in range(dias_retroativos):
            historico.insert(0, {
                'label': f"{d:02d}/{m:02d}", 
                'fator': cls.calcular_fator_dia(d, m, a)
            })
            d -= 1
            if d <= 0:
                d = 30
                m -= 1
                if m <= 0:
                    m = 12
                    a -= 1
        return historico

# ==========================================
# ROTAS BÁSICAS DO MERCADO
# ==========================================
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
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        if quantidade <= 0:
            return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
        
    destino_id = dados.get('destino_id')

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

    preco_unitario = int(TABELA_PRECOS[raca][fase] * 1.1)
    custo_gado = preco_unitario * quantidade
    custo_frete = quantidade * FRETE_POR_CABECA
    custo_total = custo_gado + custo_frete

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! (Custo: R${custo_gado:,.2f} + Frete: R${custo_frete:,.2f})'})

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
        if getattr(propriedade, 'tem_represa_geral', False) == False:
            return jsonify({'sucesso': False, 'erro': 'Você precisa construir uma Represa nesta propriedade primeiro!'})
            
    else:
        habitat = 'curral' 
        
    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais + quantidade > limite:
            return jsonify({'sucesso': False, 'erro': f'Tronco lotado! Espaço para mais {limite - animais_atuais}.'})

    usuario.saldo -= custo_total
    
    registrar_transacao(
        jogador_id=usuario.id, 
        tipo='saida', 
        valor=custo_total, 
        descricao=f'Compra de {quantidade}x {raca.capitalize()} + Frete'
    )

    animais_para_adicionar = []
    
    peso_inicial = 18.0
    peso_jovem = 6.0
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_lower in dados_esp['racas']:
            peso_inicial = dados_esp['peso_adulto']
            peso_jovem = dados_esp['peso_jovem']
            break

    for _ in range(quantidade):
        peso_animal = peso_jovem if fase == 'filhote' else peso_inicial
        novo_animal = Animal(
            propriedade_id=propriedade.id, raca=raca, fase=fase.capitalize(),
            sexo=sexo, peso=peso_animal, onde_esta=habitat, origem='Mercado Oficial'
        )
        animais_para_adicionar.append(novo_animal)

    db.session.add_all(animais_para_adicionar)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Entrega realizada! Adquiriu {quantidade}x {raca.capitalize()} com frete de R${custo_frete:,.2f}.'})

# ==========================================
# NOVAS ROTAS DO FRIGORÍFICO: COTAÇÕES E ESTIMATIVA
# ==========================================
@mercado_bp.route('/api/mercado/dados_grafico', methods=['POST'])
def dados_grafico_cotacao():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    raca_alvo = dados.get('raca', '').lower()

    # Busca histórico da flutuação
    historico = CotacaoMercado.gerar_historico(usuario, 7)

    # Descobre o preço base
    info_preco = TABELA_PRECOS.get(raca_alvo, {'adulto': 1000})
    familia_animal = 'bovino_corte'
    peso_padrao_adulto = 18.0 
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_alvo in dados_esp['racas']:
            familia_animal = familia
            peso_padrao_adulto = dados_esp['peso_adulto']
            break

    preco_base = (info_preco['adulto'] * 0.85) / peso_padrao_adulto
    unidade = '@' if familia_animal in ['bovino_corte', 'bovino_leite', 'equino'] else 'Kg'

    labels = []
    valores = []
    for h in historico:
        labels.append(h['label'])
        valores.append(round(preco_base * h['fator'], 2))

    return jsonify({
        'sucesso': True,
        'labels': labels,
        'valores': valores,
        'unidade': unidade,
        'raca': raca_alvo.capitalize(),
        'fator_atual': historico[-1]['fator']
    })

@mercado_bp.route('/api/animal/estimar_frigorifico', methods=['POST'])
def estimar_frigorifico():
    if 'usuario' not in session: return jsonify({'sucesso': False})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    raca_alvo = dados.get('raca', '').lower()
    try:
        quantidade = int(dados.get('quantidade', 1))
    except ValueError:
        quantidade = 1
        
    propriedade_id = dados.get('fazenda_id')
    prop = Propriedade.query.get(propriedade_id)
    if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False})

    animais = Animal.query.filter(
        Animal.propriedade_id == propriedade_id,
        func.lower(Animal.raca) == raca_alvo, 
        Animal.onde_esta == 'curral'
    ).limit(quantidade).all()
    
    if not animais:
        return jsonify({'sucesso': True, 'valor': 0, 'encontrados': 0, 'fator': 1.0})
        
    valor_total = 0
    info_preco = TABELA_PRECOS.get(raca_alvo, {'adulto': 1000, 'filhote': 500})
    
    familia_animal = 'bovino_corte'
    peso_padrao_adulto = 18.0 
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_alvo in dados_esp['racas']:
            familia_animal = familia
            peso_padrao_adulto = dados_esp['peso_adulto']
            break

    # 🔥 APLICA O FATOR DE MERCADO DO DIA 🔥
    fator_mercado = CotacaoMercado.calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    preco_arroba_ou_kg = ((info_preco['adulto'] * 0.85) / peso_padrao_adulto) * fator_mercado 
    
    for a in animais:
        if a.fase.lower() == 'filhote':
            valor_total += info_preco['filhote'] * 0.85 
        else:
            valor_total += a.peso * preco_arroba_ou_kg
            
    return jsonify({'sucesso': True, 'valor': valor_total, 'encontrados': len(animais), 'fator': fator_mercado})

# ==========================================
# VENDA REALISTA NO FRIGORÍFICO COM FLUTUAÇÃO
# ==========================================
@mercado_bp.route('/api/animal/vender_lote_curral', methods=['POST'])
def vender_lote_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    raca_alvo = dados.get('raca', '').lower()
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        if quantidade <= 0: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida!'})
    except ValueError: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida!'})
         
    propriedade_id = dados.get('fazenda_id')
    prop = Propriedade.query.get(propriedade_id)
    if not prop or prop.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Tentativa de roubo bloqueada! Esta fazenda não é sua.'})
    
    animais = Animal.query.filter(
        Animal.propriedade_id == propriedade_id,
        func.lower(Animal.raca) == raca_alvo, 
        Animal.onde_esta == 'curral'
    ).limit(quantidade).all()
    
    if len(animais) < quantidade: 
        return jsonify({'sucesso': False, 'erro': f'Você não tem {quantidade} animais dessa raça no curral.'})
        
    valor_total = 0
    info_preco = TABELA_PRECOS.get(raca_alvo, {'adulto': 1000, 'filhote': 500})
    
    familia_animal = 'bovino_corte'
    peso_padrao_adulto = 18.0 
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_alvo in dados_esp['racas']:
            familia_animal = familia
            peso_padrao_adulto = dados_esp['peso_adulto']
            break

    # 🔥 APLICA O FATOR DE MERCADO DO DIA 🔥
    fator_mercado = CotacaoMercado.calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    preco_arroba_ou_kg = ((info_preco['adulto'] * 0.85) / peso_padrao_adulto) * fator_mercado

    msg_resumo = []
    
    for a in animais:
        if a.fase.lower() == 'filhote':
            valor_animal = info_preco['filhote'] * 0.85
            msg_resumo.append("1 Cab")
        else:
            valor_animal = a.peso * preco_arroba_ou_kg
            if familia_animal in ['bovino_corte', 'bovino_leite', 'equino']:
                msg_resumo.append(f"{a.peso:.1f}@")
            else:
                msg_resumo.append(f"{a.peso:.1f}Kg")
                
        valor_total += valor_animal
        db.session.delete(a)
        
    usuario.saldo += valor_total
    
    registrar_transacao(
        jogador_id=usuario.id, 
        tipo='entrada', 
        valor=valor_total, 
        descricao=f'Frigorífico ({quantidade}x {raca_alvo.capitalize()}) - Pesos: {", ".join(msg_resumo)[:50]}...'
    )
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'O Frigorífico pesou seus animais e te pagou R$ {valor_total:,.2f}!'})

# (Rotas de leilão mantidas intactas ocultas por brevidade, pode colar as suas do arquivo antigo aqui para baixo)
@mercado_bp.route('/api/mercado/anunciar', methods=['POST'])
def anunciar_leilao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    animal_id = int(dados.get('animal_id', 0))
    valor = float(dados.get('valor', 0))

    if valor <= 0: return jsonify({'sucesso': False, 'erro': 'O valor deve ser maior que zero.'})
    from database import Animal, Propriedade, Anuncio 

    if animal_id == 0:
        raca = dados.get('raca', '').lower()
        try:
            quantidade = int(dados.get('quantidade', 1))
            if quantidade <= 0: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida!'})
        except ValueError: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida!'})
            
        fazenda_id = int(dados.get('fazenda_id', 0))
        if not fazenda_id: return jsonify({'sucesso': False, 'erro': 'Fazenda não identificada.'})
            
        prop = Propriedade.query.get(fazenda_id)
        if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Acesso negado. A propriedade não é sua.'})

        animais_disponiveis = Animal.query.filter(Animal.propriedade_id == fazenda_id, func.lower(Animal.raca) == raca, Animal.onde_esta == 'curral').limit(quantidade).all()
        if len(animais_disponiveis) < quantidade: return jsonify({'sucesso': False, 'erro': f'Você só tem {len(animais_disponiveis)} {raca.capitalize()}(s) no tronco!'})

        for a in animais_disponiveis:
            a.onde_esta = 'leilao'
            novo = Anuncio(vendedor_id=usuario.id, animal_id=a.id, valor=valor)
            db.session.add(novo)
            
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'{quantidade}x {raca.capitalize()} anunciados no Leilão!'})

    animal = Animal.query.get(animal_id)
    if not animal: return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    prop = Propriedade.query.get(animal.propriedade_id)
    if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Este animal não pertence às suas terras.'})

    animal.onde_esta = 'leilao'
    novo_anuncio = Anuncio(vendedor_id=usuario.id, animal_id=animal.id, valor=valor)
    db.session.add(novo_anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Animal anunciado com sucesso no Leilão!'})

@mercado_bp.route('/api/mercado/cancelar', methods=['POST'])
def cancelar_anuncio():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')

    from database import Anuncio
    anuncio = Anuncio.query.get(anuncio_id)
    if not anuncio or anuncio.vendedor_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Anúncio não encontrado ou não é seu.'})

    animal = Animal.query.get(anuncio.animal_id)
    if animal: animal.onde_esta = 'curral' 

    db.session.delete(anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Anúncio cancelado! O animal voltou para o seu curral.'})

@mercado_bp.route('/api/mercado/comprar_leilao', methods=['POST'])
def comprar_leilao():
    from database import db, Animal, Propriedade, Anuncio, Jogador
    from logica.economia import registrar_transacao
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
        
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')
    fazenda_id = dados.get('fazenda_id')

    if not fazenda_id: return jsonify({'sucesso': False, 'erro': 'Você precisa comprar uma fazenda no mapa para receber o animal.'})
    anuncio = Anuncio.query.get(anuncio_id)
    if not anuncio: return jsonify({'sucesso': False, 'erro': 'Este animal já foi arrematado por outro jogador!'})
    if anuncio.vendedor_id == usuario.id: return jsonify({'sucesso': False, 'erro': 'Você não pode comprar seu próprio animal.'})

    propriedade = Propriedade.query.get(fazenda_id)
    if not propriedade or propriedade.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Propriedade de destino inválida.'})

    animal = Animal.query.get(anuncio.animal_id)
    if not animal: return jsonify({'sucesso': False, 'erro': 'Erro de registro. Animal não encontrado.'})

    raca_lower = animal.raca.lower()
    if raca_lower in ['galinha', 'pato', 'peru']:
        habitat = 'galinheiro'
        if not getattr(propriedade, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro para abrigar aves!'})
    elif raca_lower == 'porco':
        habitat = 'chiqueiro'
        if not getattr(propriedade, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro primeiro!'})
    elif raca_lower in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau']:
        habitat = 'represa'
        if not getattr(propriedade, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': 'Você precisa escavar uma Represa para este peixe!'})
    else: habitat = 'curral'

    if habitat == 'curral':
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais >= limite: return jsonify({'sucesso': False, 'erro': 'O tronco dessa propriedade está lotado!'})

    valor_compra = anuncio.valor
    if usuario.saldo < valor_compra: return jsonify({'sucesso': False, 'erro': 'Seu saldo é insuficiente.'})

    vendedor = Jogador.query.get(anuncio.vendedor_id)
    if vendedor:
        vendedor.saldo += valor_compra
        registrar_transacao(jogador_id=vendedor.id, tipo='entrada', valor=valor_compra, descricao=f'Venda Leilão: {animal.raca.capitalize()}')

    usuario.saldo -= valor_compra
    registrar_transacao(jogador_id=usuario.id, tipo='saida', valor=valor_compra, descricao=f'Compra Leilão: {animal.raca.capitalize()}')

    animal.propriedade_id = propriedade.id
    animal.onde_esta = habitat
    animal.origem = 'Comunidade'
    db.session.delete(anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Você arrematou um {animal.raca.capitalize()}!'})
