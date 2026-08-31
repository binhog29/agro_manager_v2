from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Lote, Transacao
from logica.economia import registrar_transacao

cultivo_bp = Blueprint('cultivo', __name__)

MULTIPLICADOR_AREA = {
    'Chácara': 1,
    'Sítio': 5,
    'Fazenda': 15,
    'Latifúndio': 30
}

class Cultura:
    def __init__(self, nome, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita):
        self.nome = nome
        self.custo_semente = custo_semente
        self.producao_kg = producao_kg
        self.tempo_colheita = tempo_colheita 
        self.preparo_exigido = preparo_exigido 
        self.custo_maquina_plantio = custo_maquina_plantio
        self.custo_maquina_colheita = custo_maquina_colheita
        self.tipo_biologia = 'anual'

    def processar_pos_colheita(self, lote):
        lote.status = self.preparo_exigido 
        lote.dias_plantado = 0.0
        lote.ciclos_colhidos = 0
        lote.dias_descanso = 0.0

    def obter_estagio_e_progresso(self, dias_plantado, dias_descanso=0, estacao_atual='primavera'):
        if dias_plantado >= self.tempo_colheita:
            return "Ponto de Colheita", 100, 0

        progresso_pct = min(100, int((dias_plantado / self.tempo_colheita) * 100))
        dias_restantes = int(self.tempo_colheita - dias_plantado)

        if progresso_pct < 20:
            estagio = "Semente/Muda"
        elif progresso_pct < 50:
            estagio = "Crescimento Vegetativo"
        elif progresso_pct < 80:
            estagio = "Floração"
        else:
            estagio = "Amadurecendo"

        return estagio, progresso_pct, dias_restantes

class CulturaPerene(Cultura):
    def __init__(self, nome, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita, tempo_descanso, max_ciclos):
        super().__init__(nome, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita)
        self.tipo_biologia = 'perene'
        self.tempo_descanso = tempo_descanso
        self.max_ciclos = max_ciclos

    def processar_pos_colheita(self, lote):
        lote.ciclos_colhidos = getattr(lote, 'ciclos_colhidos', 0) + 1
        if lote.ciclos_colhidos >= self.max_ciclos:
            lote.produtividade_atual = 20
        else:
            lote.produtividade_atual = 100
        lote.status = 'plantado'
        lote.dias_plantado = float(self.tempo_colheita - self.tempo_descanso)
        lote.dias_descanso = 0.0

    def obter_estagio_e_progresso(self, dias_plantado, dias_descanso=0, estacao_atual='primavera'):
        if dias_descanso > 0:
            progresso_pct = min(100, int(((self.tempo_descanso - dias_descanso) / self.tempo_descanso) * 100))
            return "Descanso Pós-Colheita", progresso_pct, int(dias_descanso)
        return super().obter_estagio_e_progresso(dias_plantado, dias_descanso, estacao_atual)

class CulturaSazonal(CulturaPerene):
    def __init__(self, nome, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita, tempo_descanso, max_ciclos, estacoes_fruto):
        super().__init__(nome, custo_semente, producao_kg, tempo_colheita, preparo_exigido, custo_maquina_plantio, custo_maquina_colheita, tempo_descanso, max_ciclos)
        self.tipo_biologia = 'sazonal'
        self.estacoes_fruto = estacoes_fruto

    def obter_estagio_e_progresso(self, dias_plantado, dias_descanso=0, estacao_atual='primavera'):
        if dias_descanso > 0 or dias_plantado < self.tempo_colheita:
            return super().obter_estagio_e_progresso(dias_plantado, dias_descanso, estacao_atual)
        
        if estacao_atual not in self.estacoes_fruto:
            estacoes_formatadas = "/".join([e.capitalize() for e in self.estacoes_fruto])
            return f"Aguardando Clima ({estacoes_formatadas})", 100, 0
        return "Ponto de Colheita", 100, 0

