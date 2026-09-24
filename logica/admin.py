from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from database import db, Jogador, Propriedade, Transacao, MensagemChat, Animal, Lote

admin_bp = Blueprint('admin_ceo', __name__)

def verificar_admin():
    if 'usuario' not in session: return False
    usuario = Jogador.query.filter_by(username=session['usuario']).first()
    return usuario and getattr(usuario, 'is_admin', False)

@admin_bp.route('/admin/painel-ceo')
def painel_ceo():
    if not verificar_admin():
        return "Acesso Negado. Área restrita aos Administradores do Jogo.", 403
    
    usuario_atual = Jogador.query.filter_by(username=session['usuario']).first()
    jogadores = Jogador.query.order_by(Jogador.id.desc()).all()
    return render_template('admin_ceo.html', user=usuario_atual, jogadores=jogadores)

@admin_bp.route('/api/admin/injetar_saldo', methods=['POST'])
def injetar_saldo():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    valor = float(dados.get('valor', 0))
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    alvo.saldo += valor
    if alvo.saldo < 0: alvo.saldo = 0
    
    tipo_transacao = 'entrada' if valor > 0 else 'saida'
    nova_transacao = Transacao(jogador_id=alvo.id, tipo=tipo_transacao, valor=abs(valor), descricao=f'⚖️ AJUSTE DO SISTEMA (Ação do Administrador)')
    db.session.add(nova_transacao)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Saldo de {alvo.username} ajustado com sucesso!'})

@admin_bp.route('/api/admin/injetar_xp', methods=['POST'])
def injetar_xp():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    valor = int(dados.get('valor', 0))
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    alvo.adicionar_xp(valor)
    db.session.commit()
    
    if valor < 0:
        return jsonify({'sucesso': True, 'msg': f'{abs(valor)} XP removidos da conta de {alvo.username}!'})
    else:
        return jsonify({'sucesso': True, 'msg': f'{valor} XP injetados na conta de {alvo.username}!'})

@admin_bp.route('/api/admin/deletar_conta', methods=['POST'])
def deletar_conta():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.get_json().get('jogador_id'))
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    if getattr(alvo, 'is_admin', False): return jsonify({'sucesso': False, 'erro': 'Você não pode deletar a conta do CEO!'})
    
    # 1. Devolve as propriedades ao Estado (Fazendo a Limpeza de Fábrica!)
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    limites_originais = {'Chácara': 2, 'Sítio': 5, 'Fazenda': 12, 'Latifúndio': 25}
    
    for fazenda in propriedades:
        fazenda.dono_id = None
        Animal.query.filter_by(propriedade_id=fazenda.id).delete()
        Maquinario.query.filter_by(propriedade_id=fazenda.id).delete()
        Equipe.query.filter_by(propriedade_id=fazenda.id).delete()
        
        limite_padrao = limites_originais.get(fazenda.tipo, 2)
        lotes = Lote.query.filter_by(fazenda_id=fazenda.id).order_by(Lote.id).all()
        for i, lote in enumerate(lotes):
            if i < limite_padrao:
                lote.status = 'mato'
                lote.tem_cerca = False
                lote.tem_bebedouro = False
                lote.tem_cocho = False
                lote.tem_cocho_racao = False
                lote.sistema_irrigacao = 'nenhum'
                lote.tipo_cultivo = None
                lote.tipo_capim = None
                lote.dias_plantado = 0
                lote.nivel_pragas = 0
                lote.fertilidade_solo = 100
            else:
                db.session.delete(lote) # Deleta hectares extras do banido!
                
        fazenda.cap_silo = 500
        fazenda.cap_armazem = 200
        fazenda.cap_curral = 10
        fazenda.cap_barracao = 0
        fazenda.cap_represa = 200
        fazenda.cap_chiqueiro = 50
        fazenda.cap_galinheiro = 100
        fazenda.cap_haras = 10
        fazenda.cap_aprisco = 30
        fazenda.tem_represa_geral = False
        fazenda.tem_chiqueiro = False
        fazenda.tem_galinheiro = False
        fazenda.tem_haras = False
        fazenda.tem_aprisco = False
        
        for campo in ['est_milho', 'est_soja', 'est_arroz', 'est_feijao', 'est_algodao', 'est_mandioca', 
                      'est_cafe', 'est_cana', 'est_tomate', 'est_banana', 'est_cacau', 'est_acai', 
                      'est_cupuacu', 'est_pimenta', 'est_melancia', 'est_abacaxi',
                      'est_sal', 'est_racao', 'est_adubo', 'est_veneno', 'est_combustivel', 
                      'est_vacina_aftosa', 'est_vacina_brucelose', 'est_medicamento_geral', 
                      'est_suplemento_engorda', 'est_racao_peixe', 'est_leite', 'est_ovos']:
            if hasattr(fazenda, campo):
                setattr(fazenda, campo, 0)
        
    # 2. Deleta dependências que travam o Banco de Dados
    Transacao.query.filter_by(jogador_id=alvo.id).delete()
    MensagemChat.query.filter_by(jogador_id=alvo.id).delete()
    
    try:
        from database import Notificacao, Emprestimo, Contrato
        Notificacao.query.filter_by(jogador_id=alvo.id).delete()
        Emprestimo.query.filter_by(jogador_id=alvo.id).delete()
        Contrato.query.filter_by(jogador_id=alvo.id).delete()
    except Exception: pass
    
    try:
        from database import AnuncioImovel, Anuncio
        AnuncioImovel.query.filter_by(vendedor_id=alvo.id).delete()
        Anuncio.query.filter_by(vendedor_id=alvo.id).delete()
    except Exception: pass
        
    nome_alvo = alvo.username
    db.session.delete(alvo)
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'A conta "{nome_alvo}" foi banida e suas terras devolvidas limpas ao estado!'})

