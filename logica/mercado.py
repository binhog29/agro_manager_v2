from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Anuncio, Propriedade, Animal, TABELA_PRECOS, INFO_ESPECIES, Maquinario
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
    
    # --- NOVO BLOCO: AGRUPANDO ANÚNCIOS IGUAIS DA COMUNIDADE ---
    anuncios_brutos = Anuncio.query.all()
    anuncios_agrupados = {}
    
    for a in anuncios_brutos:
        # A chave agrupa pelo mesmo vendedor, raça, fase e preço
        chave = f"{a.vendedor_id}_{a.animal.raca}_{a.animal.fase}_{a.valor}"
        if chave not in anuncios_agrupados:
            anuncios_agrupados[chave] = {
                'id': a.id, # Guarda o ID do primeiro animal do lote para o botão
                'vendedor_id': a.vendedor_id,
                'vendedor_nome': a.vendedor.username,
                'raca': a.animal.raca,
                'fase': a.animal.fase,
                'peso_total': 0.0,
                'valor': a.valor,
                'quantidade': 0
            }
        anuncios_agrupados[chave]['quantidade'] += 1
        anuncios_agrupados[chave]['peso_total'] += float(a.animal.peso or 0)
        
    anuncios = []
    for k, v in anuncios_agrupados.items():
        v['peso_medio'] = v['peso_total'] / v['quantidade']
        anuncios.append(v)
    # -----------------------------------------------------------
    
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
                           
@mercado_bp.route('/api/mercado/comprar_lote_ia', methods=['POST'])
def comprar_lote_ia():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    destino_id = dados.get('destino_id')
    usa_caminhao = dados.get('usa_caminhao', False)
    carrinho = dados.get('carrinho', [])
    
    if not carrinho: return jsonify({'sucesso': False, 'erro': 'Carrinho vazio.'})
    
    propriedade = Propriedade.query.get(destino_id)
    if not propriedade or propriedade.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': 'Destino inválido.'})
        
    fator_mercado = calcular_fator_dia(usuario.dia, usuario.mes, usuario.ano)
    
    # 1. Validações prévias de saldo e espaço
    custo_total_geral = 0.0
    total_animais = sum(item['quantidade'] for item in carrinho)
    
    animais_para_adicionar = []
    
    for item in carrinho:
        raca = item['raca']
        fase = item['fase'].lower()
        sexo = item['sexo'].upper()
        qtd = int(item['quantidade'])
        raca_lower = raca.lower()
        
        if raca not in TABELA_PRECOS: return jsonify({'sucesso': False, 'erro': f'Raça inválida: {raca}'})
        
        peso_adulto_kg = 390.0
        peso_jovem_kg = 90.0
        familia_animal = 'bovino_corte'
        
        for familia, dados_esp in INFO_ESPECIES.items():
            if raca_lower in [r.lower() for r in dados_esp.get('racas', [])]:
                peso_adulto_kg = float(dados_esp.get('peso_adulto', 390.0))
                peso_jovem_kg = float(dados_esp.get('peso_jovem', 90.0))
                familia_animal = familia
                break

        # Define o habitat e frete por cabeça
        if familia_animal == 'ave' or any(t in raca_lower for t in ['galinha', 'pato', 'peru', 'ave']):
            habitat = 'galinheiro'
            if not getattr(propriedade, 'tem_galinheiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Galinheiro!'})
            limite = getattr(propriedade, 'cap_galinheiro', 100)
            frete_cabeca = 5.0
            modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
        elif familia_animal == 'suino' or any(t in raca_lower for t in ['porco', 'leitao', 'javali', 'suino']):
            habitat = 'chiqueiro'
            if not getattr(propriedade, 'tem_chiqueiro', False): return jsonify({'sucesso': False, 'erro': 'Construa um Chiqueiro!'})
            limite = getattr(propriedade, 'cap_chiqueiro', 50)
            frete_cabeca = 15.0
            modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
        elif 'peixe' in familia_animal or any(t in raca_lower for t in ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau', 'peixe']):
            habitat = 'represa'
            if not getattr(propriedade, 'tem_represa_geral', False): return jsonify({'sucesso': False, 'erro': 'Construa uma Represa!'})
            limite = getattr(propriedade, 'cap_represa', 200)
            frete_cabeca = 5.0
            modelos_aceitos = ['Caminhão Baú (Frios)']
        elif familia_animal == 'equino' or any(t in raca_lower for t in ['cavalo', 'egua', 'equino']):
            habitat = 'haras'
            if not getattr(propriedade, 'tem_haras', False): return jsonify({'sucesso': False, 'erro': 'Construa um Haras!'})
            limite = getattr(propriedade, 'cap_haras', 10)
            frete_cabeca = 50.0
            modelos_aceitos = ['Caminhão Boiadeiro']
        elif familia_animal == 'ovino' or any(t in raca_lower for t in ['ovelha', 'cabra', 'ovino', 'caprino']):
            habitat = 'aprisco'
            if not getattr(propriedade, 'tem_aprisco', False): return jsonify({'sucesso': False, 'erro': 'Construa um Aprisco!'})
            limite = getattr(propriedade, 'cap_aprisco', 30)
            frete_cabeca = 15.0
            modelos_aceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro']
        else:
            habitat = 'curral' 
            limite = getattr(propriedade, 'cap_curral', 10)
            frete_cabeca = 50.0
            modelos_aceitos = ['Caminhão Boiadeiro']

        animais_atuais = Animal.query.filter_by(propriedade_id=propriedade.id, onde_esta=habitat).count()
        if animais_atuais + qtd > limite: 
            return jsonify({'sucesso': False, 'erro': f'{habitat.capitalize()} lotado! O limite é de {limite} animais.'})

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

        custo_total_geral += (preco_unitario * qtd)
        
        for _ in range(qtd):
            novo = Animal(propriedade_id=propriedade.id, raca=raca, fase=fase.capitalize(), sexo=sexo, peso=peso_animal, onde_esta=habitat, origem='Mercado Oficial')
            animais_para_adicionar.append(novo)

    # Cálculo do frete
    if usa_caminhao:
        frota_disponivel = Maquinario.query.filter(
            Maquinario.propriedade_id == propriedade.id, 
            Maquinario.modelo.in_(modelos_aceitos),
            Maquinario.nivel_combustivel >= 15,
            Maquinario.estado_conservacao >= 5
        ).all()
        
        if not frota_disponivel:
            return jsonify({'sucesso': False, 'erro': 'Sem frota disponível no barracão desta fazenda!'})
            
        for v in frota_disponivel[:1]: # Consome um veículo da frota
            v.nivel_combustivel -= 15
            v.estado_conservacao -= 5
        custo_frete = 0.0
    else:
        custo_frete = total_animais * frete_cabeca

    custo_final_com_frete = custo_total_geral + custo_frete

    if usuario.saldo < custo_final_com_frete:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente! Custa R$ {custo_final_com_frete:,.2f}'})

    usuario.saldo -= custo_final_com_frete
    texto_frete = " (Frete Grátis Frota)" if usa_caminhao else " + Frete"
    registrar_transacao(usuario.id, 'saida', custo_final_com_frete, f'Compra de Lote Completo ({total_animais} animais){texto_frete}')

    if getattr(usuario, 'xp', None) is None: usuario.xp = 0
    usuario.xp += (10 * total_animais)
    
    db.session.add_all(animais_para_adicionar)
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'Lote de {total_animais} animais entregue com sucesso!'})
                           