from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Anuncio, Propriedade, Animal, TABELA_PRECOS, INFO_ESPECIES
from logica.economia import registrar_transacao
import random

mercado_bp = Blueprint('mercado', __name__)

PRECOS_REAIS = {
    'bovino_corte': 280.0,
    'bovino_leite': 250.0,
    'equino': 15.0,
    'suino': 8.0,
    'ave': 15.0,
    'peixe_gigante': 20.0,  
    'peixe_medio': 10.0,    
    'ovino': 20.0
}

def calcular_fator_dia(dia, mes, ano):
    semente = ano * 10000 + mes * 100 + dia
    rng = random.Random(semente)
    return round(rng.uniform(0.85, 1.15), 2)

@mercado_bp.route('/api/mercado/precos')
def get_precos():
    usuario = Jogador.query.filter_by(username=session.get('usuario')).first()
    fator = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano) if usuario else 1.0
    
    precos_dinamicos = {}
    for raca, info in TABELA_PRECOS.items():
        raca_lower = raca.lower()
        familia = 'bovino_corte'
        peso_adulto_kg = 390.0
        peso_filhote_kg = 90.0
        
        for f, d in INFO_ESPECIES.items():
            if raca_lower in [r.lower() for r in d.get('racas', [])]:
                familia = f
                peso_adulto_kg = float(d.get('peso_adulto', 390.0))
                peso_filhote_kg = float(d.get('peso_jovem', 90.0))
                break
                
        preco_base = PRECOS_REAIS.get(familia, 200.0) * fator
        
        # 🔥 Cavalos e Ovelhas saíram da lista de Arrobas!
        if familia in ['bovino_corte', 'bovino_leite']:
            peso_formatado_adulto = round(peso_adulto_kg / 30.0, 1)
            peso_formatado_filhote = round(peso_filhote_kg / 30.0, 1)
            valor_adulto = (peso_formatado_adulto * preco_base) * 1.10
            unidade = '@'
        else:
            peso_formatado_adulto = peso_adulto_kg
            peso_formatado_filhote = peso_filhote_kg
            valor_adulto = (peso_adulto_kg * preco_base) * 1.10
            unidade = 'Kg'

        valor_filhote = (info.get('filhote', 1100) * fator) * 1.10
        
        precos_dinamicos[raca] = {
            'filhote': int(valor_filhote),
            'adulto': int(valor_adulto),
            'peso_filhote': peso_formatado_filhote,
            'peso_adulto': peso_formatado_adulto,
            'unidade': unidade
        }
        
    return jsonify(precos_dinamicos)

@mercado_bp.route('/mercado')
def ver_mercado():
    if 'usuario' not in session: return redirect(url_for('login'))
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    if not usuario: return redirect(url_for('login'))

    minhas_terras = Propriedade.query.filter_by(dono_id=usuario.id).all()
    anuncios = Anuncio.query.all()
    
    fator_mercado = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    vendedores_ia = []
    
    for raca, info in TABELA_PRECOS.items():
        raca_lower = raca.lower()
        familia_animal = 'bovino_corte'
        peso_adulto_kg = 390.0
        
        for f, d in INFO_ESPECIES.items():
            if raca_lower in [r.lower() for r in d.get('racas', [])]:
                familia_animal = f
                peso_adulto_kg = float(d.get('peso_adulto', 390.0))
                break
        
        preco_base = PRECOS_REAIS.get(familia_animal, 200.0) * fator_mercado
        
        if familia_animal in ['bovino_corte', 'bovino_leite']:
            peso_arrobas = round(peso_adulto_kg / 30.0, 1) 
            valor_adulto_justo = (peso_arrobas * preco_base) * 1.10
            info_peso_texto = f"{peso_arrobas} @"
        else:
            valor_adulto_justo = (peso_adulto_kg * preco_base) * 1.10
            info_peso_texto = f"{peso_adulto_kg:.0f} Kg"
        
        vendedores_ia.append({
            'id_ia': raca, 
            'valor': int(valor_adulto_justo),
            'peso_texto': info_peso_texto
        })
        
    return render_template('mercado.html', 
                           anuncios=anuncios, 
                           anuncios_ia=vendedores_ia,
                           TABELA_PRECOS=TABELA_PRECOS,
                           minhas_terras=minhas_terras,
                           user=usuario)