CATALOGO_CULTIVOS = {
    'soja': Cultura('Soja', 350, 3600, 100, 'arado', 300, 500),
    'milho': Cultura('Milho', 200, 6000, 90, 'arado', 300, 500),
    'arroz': Cultura('Arroz', 180, 4200, 110, 'arado', 300, 500),
    'feijao': Cultura('Feijão', 250, 2000, 80, 'arado', 300, 500),
    'algodao': Cultura('Algodão', 400, 3000, 150, 'arado', 400, 700),
    'mandioca': Cultura('Mandioca', 150, 20000, 240, 'arado', 100, 200),
    'tomate': Cultura('Tomate', 15, 6000, 90, 'arado', 100, 150),
    'abacaxi': Cultura('Abacaxi', 250, 25000, 400, 'coveado', 100, 150),
    'melancia': Cultura('Melancia', 50, 15000, 85, 'coveado', 100, 150),
    'cana': CulturaPerene('Cana-de-Açúcar', 300, 80000, 360, 'arado', 300, 600, tempo_descanso=30, max_ciclos=5), 
    'banana': CulturaPerene('Banana', 200, 15000, 300, 'coveado', 100, 150, tempo_descanso=15, max_ciclos=8),
    'cacau': CulturaPerene('Cacau', 600, 1500, 500, 'coveado', 150, 200, tempo_descanso=45, max_ciclos=15),
    'acai': CulturaPerene('Açaí', 450, 5000, 730, 'coveado', 150, 200, tempo_descanso=30, max_ciclos=12),
    'cupuacu': CulturaPerene('Cupuaçu', 400, 2000, 730, 'coveado', 150, 200, tempo_descanso=30, max_ciclos=10),
    'pimenta': CulturaPerene('Pimenta', 300, 2500, 120, 'coveado', 100, 150, tempo_descanso=20, max_ciclos=6),
    'cafe': CulturaSazonal('Café Clonal', 500, 4000, 365, 'coveado', 150, 300, tempo_descanso=90, max_ciclos=10, estacoes_fruto=['outono', 'inverno'])
}

@cultivo_bp.route('/api/cultivo/detalhes', methods=['GET'])
def detalhes_cultivo():
    lote_id = request.args.get('lote_id')
    lote = Lote.query.get(lote_id)
    if not lote: return jsonify({'sucesso': False})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario', '')).first()
    fazenda = Propriedade.query.get(lote.fazenda_id)
    area = MULTIPLICADOR_AREA.get(fazenda.tipo, 1)
    
    resposta = {
        'sucesso': True,
        'area': area,
        'fertilidade': getattr(lote, 'fertilidade_solo', 100),
        'pragas': getattr(lote, 'nivel_pragas', 0),
        'produtividade': getattr(lote, 'produtividade_atual', 100),
        'est_adubo': getattr(fazenda, 'est_adubo', 0),
        'est_veneno': getattr(fazenda, 'est_veneno', 0),
        'ciclos': getattr(lote, 'ciclos_colhidos', 0),
        'descanso': getattr(lote, 'dias_descanso', 0.0),
        'status': lote.status,
        'sistema_irrigacao': getattr(lote, 'sistema_irrigacao', 'nenhum')
    }

    if lote.tipo_cultivo and lote.status in ['plantado', 'colhendo']:
        dna_planta = CATALOGO_CULTIVOS.get(lote.tipo_cultivo)
        if dna_planta:
            dias_plantado = getattr(lote, 'dias_plantado', 0)
            dias_descanso = getattr(lote, 'dias_descanso', 0)
            estacao_atual = getattr(jogador, 'estacao_atual', 'primavera') if jogador else 'primavera'
            
            estagio, progresso_pct, dias_restantes = dna_planta.obter_estagio_e_progresso(dias_plantado, dias_descanso, estacao_atual)
            resposta['estagio'] = estagio
            resposta['progresso_pct'] = progresso_pct
            resposta['dias_restantes'] = dias_restantes

    return jsonify(resposta)