# ==========================================
# 🔥 NOVOS PODERES DO MODO DEUS
# ==========================================
@admin_bp.route('/api/admin/milagre_vida', methods=['POST'])
def milagre_vida():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    if not prop_ids: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    animais = Animal.query.filter(Animal.propriedade_id.in_(prop_ids)).all()
    if not animais: return jsonify({'sucesso': False, 'erro': 'Nenhum animal encontrado.'})
    
    for a in animais:
        a.saude = 100
        a.fome = 0
        a.estresse = 0
        a.doenca_atual = 'nenhuma'
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Milagre Divino! {len(animais)} animais de {alvo.username} curados e alimentados.'})

@admin_bp.route('/api/admin/bencao_colheita', methods=['POST'])
def bencao_colheita():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    if not prop_ids: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    lotes = Lote.query.filter(Lote.fazenda_id.in_(prop_ids), Lote.status.in_(['plantado', 'colheita_incompleta'])).all()
    if not lotes: return jsonify({'sucesso': False, 'erro': 'Nenhuma lavoura ativa encontrada.'})
    
    for lote in lotes:
        lote.dias_plantado = 999.0
        lote.fase_planta = 'Ponto de Colheita'
        lote.produtividade_atual = 100
        lote.nivel_pragas = 0
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Bênção da Natureza! {len(lotes)} hectares pularam para a colheita.'})

@admin_bp.route('/api/admin/injetar_insumo', methods=['POST'])
def injetar_insumo():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    dados = request.get_json()
    alvo = Jogador.query.get(dados.get('jogador_id'))
    item = dados.get('item')
    qtd = int(dados.get('quantidade', 0))
    
    fazenda = Propriedade.query.filter_by(dono_id=alvo.id).first()
    if not fazenda: return jsonify({'sucesso': False, 'erro': 'O jogador não possui fazendas para armazenar.'})
        
    coluna = f'est_{item}'
    try:
        atual = getattr(fazenda, coluna, 0)
        setattr(fazenda, coluna, atual + qtd)
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'{qtd} {item.capitalize()} gerados na fazenda {fazenda.nome}.'})
    except AttributeError:
        return jsonify({'sucesso': False, 'erro': 'Item inválido.'})

