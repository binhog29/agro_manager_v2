from flask import Blueprint, session, request, jsonify
from sqlalchemy import func
from database import db, Jogador, Anuncio, Propriedade, Animal
from logica.economia import registrar_transacao
from logica.constantes import TABELA_PRECOS # 🔥 Importando os preços reais para a Malha Fina

leilao_bp = Blueprint('leilao', __name__)

@leilao_bp.route('/api/mercado/anunciar', methods=['POST'])
def anunciar_leilao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    # 🛡️ ANTI-FAKE: Trava de Nível
    if getattr(usuario, 'nivel', 1) < 3:
        return jsonify({'sucesso': False, 'erro': 'Nível muito baixo! Alcance o Nível 3 para usar o Leilão.'})
        
    dados = request.get_json()
    animal_id = int(dados.get('animal_id', 0))
    valor = float(dados.get('valor', 0))

    if valor <= 0: return jsonify({'sucesso': False, 'erro': 'O valor deve ser maior que zero.'})

    if animal_id == 0:
        raca = dados.get('raca', '').lower()
        quantidade = int(dados.get('quantidade', 1))
        fazenda_id = int(dados.get('fazenda_id', 0))
        
        # 🛡️ ANTI-LAVAGEM: Teto de Preço (Máx 3x o valor base do animal adulto)
        preco_base = TABELA_PRECOS.get(raca, {}).get('adulto', 1000)
        limite_valor = preco_base * 5.0
        
        if valor > limite_valor:
            return jsonify({'sucesso': False, 'erro': f'Preço abusivo detectado! A Receita Federal definiu o teto para {raca.capitalize()} em R$ {limite_valor:,.2f}.'})
            
        prop = Propriedade.query.get(fazenda_id)
        if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})

        animais_disp = Animal.query.filter(Animal.propriedade_id == fazenda_id, func.lower(Animal.raca) == raca, Animal.onde_esta == 'curral').limit(quantidade).all()
        if len(animais_disp) < quantidade: return jsonify({'sucesso': False, 'erro': f'Você só tem {len(animais_disp)} {raca}(s) no tronco!'})

        for a in animais_disp:
            a.onde_esta = 'leilao'
            db.session.add(Anuncio(vendedor_id=usuario.id, animal_id=a.id, valor=valor))
            
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'{quantidade}x {raca.capitalize()} anunciados no Leilão!'})

    animal = Animal.query.get(animal_id)
    if not animal: return jsonify({'sucesso': False, 'erro': 'Animal não encontrado.'})
    
    # 🛡️ ANTI-LAVAGEM: Teto de Preço Individual
    raca = animal.raca.lower()
    preco_base = TABELA_PRECOS.get(raca, {}).get('adulto', 1000)
    limite_valor = preco_base * 5.0
    
    if valor > limite_valor:
        return jsonify({'sucesso': False, 'erro': f'Preço abusivo detectado! O teto para {raca.capitalize()} é R$ {limite_valor:,.2f}.'})
        
    prop = Propriedade.query.get(animal.propriedade_id)
    if not prop or prop.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Este animal não é seu.'})

    animal.onde_esta = 'leilao'
    db.session.add(Anuncio(vendedor_id=usuario.id, animal_id=animal.id, valor=valor))
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Animal anunciado com sucesso no Leilão!'})

@leilao_bp.route('/api/mercado/cancelar', methods=['POST'])
def cancelar_anuncio():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')

    anuncio = Anuncio.query.get(anuncio_id)
    if not anuncio or anuncio.vendedor_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Anúncio não encontrado.'})

    animal = Animal.query.get(anuncio.animal_id)
    if animal: animal.onde_esta = 'curral' 

    db.session.delete(anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Anúncio cancelado! O animal voltou para o seu curral.'})

@leilao_bp.route('/api/mercado/comprar_leilao', methods=['POST'])
def comprar_leilao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Faça login primeiro.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    
    # 🛡️ ANTI-FAKE: Trava de Nível para Comprar
    if getattr(usuario, 'nivel', 1) < 3:
        return jsonify({'sucesso': False, 'erro': 'Apenas fazendeiros Nível 3+ podem comprar na comunidade.'})
        
    dados = request.get_json()
    anuncio_id = dados.get('anuncio_id')
    fazenda_id = dados.get('fazenda_id')

    anuncio = Anuncio.query.get(anuncio_id)
    if not anuncio: return jsonify({'sucesso': False, 'erro': 'Já arrematado por outro!'})
    if anuncio.vendedor_id == usuario.id: return jsonify({'sucesso': False, 'erro': 'Não pode comprar seu próprio animal.'})

    propriedade = Propriedade.query.get(fazenda_id)
    if not propriedade or propriedade.dono_id != usuario.id: return jsonify({'sucesso': False, 'erro': 'Propriedade inválida.'})

    animal = Animal.query.get(anuncio.animal_id)
    
    # 🔥 Validações de Espaço Blindadas por Palavras-Chave 🔥
    raca_lower = animal.raca.lower()
    if any(t in raca_lower for t in ['galinha', 'pato', 'peru', 'ave']):
        habitat = 'galinheiro'
        if not getattr(propriedade, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro!'})
    elif any(t in raca_lower for t in ['porco', 'leitao', 'javali', 'suino']):
        habitat = 'chiqueiro'
        if not getattr(propriedade, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro!'})
    elif any(t in raca_lower for t in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau', 'peixe']):
        habitat = 'represa'
        if not getattr(propriedade, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': 'Construa uma Represa!'})
    else:
        habitat = 'curral'
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais >= limite: return jsonify({'sucesso': False, 'erro': 'Tronco lotado!'})

    usa_caminhao = dados.get('usa_caminhao', False)
    custo_frete = 0.0

    if usa_caminhao:
        modelo_necessario = 'Caminhão Baú (Frios)' if habitat == 'represa' else 'Caminhão Boiadeiro'
        from database import Maquinario
        tem_caminhao = Maquinario.query.filter_by(propriedade_id=propriedade.id, modelo=modelo_necessario).first()
        if not tem_caminhao:
            return jsonify({'sucesso': False, 'erro': f'Fraude detectada: Sem {modelo_necessario} na fazenda!'})
    else:
        custo_frete = 50.0  

    valor_compra = anuncio.valor + custo_frete
    if usuario.saldo < valor_compra: return jsonify({'sucesso': False, 'erro': 'Saldo insuficiente.'})

    vendedor = Jogador.query.get(anuncio.vendedor_id)
    if vendedor:
        vendedor.saldo += anuncio.valor 
        registrar_transacao(vendedor.id, 'entrada', anuncio.valor, f'Venda Leilão: {animal.raca.capitalize()}')

    usuario.saldo -= valor_compra
    texto_frete = " (Frete Grátis)" if usa_caminhao else " + Frete"
    registrar_transacao(usuario.id, 'saida', valor_compra, f'Compra Leilão: {animal.raca.capitalize()}{texto_frete}')

    animal.propriedade_id = propriedade.id
    animal.onde_esta = habitat
    animal.origem = 'Comunidade'
    db.session.delete(anuncio)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Você arrematou um {animal.raca.capitalize()}!'})
