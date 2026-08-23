from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade, Lote, Transacao
from logica.economia import registrar_transacao

cultivo_bp = Blueprint('cultivo', __name__)

# =======================================================
# ARQUITETURA OOP: AS 3 CLASSES DA BIOLOGIA VEGETAL
# =======================================================
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
        lote.status = 'limpo'
        lote.tipo_cultivo = None
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
        # 🔥 SOLUÇÃO MESTRA: Recua o tempo de vida orgânico da planta em vez de usar a coluna fantasma.
        # A banana vai para 285 dias e leva exatos 15 dias na barrinha para atingir 300 de novo!
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
        # Se ela acabou de ser colhida, o dias_plantado estará recuado. Ela volta a mostrar as fases de crescimento (Ex: Floração)
        if dias_descanso > 0 or dias_plantado < self.tempo_colheita:
            return super().obter_estagio_e_progresso(dias_plantado, dias_descanso, estacao_atual)
        
        if estacao_atual not in self.estacoes_fruto:
            estacoes_formatadas = "/".join([e.capitalize() for e in self.estacoes_fruto])
            return f"Aguardando Clima ({estacoes_formatadas})", 100, 0
            
        return "Ponto de Colheita", 100, 0

# =======================================================
# CATÁLOGO DE PLANTAS
# =======================================================
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
    
    jogador = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=jogador.id).first()
    
    resposta = {
        'sucesso': True,
        'fertilidade': getattr(lote, 'fertilidade_solo', 100),
        'pragas': getattr(lote, 'nivel_pragas', 0),
        'produtividade': getattr(lote, 'produtividade_atual', 100),
        'est_adubo': getattr(fazenda, 'est_adubo', 0),
        'est_veneno': getattr(fazenda, 'est_veneno', 0),
        'ciclos': getattr(lote, 'ciclos_colhidos', 0),
        'descanso': getattr(lote, 'dias_descanso', 0.0),
        'status': lote.status
    }

    if lote.tipo_cultivo and lote.status in ['plantado', 'colhendo']:
        dna_planta = CATALOGO_CULTIVOS.get(lote.tipo_cultivo)
        if dna_planta:
            dias_plantado = getattr(lote, 'dias_plantado', 0)
            dias_descanso = getattr(lote, 'dias_descanso', 0)
            estacao_atual = getattr(jogador, 'estacao_atual', 'primavera')
            
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
    tipo = dados.get('tipo_cultivo')

    if tipo not in CATALOGO_CULTIVOS: 
        return jsonify({'sucesso': False, 'erro': 'Semente não cadastrada no catálogo.'})
    
    dna_planta = CATALOGO_CULTIVOS[tipo]

    if lote.status != dna_planta.preparo_exigido:
        prep_nome = "Arada (Trator)" if dna_planta.preparo_exigido == 'arado' else "com Covas Abertas"
        return jsonify({'sucesso': False, 'erro': f'Esta cultura exige que a terra esteja {prep_nome}.'})

    custo_total = dna_planta.custo_semente + dna_planta.custo_maquina_plantio

    if usuario.saldo < custo_total:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custo: R$ {custo_total} (Mudas/Sementes + Maquinário)'})

    usuario.saldo -= custo_total
    
    lote.status = 'plantado'
    lote.tipo_cultivo = tipo
    lote.dias_plantado = 0
    lote.ciclos_colhidos = 0
    lote.dias_descanso = 0.0
    lote.produtividade_atual = 100
    lote.nivel_pragas = 0
    lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 20)

    registrar_transacao(usuario.id, 'saida', custo_total, f'Plantio de {dna_planta.nome} ({lote.nome})')
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'{dna_planta.nome} plantado com sucesso!'})

@cultivo_bp.route('/api/cultivo/manejo', methods=['POST'])
def manejo_lavoura():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    acao = dados.get('acao') 

    if not lote or lote.status not in ['plantado', 'colhendo']:
        return jsonify({'sucesso': False, 'erro': 'Lote inválido para manejo.'})

    if acao == 'adubar':
        if getattr(fazenda, 'est_adubo', 0) < 1:
            return jsonify({'sucesso': False, 'erro': 'Sem Adubo no armazém!'})
        if getattr(lote, 'fertilidade_solo', 100) >= 100:
            return jsonify({'sucesso': False, 'erro': 'O solo já está com 100% de fertilidade!'})
            
        fazenda.est_adubo -= 1
        lote.fertilidade_solo = min(100, getattr(lote, 'fertilidade_solo', 100) + 40)
        msg = "Adubo aplicado! Fertilidade do solo aumentada."

    elif acao == 'pulverizar':
        if getattr(fazenda, 'est_veneno', 0) < 1:
            return jsonify({'sucesso': False, 'erro': 'Sem Defensivos no armazém!'})
        if getattr(lote, 'nivel_pragas', 0) == 0:
            return jsonify({'sucesso': False, 'erro': 'A lavoura não tem pragas no momento!'})
            
        fazenda.est_veneno -= 1
        lote.nivel_pragas = 0
        msg = "Lavoura pulverizada! Pragas eliminadas."
    else:
        return jsonify({'sucesso': False, 'erro': 'Manejo inválido.'})

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg})