@admin_bp.route('/api/admin/confiscar_terras', methods=['POST'])
def confiscar_terras():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    
    if not propriedades: return jsonify({'sucesso': False, 'erro': 'Jogador não possui terras.'})
    
    limites_originais = {'Chácara': 2, 'Sítio': 5, 'Fazenda': 12, 'Latifúndio': 25}
    
    for fazenda in propriedades:
        fazenda.dono_id = None
        
        Animal.query.filter_by(propriedade_id=fazenda.id).delete()
        Maquinario.query.filter_by(propriedade_id=fazenda.id).delete()
        Equipe.query.filter_by(propriedade_id=fazenda.id).delete()
        
        limite_padrao = limites_originais.get(fazenda.tipo, 2)
        lotes = Lote.query.filter_by(fazenda_id=fazenda.id).order_by(Lote.id).all()
        for i, lote in enumerate(lotes):
            if i < limite_padrao:
                lote.status = 'mato'
                lote.tem_cerca = False
                lote.tem_bebedouro = False
                lote.tem_cocho = False
                lote.tem_cocho_racao = False
                lote.sistema_irrigacao = 'nenhum'
                lote.tipo_cultivo = None
                lote.tipo_capim = None
                lote.dias_plantado = 0
                lote.nivel_pragas = 0
                lote.fertilidade_solo = 100
            else:
                db.session.delete(lote) # Deleta os hectares extras!
                
        fazenda.cap_silo = 500
        fazenda.cap_armazem = 200
        fazenda.cap_curral = 10
        fazenda.cap_barracao = 0
        fazenda.cap_represa = 200
        fazenda.cap_chiqueiro = 50
        fazenda.cap_galinheiro = 100
        fazenda.cap_haras = 10
        fazenda.cap_aprisco = 30
        fazenda.tem_represa_geral = False
        fazenda.tem_chiqueiro = False
        fazenda.tem_galinheiro = False
        fazenda.tem_haras = False
        fazenda.tem_aprisco = False
        
        for campo in ['est_milho', 'est_soja', 'est_arroz', 'est_feijao', 'est_algodao', 'est_mandioca', 
                      'est_cafe', 'est_cana', 'est_tomate', 'est_banana', 'est_cacau', 'est_acai', 
                      'est_cupuacu', 'est_pimenta', 'est_melancia', 'est_abacaxi',
                      'est_sal', 'est_racao', 'est_adubo', 'est_veneno', 'est_combustivel', 
                      'est_vacina_aftosa', 'est_vacina_brucelose', 'est_medicamento_geral', 
                      'est_suplemento_engorda', 'est_racao_peixe', 'est_leite', 'est_ovos']:
            if hasattr(fazenda, campo):
                setattr(fazenda, campo, 0)
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Todas as terras de {alvo.username} foram confiscadas e limpas para o Estado!'})

@admin_bp.route('/api/admin/avancar_tempo_jogador', methods=['POST'])
def avancar_tempo_jogador():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    dados = request.get_json()
    jogador_id = dados.get('jogador_id')
    horas = int(dados.get('horas', 0))
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    if horas <= 0: return jsonify({'sucesso': False, 'erro': 'Quantidade de horas inválida.'})
    
    # Chama o motor do tempo para agir apenas na fazenda deste jogador
    from logica.tempo import GerenciadorTempo
    GerenciadorTempo.avancar_tempo(alvo, horas)
    
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'O tempo de {alvo.username} avançou em {horas} horas!'})

# ==========================================
# 🔥 MÓDULO DE AUDITORIA E INTERVENÇÃO
# ==========================================

@admin_bp.route('/api/admin/auditoria_fazendas', methods=['POST'])
def auditoria_fazendas():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    if not propriedades: return jsonify({'sucesso': False, 'erro': 'Este jogador não possui propriedades.'})
    
    relatorio = []
    for p in propriedades:
        qtd_lotes = Lote.query.filter_by(fazenda_id=p.id).count()
        qtd_animais = Animal.query.filter_by(propriedade_id=p.id).count()
        
        soma_silo = getattr(p, 'est_soja', 0) + getattr(p, 'est_milho', 0) + getattr(p, 'est_arroz', 0) + getattr(p, 'est_feijao', 0)
        soma_laticinios = getattr(p, 'est_leite', 0) + getattr(p, 'est_ovos', 0)
        
        relatorio.append(
            f"🚜 <b>{p.nome}</b> ({p.tipo})<br>"
            f"▪️ Terras: {qtd_lotes} Hectares<br>"
            f"▪️ Rebanho: {qtd_animais} Cabeças<br>"
            f"▪️ Silo: {soma_silo} Kg | Derivados: {int(soma_laticinios)} un"
        )
        
    return jsonify({'sucesso': True, 'msg': "<br><br>".join(relatorio)})