@cultivo_bp.route('/api/cultivo/plantar', methods=['POST'])
def plantar():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    tipo = dados.get('tipo_cultivo')
    if tipo not in CATALOGO_CULTIVOS: return jsonify({'sucesso': False, 'erro': 'Semente não cadastrada.'})
    
    area = MULTIPLICADOR_AREA.get(fazenda_alvo.tipo, 1) 
    dna_planta = CATALOGO_CULTIVOS[tipo]

    if lote.status != dna_planta.preparo_exigido:
        prep_nome = "Arada (Trator)" if dna_planta.preparo_exigido == 'arado' else "com Covas Abertas"
        return jsonify({'sucesso': False, 'erro': f'Exige terra {prep_nome}.'})

    custo_total = (dna_planta.custo_semente + dna_planta.custo_maquina_plantio) * area

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Você precisa de R$ {custo_total:,.2f} para plantar {area}ha.'})

    cultura_anterior = getattr(lote, 'tipo_cultivo', None)
    nova_produtividade = 100
    msg_extra = ""

    if cultura_anterior:
        if cultura_anterior == tipo:
            nova_produtividade = 80
            msg_extra = "⚠️ Monocultura baixou a produtividade para 80%."
        else:
            nova_produtividade = 100
            msg_extra = "🌱 Solo renovado pela Rotação de Culturas!"

    usuario.saldo -= custo_total
    
    lote.status = 'plantado'
    lote.tipo_cultivo = tipo
    lote.dias_plantado = 0
    lote.ciclos_colhidos = 0
    lote.dias_descanso = 0.0
    lote.produtividade_atual = nova_produtividade
    lote.nivel_pragas = 0
    lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 20)

    registrar_transacao(usuario.id, 'saida', custo_total, f'Plantio de {dna_planta.nome} ({area}ha)')
    db.session.commit()
    
    return jsonify({'sucesso': True, 'msg': f'{dna_planta.nome} plantado com sucesso! {msg_extra}'})

@cultivo_bp.route('/api/cultivo/manejo', methods=['POST'])
def manejo_lavoura():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    if not lote or lote.status not in ['plantado', 'colhendo']:
        return jsonify({'sucesso': False, 'erro': 'Lote inválido para manejo.'})

    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    acao = dados.get('acao') 
    area = MULTIPLICADOR_AREA.get(fazenda_alvo.tipo, 1) 

    if acao == 'adubar':
        if getattr(fazenda_alvo, 'est_adubo', 0) < area:
            return jsonify({'sucesso': False, 'erro': f'Sem Adubo! Você precisa de {area} sc para esta área.'})
        if getattr(lote, 'fertilidade_solo', 100) >= 100:
            return jsonify({'sucesso': False, 'erro': 'Solo já está 100% fértil!'})
            
        fazenda_alvo.est_adubo -= area
        lote.fertilidade_solo = min(100, getattr(lote, 'fertilidade_solo', 100) + 40)
        msg = f"Foram aplicados {area} sacos de Adubo!"

    elif acao == 'pulverizar':
        if getattr(fazenda_alvo, 'est_veneno', 0) < area:
            return jsonify({'sucesso': False, 'erro': f'Sem Defensivos! Você precisa de {area} gl.'})
        if getattr(lote, 'nivel_pragas', 0) == 0:
            return jsonify({'sucesso': False, 'erro': 'A lavoura não tem pragas no momento!'})
            
        fazenda_alvo.est_veneno -= area
        lote.nivel_pragas = 0
        msg = f"Gastos {area} galões de Veneno. Pragas eliminadas!"
    else:
        return jsonify({'sucesso': False, 'erro': 'Manejo inválido.'})

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@cultivo_bp.route('/api/cultivo/colher', methods=['POST'])
def colher():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))

    if not lote or lote.status not in ['plantado', 'colhendo', 'colheita_incompleta']: 
        return jsonify({'sucesso': False, 'erro': 'A lavoura não pode ser colhida no momento.'})

    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    area = MULTIPLICADOR_AREA.get(fazenda_alvo.tipo, 1)
    tipo = lote.tipo_cultivo
    dna_planta = CATALOGO_CULTIVOS.get(tipo)
    
    estagio, _, _ = dna_planta.obter_estagio_e_progresso(
        getattr(lote, 'dias_plantado', 0), getattr(lote, 'dias_descanso', 0), getattr(usuario, 'estacao_atual', 'primavera')
    )
    
    if estagio != "Ponto de Colheita" and lote.status not in ['colhendo', 'colheita_incompleta']:
        return jsonify({'sucesso': False, 'erro': 'A lavoura ainda não está no ponto de colheita.'})
    
    produtividade = getattr(lote, 'produtividade_atual', 100)
    
    from logica.funcionarios import obter_bonus_equipe
    bonus_rh = obter_bonus_equipe(fazenda_alvo.id)
    multiplicador_trator = bonus_rh.get('bonus_colheita', 1.0)
    
    kg_totais_disponiveis = int(dna_planta.producao_kg * area * (produtividade / 100.0) * multiplicador_trator)

    itens_silo_graos = ['soja', 'milho', 'arroz', 'feijao']
    kg_a_colher = kg_totais_disponiveis
    espaco_livre = 9999999 

    local_armazenamento = "Silo de Grãos" if tipo in itens_silo_graos else "Galpão Agrícola"

    if tipo in itens_silo_graos:
        total_silo = sum(getattr(fazenda_alvo, f'est_{i}', 0) for i in itens_silo_graos if hasattr(fazenda_alvo, f'est_{i}'))
        espaco_livre = fazenda_alvo.cap_silo - total_silo
        
        if espaco_livre <= 0:
            return jsonify({'sucesso': False, 'erro': 'Silo Cheio! Expanda o silo ou venda os grãos atuais.'})
            
        kg_a_colher = min(kg_totais_disponiveis, espaco_livre)

    colheita_parcial = kg_a_colher < kg_totais_disponiveis
    proporcao_colhida = kg_a_colher / kg_totais_disponiveis if kg_totais_disponiveis > 0 else 1
    
    custo_real = int(dna_planta.custo_maquina_colheita * area * proporcao_colhida)

    if usuario.saldo < custo_real:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para bancar os tratores (R$ {custo_real:,.2f}).'})

    coluna_estoque = f'est_{tipo}'
    try:
        estoque_atual = getattr(fazenda_alvo, coluna_estoque, 0)
        setattr(fazenda_alvo, coluna_estoque, estoque_atual + kg_a_colher)
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Erro de estoque.'})
    
    usuario.saldo -= custo_real
    registrar_transacao(usuario.id, 'saida', custo_real, f'Colheita de {dna_planta.nome} ({area}ha)')

    msg_final = ""
    if colheita_parcial:
        nova_produtividade = produtividade - (produtividade * proporcao_colhida)
        lote.produtividade_atual = nova_produtividade
        lote.status = 'colheita_incompleta' 
        msg_final = f'⚠️ {local_armazenamento} encheu! Foram colhidos {kg_a_colher} kg. Venda no mercado e volte para terminar.'
    else:
        lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 30)
        dna_planta.processar_pos_colheita(lote)
        msg_final = f'Colheita finalizada! {kg_a_colher} kg armazenados no {local_armazenamento}.'

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg_final})