@cultivo_bp.route('/api/cultivo/colher', methods=['POST'])
def colher():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))

    # Adicionei 'colheita_incompleta' caso você decida mudar o status visual no JS depois
    if not lote or lote.status not in ['colhendo', 'colheita_incompleta']: 
        return jsonify({'sucesso': False, 'erro': 'A lavoura não está no ponto de colheita.'})

    tipo = lote.tipo_cultivo
    dna_planta = CATALOGO_CULTIVOS.get(tipo)
    
    # 1. Descobre o total que tem na roça hoje
    produtividade = getattr(lote, 'produtividade_atual', 100)
    kg_totais_disponiveis = int(dna_planta.producao_kg * (produtividade / 100.0))

    itens_silo_graos = ['soja', 'milho', 'arroz', 'feijao']
    kg_a_colher = kg_totais_disponiveis
    espaco_livre = 9999999 # Valor alto seguro caso não seja grão

    # 2. Validação de espaço no Silo
    if tipo in itens_silo_graos:
        total_silo = sum(getattr(fazenda, f'est_{i}', 0) for i in itens_silo_graos if hasattr(fazenda, f'est_{i}'))
        espaco_livre = fazenda.cap_silo - total_silo
        
        if espaco_livre <= 0:
            return jsonify({'sucesso': False, 'erro': 'Silo de Grãos 100% cheio! Você precisa vender no mercado antes de colher.'})
            
        # Define se colhe tudo ou só o que cabe no silo
        kg_a_colher = min(kg_totais_disponiveis, espaco_livre)

    # Verifica se é uma colheita parcial
    colheita_parcial = kg_a_colher < kg_totais_disponiveis
    
    # 3. Calcula o custo da máquina proporcionalmente (se colher metade, paga só metade agora)
    proporcao_colhida = kg_a_colher / kg_totais_disponiveis if kg_totais_disponiveis > 0 else 1
    custo_real = int(dna_planta.custo_maquina_colheita * proporcao_colhida)

    if usuario.saldo < custo_real:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente para a Colheita (R$ {custo_real}).'})

    # 4. Adiciona os grãos no Silo
    coluna_estoque = f'est_{tipo}'
    try:
        estoque_atual = getattr(fazenda, coluna_estoque, 0)
        setattr(fazenda, coluna_estoque, estoque_atual + kg_a_colher)
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Este item ainda não tem espaço configurado.'})
    
    usuario.saldo -= custo_real
    registrar_transacao(usuario.id, 'saida', custo_real, f'Custos de Colheita ({lote.nome})')

    # 5. O Pulo do Gato (O que acontece com a lavoura)
    msg_final = ""
    
    if colheita_parcial:
        # A lavoura fica no campo, apenas reduzimos a produtividade para refletir o que já foi tirado
        nova_produtividade = produtividade - (produtividade * proporcao_colhida)
        lote.produtividade_atual = nova_produtividade
        lote.status = 'colhendo' # Mantemos 'colhendo' para o seu botão de colher continuar aparecendo no HTML
        msg_final = f'⚠️ Silo encheu no meio do serviço! Foram colhidos {kg_a_colher} kg. Venda no mercado e volte para terminar.'
    else:
        # Colheu 100% com sucesso, segue o fluxo normal do seu jogo
        lote.fertilidade_solo = max(0, getattr(lote, 'fertilidade_solo', 100) - 30)
        dna_planta.processar_pos_colheita(lote)
        msg_final = f'Colheita finalizada! {kg_a_colher} kg de {dna_planta.nome} armazenados com sucesso.'
        
        if getattr(lote, 'ciclos_colhidos', 0) >= getattr(dna_planta, 'max_ciclos', 99):
            msg_final += f"\n⚠️ Alerta: Este pé de {dna_planta.nome} ficou velho. A produtividade da próxima safra será drástica!"

    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg_final})

@cultivo_bp.route('/api/cultivo/abandonar', methods=['POST'])
def abandonar_terra():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    dados = request.get_json()
    lote = Lote.query.get(dados.get('lote_id'))
    
    if lote:
        lote.status = 'mato'
        lote.tipo_cultivo = None
        lote.dias_plantado = 0
        lote.ciclos_colhidos = 0
        lote.dias_descanso = 0
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': 'A terra foi abandonada e o mato tomou conta.'})
    return jsonify({'sucesso': False, 'erro': 'Lote não encontrado.'})