@admin_bp.route('/api/admin/remover_hectares_extras', methods=['POST'])
def remover_hectares_extras():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    if not propriedades: return jsonify({'sucesso': False, 'erro': 'O jogador não possui propriedades.'})
    
    limites_originais = {'Chácara': 2, 'Sítio': 5, 'Fazenda': 12, 'Latifúndio': 25}
    hectares_removidos = 0
    
    for fazenda in propriedades:
        limite = limites_originais.get(fazenda.tipo, 2)
        lotes = Lote.query.filter_by(fazenda_id=fazenda.id).order_by(Lote.id.desc()).all()
        
        while len(lotes) > limite:
            ultimo_lote = lotes.pop(0) # Pega o lote com maior ID (o mais recente comprado)
            
            # Resgata animais para o curral (Evita deletar o gado junto com a terra)
            Animal.query.filter_by(lote_id=ultimo_lote.id).update({'lote_id': None, 'onde_esta': 'curral'})
            
            db.session.delete(ultimo_lote)
            hectares_removidos += 1
            
    if hectares_removidos > 0:
        db.session.commit()
        return jsonify({'sucesso': True, 'msg': f'Operação Concluída! Foram confiscados {hectares_removidos} hectares extras das terras de {alvo.username}.'})
    else:
        return jsonify({'sucesso': False, 'erro': 'As fazendas deste jogador já estão no tamanho original (sem hectares extras).'})
        
        
@admin_bp.route('/api/admin/limpar_lavouras', methods=['POST'])
def limpar_lavouras():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    alvo = Jogador.query.get(request.json.get('jogador_id'))
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    prop_ids = [p.id for p in propriedades]
    
    if not prop_ids: return jsonify({'sucesso': False, 'erro': 'O jogador não tem fazendas.'})
    
    lotes_sujos = Lote.query.filter(Lote.fazenda_id.in_(prop_ids), Lote.status.in_(['plantado', 'colhendo', 'colheita_incompleta'])).all()
    
    if not lotes_sujos: return jsonify({'sucesso': False, 'erro': 'Nenhuma lavoura ativa para limpar.'})
    
    for lote in lotes_sujos:
        lote.status = 'arado' # Retorna a terra nua e preparada
        lote.tipo_cultivo = None
        lote.dias_plantado = 0
        lote.ciclos_colhidos = 0
        lote.nivel_pragas = 0
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Intervenção aplicada! {len(lotes_sujos)} lavouras foram forçosamente destruídas e aradas.'})

@admin_bp.route('/api/admin/confiscar_lotes_multiplos', methods=['POST'])
def confiscar_lotes_multiplos():
    if not verificar_admin(): return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    dados = request.get_json()
    lote_ids = dados.get('lote_ids', [])
    
    if not lote_ids:
        return jsonify({'sucesso': False, 'erro': 'Nenhum hectare foi selecionado.'})
        
    lotes = Lote.query.filter(Lote.id.in_(lote_ids)).all()
    if not lotes:
        return jsonify({'sucesso': False, 'erro': 'Nenhum hectare encontrado.'})
        
    qtd = len(lotes)
    for lote in lotes:
        # Resgata animais para o curral (evita deletar o gado junto com a terra)
        Animal.query.filter_by(lote_id=lote.id).update({'lote_id': None, 'onde_esta': 'curral'})
        db.session.delete(lote)
        
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Sucesso! {qtd} hectare(s) foi(ram) confiscado(s) e removido(s) com sucesso!'})

