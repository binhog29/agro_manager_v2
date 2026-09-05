from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade
from logica.economia import registrar_transacao

infra_bp = Blueprint('infra', __name__)

@infra_bp.route('/api/fazenda/construir', methods=['POST'])
def construir_estrutura():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    dados = request.get_json()
    
    tipo = dados.get('tipo') 
    fazenda_id = dados.get('fazenda_id')
    
    TABELA_CUSTOS = {
        'represa': 12000.0,
        'chiqueiro': 8000.0,
        'galinheiro': 5000.0
    }
    
    if tipo not in TABELA_CUSTOS:
        return jsonify({'sucesso': False, 'erro': 'Tipo de construção inválido.'})
        
    custo_original = TABELA_CUSTOS[tipo]
    
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=usuario.id).first()
    if not fazenda:
        fazenda = Propriedade.query.filter_by(dono_id=usuario.id).first()
    
    # 🔥 INTEGRAÇÃO DA ESCAVADEIRA
    from database import Maquinario
    maquina_usada = None
    custo_final = custo_original
    
    if tipo in ['represa', 'chiqueiro']:
        maquina_usada = Maquinario.query.filter(
            Maquinario.propriedade_id == fazenda.id,
            Maquinario.modelo == 'Escavadeira',
            Maquinario.nivel_combustivel >= 15,
            Maquinario.estado_conservacao >= 5
        ).first()
        
        if maquina_usada:
            custo_final = custo_original * 0.40 # Desconto de 60% 
    
    if usuario.saldo < custo_final:
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. A obra custa R$ {custo_final:,.2f}.'})
        
    coluna_bd = 'tem_represa_geral' if tipo == 'represa' else f'tem_{tipo}'
    
    if getattr(fazenda, coluna_bd, False):
        return jsonify({'sucesso': False, 'erro': f'Você já construiu este {tipo.capitalize()}!'})
        
    setattr(fazenda, coluna_bd, True)
    usuario.saldo -= custo_final
    
    msg_sucesso = f'Construção do {tipo.capitalize()} concluída!'
    
    if maquina_usada:
        maquina_usada.nivel_combustivel -= 15
        maquina_usada.estado_conservacao -= 5
        registrar_transacao(usuario.id, 'saida', custo_final, f'Engenharia (Frota Própria): Construção de {tipo.capitalize()}')
        msg_sucesso = f'Obra concluída! A sua Escavadeira gerou 60% de economia!'
    else:
        registrar_transacao(usuario.id, 'saida', custo_final, f'Engenharia Terceirizada: Construção de {tipo.capitalize()}')
    
    if getattr(usuario, 'xp', None) is None:
        usuario.xp = 0
    usuario.xp += 20
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': msg_sucesso})

@infra_bp.route('/api/fazenda/expandir_curral', methods=['POST'])
def expandir_curral():
    if 'usuario' not in session: return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})
    
    jogador = Jogador.query.filter_by(username=session.get('usuario')).first()
    dados = request.get_json()
    fazenda_id = dados.get('fazenda_id')
    
    # 🔥 CORREÇÃO 1: Pega a fazenda exata onde o jogador está
    fazenda = Propriedade.query.filter_by(id=fazenda_id, dono_id=jogador.id).first()
    if not fazenda:
        return jsonify({'sucesso': False, 'erro': 'Fazenda não encontrada.'})
    
    custo_expansao = 6000.0
    
    if jogador.saldo < custo_expansao: 
        return jsonify({'sucesso': False, 'erro': f'Saldo insuficiente. Custa R$ {custo_expansao:,.2f}.'})
    
    jogador.saldo -= custo_expansao
    fazenda.cap_curral = getattr(fazenda, 'cap_curral', 10) + 5
    
    # 🔥 CORREÇÃO 2: Registra a saída no extrato para não parecer "de graça"
    registrar_transacao(jogador.id, 'saida', custo_expansao, 'Engenharia: Expansão do Tronco/Curral (+5 vagas)')
    
    if getattr(jogador, 'xp', None) is None:
        jogador.xp = 0
    jogador.xp += 10
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': 'Obras concluídas! Curral expandido em +5 vagas.'})