@cultivo_bp.route('/api/cultivo/abandonar', methods=['POST'])
def abandonar_terra():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    if not lote: return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})

    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    # 🔥 BLINDAGEM: Devolve o terreno limpo para barrar o farm infinito de madeira
    lote.status = 'limpo'
    lote.tipo_cultivo = None 
    lote.dias_plantado = 0
    lote.ciclos_colhidos = 0
    lote.dias_descanso = 0
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Terra limpa e cultura desfeita.'})

@cultivo_bp.route('/api/cultivo/comprar_irrigacao', methods=['POST'])
def comprar_irrigacao():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    if not lote: return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})

    fazenda_alvo = Propriedade.query.get(lote.fazenda_id)
    if not fazenda_alvo or fazenda_alvo.dono_id != usuario.id:
        return jsonify({'sucesso': False, 'erro': '🚨 FRAUDE DETECTADA: Você não é dono desta terra!'})

    if lote.sistema_irrigacao != 'nenhum': return jsonify({'sucesso': False, 'erro': 'Já possui irrigação!'})
        
    area = MULTIPLICADOR_AREA.get(fazenda_alvo.tipo, 1)
    custo_pivo = 5000.0 * area 
    
    if usuario.saldo < custo_pivo:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. O Pivô custa R$ {custo_pivo:,.2f}.'})
        
    usuario.saldo -= custo_pivo
    lote.sistema_irrigacao = 'pivo'
    
    try:
        registrar_transacao(usuario.id, 'saida', custo_pivo, f'Pivô de Irrigação ({area}ha)')
    except: pass
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Pivô de Irrigação instalado!'})