@admin_bp.route('/api/admin/resetar_propriedades_orfas', methods=['POST'])
def resetar_propriedades_orfas():
    if not verificar_admin(): 
        return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    # Busca todas as propriedades que não possuem dono (dono_id é None ou 0)
    propriedades_orfas = Propriedade.query.filter((Propriedade.dono_id == None) | (Propriedade.dono_id == 0)).all()
    
    if not propriedades_orfas:
        return jsonify({'sucesso': False, 'erro': 'Nenhuma propriedade sem dono encontrada para resetar.'})
    
    limites_originais = {'Chácara': 2, 'Sítio': 5, 'Fazenda': 12, 'Latifúndio': 25}
    qtd_resetadas = len(propriedades_orfas)
    
    for fazenda in propriedades_orfas:
        # 1. Remove animais associados à fazenda
        Animal.query.filter_by(propriedade_id=fazenda.id).delete()
        
        # Remove máquinas e equipa com verificação de segurança (evita NameError)
        try:
            from database import Maquinario
            Maquinario.query.filter_by(propriedade_id=fazenda.id).delete()
        except Exception:
            pass
            
        try:
            from database import Equipe
            Equipe.query.filter_by(propriedade_id=fazenda.id).delete()
        except Exception:
            pass
        
        # 2. Reseta lotes/hectares e apaga os hectares extras comprados
        limite_padrao = limites_originais.get(fazenda.tipo, 2)
        lotes = Lote.query.filter_by(fazenda_id=fazenda.id).order_by(Lote.id).all()
        for i, lote in enumerate(lotes):
            if i < limite_padrao:
                lote.status = 'mato'
                lote.tem_cerca = False
                lote.tem_bebedouro = False
                lote.tem_cocho = False
                lote.tem_cocho_racao = False
                lote.sistema_irrigacao = 'nenhum'
                lote.tipo_cultivo = None
                lote.tipo_capim = None
                lote.dias_plantado = 0
                lote.nivel_pragas = 0
                lote.fertilidade_solo = 100
            else:
                db.session.delete(lote) # Elimina os hectares extras acumulados pelo bug
                
        # 3. Restaura estruturas e capacidades originais de fábrica
        fazenda.cap_silo = 500
        fazenda.cap_armazem = 200
        fazenda.cap_curral = 10
        fazenda.cap_barracao = 0
        fazenda.cap_represa = 200
        fazenda.cap_chiqueiro = 50
        fazenda.cap_galinheiro = 100
        fazenda.cap_haras = 10
        fazenda.cap_aprisco = 30
        fazenda.tem_represa_geral = False
        fazenda.tem_chiqueiro = False
        fazenda.tem_galinheiro = False
        fazenda.tem_haras = False
        fazenda.tem_aprisco = False
        
        # 4. Zera o estoque armazenado na propriedade
        for campo in ['est_milho', 'est_soja', 'est_arroz', 'est_feijao', 'est_algodao', 'est_mandioca', 
                      'est_cafe', 'est_cana', 'est_tomate', 'est_banana', 'est_cacau', 'est_acai', 
                      'est_cupuacu', 'est_pimenta', 'est_melancia', 'est_abacaxi',
                      'est_sal', 'est_racao', 'est_adubo', 'est_veneno', 'est_combustivel', 
                      'est_vacina_aftosa', 'est_vacina_brucelose', 'est_medicamento_geral', 
                      'est_suplemento_engorda', 'est_racao_peixe', 'est_leite', 'est_ovos']:
            if hasattr(fazenda, campo):
                setattr(fazenda, campo, 0)
                
    db.session.commit()
    return jsonify({'sucesso': True, 'msg': f'Limpeza Concluída! {qtd_resetadas} propriedade(s) sem dono foi(ram) resetada(s) para o padrão de fábrica.'})

# ==========================================
# 🐄 CONSULTAR E GERENCIAR REBANHO DO JOGADOR
# ==========================================

from sqlalchemy import func

@admin_bp.route('/api/admin/animais_jogador/<int:jogador_id>', methods=['GET'])
def obter_animais_jogador(jogador_id):
    if not verificar_admin(): 
        return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: 
        return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    propriedades = Propriedade.query.filter_by(dono_id=alvo.id).all()
    if not propriedades:
        return jsonify({'sucesso': False, 'erro': f'{alvo.username} não possui propriedades.'})
        
    resultado = []
    for prop in propriedades:
        animais = Animal.query.filter_by(propriedade_id=prop.id).all()
        
        # Agrupa e padroniza a exibição de raça e sexo
        resumo_map = {}
        for a in animais:
            raca_norm = a.raca.capitalize() if a.raca else 'Nelore'
            
            # Normaliza sexo (M / Macho -> Macho | F / Fêmea -> Fêmea)
            sexo_raw = str(a.sexo).strip().lower() if a.sexo else ''
            if sexo_raw in ['m', 'macho']:
                sexo_norm = 'Macho'
            elif sexo_raw in ['f', 'femea', 'fêmea']:
                sexo_norm = 'Fêmea'
            else:
                sexo_norm = a.sexo
            
            chave = f"{raca_norm.lower()}|{sexo_norm.lower()}"
            if chave not in resumo_map:
                resumo_map[chave] = {"raca": raca_norm, "sexo": sexo_norm, "qtd": 0}
            resumo_map[chave]["qtd"] += 1
        
        resultado.append({
            'id': prop.id,
            'nome': prop.nome,
            'tipo': prop.tipo,
            'total_animais': len(animais),
            'resumo': list(resumo_map.values())
        })
        
    return jsonify({'sucesso': True, 'username': alvo.username, 'propriedades': resultado})