@mercado_bp.route('/api/mercado/comprar_ia', methods=['POST'])
def comprar_ia():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    raca = dados.get('raca')
    fase = dados.get('fase', 'adulto').lower()
    sexo = dados.get('sexo', 'M').upper()
    raca_lower = raca.lower() if raca else ''
    
    try:
        quantidade = int(dados.get('quantidade', 1))
        if quantidade <= 0: return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
    except ValueError:
        return jsonify({'sucesso': False, 'erro': 'Quantidade inválida.'})
        
    destino_id = dados.get('destino_id')

    LIMITE_ADULTO = 20
    LIMITE_FILHOTE = 40

    espaco_necessario = (quantidade * 0.5) if fase == 'filhote' else (quantidade * 1.0)
    capacidade_caminhao = LIMITE_FILHOTE if fase == 'filhote' else LIMITE_ADULTO

    if espaco_necessario > capacidade_caminhao:
        return jsonify({'sucesso': False, 'erro': f'Caminhão não suporta essa quantidade.'})

    if raca not in TABELA_PRECOS: return jsonify({'sucesso': False, 'erro': 'Raça inválida.'})
        
    propriedade = Propriedade.query.get(destino_id)
    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Destino inválido.'})

    peso_adulto_kg = 390.0
    peso_jovem_kg = 90.0
    familia_animal = 'bovino_corte'
    
    for familia, dados_esp in INFO_ESPECIES.items():
        if raca_lower in [r.lower() for r in dados_esp.get('racas', [])]:
            peso_adulto_kg = float(dados_esp.get('peso_adulto', 390.0))
            peso_jovem_kg = float(dados_esp.get('peso_jovem', 90.0))
            familia_animal = familia
            break

    # 🔥 AQUI ESTÃO APENAS AS TRAVAS DE LIMITE ADICIONADAS. O RESTO CONTINUA INTACTO!
    if familia_animal == 'ave' or any(t in raca_lower for t in ['galinha', 'pato', 'peru', 'ave']):
        habitat = 'galinheiro'
        if not getattr(propriedade, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro!'})
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='galinheiro').count()
        limite = getattr(propriedade, 'cap_galinheiro', 100)
        if animais_atuais + quantidade > limite: return jsonify({'sucesso': False, 'erro': f'Galinheiro lotado! O limite é de {limite} aves.'})
        
    elif familia_animal == 'suino' or any(t in raca_lower for t in ['porco', 'leitao', 'javali', 'suino']):
        habitat = 'chiqueiro'
        if not getattr(propriedade, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro!'})
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='chiqueiro').count()
        limite = getattr(propriedade, 'cap_chiqueiro', 50)
        if animais_atuais + quantidade > limite: return jsonify({'sucesso': False, 'erro': f'Chiqueiro lotado! O limite é de {limite} suínos.'})
        
    elif 'peixe' in familia_animal or any(t in raca_lower for t in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau', 'peixe']):
        habitat = 'represa'
        if not getattr(propriedade, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': 'Construa uma Represa!'})
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='represa').count()
        limite = getattr(propriedade, 'cap_represa', 200)
        if animais_atuais + quantidade > limite: return jsonify({'sucesso': False, 'erro': f'Represa lotada! O limite é de {limite} peixes.'})
        
    else:
        habitat = 'curral' 
        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta='curral').count()
        limite = propriedade.cap_curral if hasattr(propriedade, 'cap_curral') else 10
        if animais_atuais + quantidade > limite: return jsonify({'sucesso': False, 'erro': 'Tronco lotado!'})

    fator_mercado = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    desconto_sexo = 0.90 if sexo == 'F' else 1.0
    
    if fase == 'filhote':
        preco_base_filhote = TABELA_PRECOS.get(raca_lower, {}).get('filhote', 1100)
        preco_unitario = ((preco_base_filhote * fator_mercado) * 1.10) * desconto_sexo
        peso_animal = peso_jovem_kg
    else:
        preco_base = PRECOS_REAIS.get(familia_animal, 200.0) * fator_mercado
        if familia_animal in ['bovino_corte', 'bovino_leite']:
            peso_arrobas = round(peso_adulto_kg / 30.0, 1)
            preco_unitario = ((peso_arrobas * preco_base) * 1.10) * desconto_sexo
        else:
            preco_unitario = ((peso_adulto_kg * preco_base) * 1.10) * desconto_sexo
        peso_animal = peso_adulto_kg

    # Valor dinâmico do frete por cabeça
    if familia_animal in ['ave', 'peixe_medio', 'peixe_gigante']:
        frete_cabeca = 5.0
    elif familia_animal in ['suino', 'ovino']:
        frete_cabeca = 15.0
    else:
        frete_cabeca = 50.0

    usa_caminhao = dados.get('usa_caminhao', False)
    
    if usa_caminhao:
        if habitat == 'represa':
            modelos_aceitos = ['Caminhão Baú (Frios)']
            msg_erro = 'Sem Caminhão Baú (Frios) na fazenda!'
        elif familia_animal in ['ave', 'suino', 'ovino']:
            modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
            msg_erro = 'Sem Caminhonete ou Caminhão Boiadeiro!'
        else:
            modelos_aceitos = ['Caminhão Boiadeiro']
            msg_erro = 'Sem Caminhão Boiadeiro na fazenda!'
            
        from database import Maquinario
        tem_veiculo = Maquinario.query.filter(
            Maquinario.propriedade_id == propriedade.id, 
            Maquinario.modelo.in_(modelos_aceitos)
        ).first()
        
        if not tem_veiculo:
            return jsonify({'sucesso': False, 'erro': f'Fraude detectada: {msg_erro}'})
        custo_frete = 0.0
    else:
        custo_frete = quantidade * frete_cabeca

    custo_gado = preco_unitario * quantidade
    custo_total = custo_gado + custo_frete

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Custa R$ {custo_total:,.2f}'})

    usuario.saldo -= custo_total
    
    texto_frete = " (Frete Grátis)" if usa_caminhao else " + Frete"
    registrar_transacao(usuario.id, 'saida', custo_total, f'Compra de {quantidade}x {raca.capitalize()}{texto_frete}')

    animais_para_adicionar = []
    for _ in range(quantidade):
        novo = Animal(propriedade_id=propriedade.id, raca=raca, fase=fase.capitalize(), sexo=sexo, peso=peso_animal, onde_esta=habitat, origem='Mercado Oficial')
        animais_para_adicionar.append(novo)

    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
        
    usuario.xp += 10
    
    db.session.add_all(animais_para_adicionar)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Entrega realizada! Animais no {habitat.capitalize()}'})