@admin_bp.route('/api/admin/gerenciar_animais', methods=['POST'])
def gerenciar_animais():
    if not verificar_admin(): 
        return jsonify({'sucesso': False, 'erro': 'Acesso negado.'})
    
    dados = request.get_json() or {}
    jogador_id = dados.get('jogador_id')
    propriedade_id = dados.get('propriedade_id')
    acao = dados.get('acao') # 'adicionar' ou 'remover'
    raca = str(dados.get('raca', '')).strip()
    sexo = str(dados.get('sexo', '')).strip()
    
    try:
        qtd = int(dados.get('quantidade', 0))
    except (ValueError, TypeError):
        qtd = 0
    
    alvo = Jogador.query.get(jogador_id)
    if not alvo: 
        return jsonify({'sucesso': False, 'erro': 'Jogador não encontrado.'})
    
    # Conversão segura do ID da propriedade para int
    prop_id_int = int(propriedade_id) if propriedade_id and str(propriedade_id).isdigit() else None
    
    fazenda = None
    if prop_id_int:
        fazenda = Propriedade.query.filter_by(id=prop_id_int, dono_id=alvo.id).first()
        
    if not fazenda:
        fazenda = Propriedade.query.filter_by(dono_id=alvo.id).first()
        
    if not fazenda: 
        return jsonify({'sucesso': False, 'erro': 'Propriedade não encontrada.'})
        
    if qtd <= 0:
        return jsonify({'sucesso': False, 'erro': 'A quantidade deve ser maior que zero.'})
        
    # Mapeamento flexível para sexo
    if sexo.lower() in ['macho', 'm']:
        sexos_aceitos = ['macho', 'm']
        sexo_salvar = 'Macho'
    else:
        sexos_aceitos = ['fêmea', 'femea', 'f']
        sexo_salvar = 'Fêmea'
        
    raca_salvar = raca.capitalize() if raca else 'Nelore'
    raca_busca = raca.lower()
        
    if acao == 'adicionar':
        try:
            for _ in range(qtd):
                novo_animal = Animal(
                    propriedade_id=fazenda.id,
                    raca=raca_salvar,
                    sexo=sexo_salvar,
                    fase='Adulto',
                    peso=250.0,             # 👈 OBRIGATÓRIO: Define um peso inicial em kg
                    idade_meses=12,         # Define a idade em meses
                    saude=100,
                    fome=0,
                    estresse=0,
                    qualidade_genetica=100,
                    doenca_atual='nenhuma', # Evita erro NOT NULL na doença
                    onde_esta='curral'
                )
                db.session.add(novo_animal)
                
            db.session.commit()
            return jsonify({'sucesso': True, 'msg': f'{qtd} animal(is) ({raca_salvar} - {sexo_salvar}) adicionado(s) na propriedade "{fazenda.nome}"!'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'sucesso': False, 'erro': f'Erro ao salvar no banco: {str(e)}'})
       
    elif acao == 'remover':
        try:
            animais = Animal.query.filter(
                Animal.propriedade_id == fazenda.id,
                func.lower(Animal.raca) == raca_busca,
                func.lower(Animal.sexo).in_(sexos_aceitos)
            ).limit(qtd).all()
            
            if not animais:
                return jsonify({'sucesso': False, 'erro': f'Nenhum animal da raça {raca_salvar} ({sexo_salvar}) encontrado na propriedade "{fazenda.nome}".'})
                
            qtd_removida = len(animais)
            for animal in animais:
                db.session.delete(animal)
                
            db.session.commit()
            return jsonify({'sucesso': True, 'msg': f'{qtd_removida} animal(is) ({raca_salvar} - {sexo_salvar}) removido(s) da propriedade "{fazenda.nome}"!'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'sucesso': False, 'erro': f'Erro ao remover do banco: {str(e)}'})
        
    return jsonify({'sucesso': False, 'erro': 'Ação inválida.'})
