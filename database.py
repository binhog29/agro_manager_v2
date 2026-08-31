from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
# 🔥 IMPORTANDO OS DICIONÁRIOS DO NOVO ARQUIVO PARA NÃO QUEBRAR O JOGO
from logica.constantes import INFO_ESPECIES, INFO_CULTIVOS, TABELA_PRECOS

db = SQLAlchemy()

# ==============================================================
# JOGADOR E PROGRESSÃO RPG
# ==============================================================
class Jogador(db.Model):
    __tablename__ = 'jogadores'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    senha_hash = db.Column(db.String(128), nullable=False)
    saldo = db.Column(db.Float, default=1000.0)
    
    nivel = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0) 
    energia_atual = db.Column(db.Integer, default=100)       
    hab_agricultura = db.Column(db.Integer, default=1)       
    hab_pecuaria = db.Column(db.Integer, default=1)          
    reputacao = db.Column(db.Integer, default=50)            

    hora = db.Column(db.Integer, default=6) 
    dia = db.Column(db.Integer, default=1)
    mes = db.Column(db.Integer, default=1)
    ano = db.Column(db.Integer, default=2026)
    is_admin = db.Column(db.Boolean, default=False)
    ultima_acao = db.Column(db.DateTime, default=datetime.utcnow)
    
    propriedades = db.relationship('Propriedade', backref='dono', lazy=True)
    emprestimos = db.relationship('Emprestimo', backref='devedor', lazy=True)
    contratos = db.relationship('Contrato', backref='contratado', lazy=True)
    
    def adicionar_xp(self, quantidade):
        self.xp = self.xp or 0
        self.nivel = self.nivel or 1
        self.xp += quantidade
        subiu_de_nivel = False
        
        # 🔥 CORREÇÃO: O servidor agora usa a mesma matemática da tela (Nível * 1000)
        while self.xp >= (self.nivel * 1000):
            self.nivel += 1
            subiu_de_nivel = True
            bonus_dinheiro = self.nivel * 5000 
            self.saldo += bonus_dinheiro
        return subiu_de_nivel

# ==============================================================
# PROPRIEDADE E INFRAESTRUTURA
# ==============================================================
class Propriedade(db.Model):
    __tablename__ = 'propriedades'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    preco = db.Column(db.Float, nullable=False)
    tipo = db.Column(db.String(50), default="Sítio")
    dono_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=True)

    cap_silo = db.Column(db.Integer, default=500)
    cap_armazem = db.Column(db.Integer, default=200)
    cap_curral = db.Column(db.Integer, default=10)
    cap_barracao = db.Column(db.Integer, default=0)
    cap_camara_fria = db.Column(db.Integer, default=0)
    
    tem_represa_geral = db.Column(db.Boolean, default=False)
    tem_chiqueiro = db.Column(db.Boolean, default=False)
    tem_galinheiro = db.Column(db.Boolean, default=False)
    tem_energia_solar = db.Column(db.Boolean, default=False) 
    nivel_seguranca = db.Column(db.Integer, default=0)
    
    represa_tem_comedouro = db.Column(db.Boolean, default=False)
    represa_qtd_racao = db.Column(db.Float, default=0.0)
    est_racao_peixe = db.Column(db.Float, default=0.0)

    chiqueiro_tem_comedouro = db.Column(db.Boolean, default=False)
    chiqueiro_qtd_racao = db.Column(db.Float, default=0.0)
    est_racao_suino = db.Column(db.Float, default=0.0)

    galinheiro_tem_comedouro = db.Column(db.Boolean, default=False)
    galinheiro_qtd_racao = db.Column(db.Float, default=0.0)
    est_racao_ave = db.Column(db.Float, default=0.0)

    est_milho = db.Column(db.Integer, default=0)
    est_soja = db.Column(db.Integer, default=0)
    est_cafe = db.Column(db.Integer, default=0)
    est_arroz = db.Column(db.Integer, default=0)
    est_feijao = db.Column(db.Integer, default=0)
    est_algodao = db.Column(db.Integer, default=0)
    est_cana = db.Column(db.Integer, default=0)
    est_mandioca = db.Column(db.Integer, default=0)
    est_pimenta = db.Column(db.Integer, default=0)
    est_cacau = db.Column(db.Integer, default=0)
    est_acai = db.Column(db.Integer, default=0)
    est_cupuacu = db.Column(db.Integer, default=0)
    est_banana = db.Column(db.Integer, default=0)
    est_abacaxi = db.Column(db.Integer, default=0)
    est_melancia = db.Column(db.Integer, default=0)
    est_tomate = db.Column(db.Integer, default=0)

    est_sal = db.Column(db.Integer, default=0)
    est_racao = db.Column(db.Integer, default=0)
    est_adubo = db.Column(db.Integer, default=0)
    est_veneno = db.Column(db.Integer, default=0)
    est_combustivel = db.Column(db.Integer, default=0)
    est_vacina_aftosa = db.Column(db.Integer, default=0)
    est_vacina_brucelose = db.Column(db.Integer, default=0)
    est_medicamento_geral = db.Column(db.Integer, default=0)
    est_suplemento_engorda = db.Column(db.Integer, default=0)
    
    est_leite = db.Column(db.Float, default=0.0)             
    est_ovos = db.Column(db.Integer, default=0)              
    est_calcario = db.Column(db.Float, default=0.0)          

    lotes = db.relationship('Lote', backref='fazenda', lazy=True)
    maquinarios = db.relationship('Maquinario', backref='fazenda', lazy=True)

# ==============================================================
# AGRONOMIA (Lotes)
# ==============================================================
class Lote(db.Model):
    __tablename__ = 'lotes'
    id = db.Column(db.Integer, primary_key=True)
    fazenda_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    nome = db.Column(db.String(50), default="Hectare")
    status = db.Column(db.String(50), default='mato') 
    
    # Infraestrutura do Lote
    tem_cerca = db.Column(db.Boolean, default=False)
    tem_bebedouro = db.Column(db.Boolean, default=False)
    tem_cocho = db.Column(db.Boolean, default=False) 
    tem_cocho_racao = db.Column(db.Boolean, default=False) 
    sistema_irrigacao = db.Column(db.String(50), default='nenhum') 
    
    # Pecuária no Lote
    tipo_capim = db.Column(db.String(50), nullable=True)
    qualidade_capim = db.Column(db.Integer, default=0) 
    qtd_sal_cocho = db.Column(db.Float, default=0.0) 
    qtd_racao_cocho = db.Column(db.Float, default=0.0) 
    tipo_cocho = db.Column(db.String(20), default='vazio')
    qtd_cocho = db.Column(db.Float, default=0.0)
    
    # Agronomia e Solo
    tipo_solo = db.Column(db.String(50), default='terra_roxa') 
    fertilidade_solo = db.Column(db.Integer, default=100)      
    ph_solo = db.Column(db.Float, default=6.5)                 
    compactacao_solo = db.Column(db.Integer, default=0)        
    umidade_solo = db.Column(db.Integer, default=50) 
    
    # Cultura Atual
    nivel_pragas = db.Column(db.Integer, default=0)
    produtividade_atual = db.Column(db.Integer, default=100)
    dias_plantado = db.Column(db.Float, default=0.0)
    tipo_cultivo = db.Column(db.String(50), nullable=True)
    fase_planta = db.Column(db.String(20), default='Nenhuma') 
    
    animais_no_lote = db.relationship('Animal', backref='lote_atual', lazy=True)

    # ❌ A função 'processar_biologia_vegetal' foi apagada daqui com sucesso!
    # A inteligência agora mora exclusivamente no motor_agricultura.py

    def processar_biologia_vegetal(self, clima):
        # A lógica de crescimento da agricultura continua aqui temporariamente 
        # (na próxima refatoração podemos jogar para o motor de agricultura)
        if self.status not in ['pasto', 'cultivo']: return 
            
        if clima == 'chuva':
            self.umidade_solo = min(100, self.umidade_solo + 20)
        else:
            self.umidade_solo = max(0, self.umidade_solo - 10)

        if self.status == 'pasto' and self.tipo_capim:
            if self.umidade_solo > 30:
                self.qualidade_capim = min(100, self.qualidade_capim + 5)
            else:
                self.qualidade_capim = max(0, self.qualidade_capim - 3)

        if self.status == 'cultivo' and self.tipo_cultivo:
            dados_planta = INFO_CULTIVOS.get(self.tipo_cultivo.lower())
            if dados_planta:
                bonus_agronomo = 1.0
                if self.fazenda and getattr(self.fazenda, 'equipe', None):
                    bonus_agronomo += (self.fazenda.equipe.agronomos * 0.25)

                if self.umidade_solo < dados_planta['agua_necessaria'] and self.sistema_irrigacao != 'nenhum':
                    self.umidade_solo = dados_planta['agua_necessaria']

                if self.umidade_solo >= dados_planta['agua_necessaria']:
                    fator_crescimento = 1.0
                    if self.compactacao_solo > 70: fator_crescimento -= 0.2
                    if self.ph_solo < 5.0: fator_crescimento -= 0.3
                    self.dias_plantado += (1 * max(0.1, fator_crescimento) * bonus_agronomo)
                
                if self.dias_plantado < dados_planta['dias_semente']: self.fase_planta = 'Semente'
                elif self.dias_plantado < dados_planta['dias_broto']: self.fase_planta = 'Broto'
                elif self.dias_plantado < dados_planta['dias_colheita']: self.fase_planta = 'Crescimento'
                else: self.fase_planta = 'Ponto de Colheita'

# ==============================================================
# TABELA DE ANIMAIS (Lógica Excluída, apenas colunas)
# ==============================================================
class Animal(db.Model):
    __tablename__ = 'animais'
    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=True)
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    
    raca = db.Column(db.String(50), nullable=False)
    sexo = db.Column(db.String(10), default='M')
    fase = db.Column(db.String(20), default='Bezerro')
    origem = db.Column(db.String(50), default='Mercado Oficial')
    
    peso = db.Column(db.Float, nullable=False)
    idade_meses = db.Column(db.Integer, default=0)
    saude = db.Column(db.Integer, default=100) 
    fome = db.Column(db.Integer, default=0)    
    
    qualidade_genetica = db.Column(db.Integer, default=100)  
    estresse = db.Column(db.Integer, default=0)              
    doenca_atual = db.Column(db.String(50), default='nenhuma') 
    
    prenha = db.Column(db.Boolean, default=False)
    dias_gestacao = db.Column(db.Integer, default=0)
    dias_lactacao = db.Column(db.Integer, default=0)         
    prod_acumulada = db.Column(db.Float, default=0.0)        

    vacinado_aftosa = db.Column(db.Boolean, default=False)
    vacinado_brucelose = db.Column(db.Boolean, default=False)
    medicado = db.Column(db.Boolean, default=False)
    suplementado = db.Column(db.Boolean, default=False)
    onde_esta = db.Column(db.String(50), default='curral') 

    def obter_dna(self):
        raca_lower = self.raca.lower()
        for familia, dados in INFO_ESPECIES.items():
            if raca_lower in dados['racas']:
                return dados
        return None 
        
    def processar_biologia_animal(self, ambiente):
        # FUNÇÃO DESATIVADA! A lógica real foi movida para os Motores Pecuários
        pass

# ==============================================================
# RH E MAQUINÁRIOS AVANÇADOS
# ==============================================================
class Equipe(db.Model):
    __tablename__ = 'equipes'
    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    
    peoes = db.Column(db.Integer, default=0)
    tratoristas = db.Column(db.Integer, default=0)
    capatazes = db.Column(db.Integer, default=0)
    veterinarios = db.Column(db.Integer, default=0) 
    agronomos = db.Column(db.Integer, default=0)    
    
    propriedade = db.relationship('Propriedade', backref=db.backref('equipe', uselist=False, lazy=True))

class Maquinario(db.Model):
    __tablename__ = 'maquinarios'
    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    
    tipo = db.Column(db.String(50), nullable=False)  
    modelo = db.Column(db.String(100), nullable=False)
    
    potencia_hp = db.Column(db.Integer, default=100) 
    estado_conservacao = db.Column(db.Integer, default=100) 
    nivel_combustivel = db.Column(db.Integer, default=100) 
    
    ipva_pago = db.Column(db.Boolean, default=True)  
    implemento_acoplado = db.Column(db.String(50), default='nenhum') 

# ==============================================================
# ECONOMIA E MERCADO
# ==============================================================
class Emprestimo(db.Model):
    __tablename__ = 'emprestimos'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    valor_total = db.Column(db.Float, nullable=False)
    juros_aplicado = db.Column(db.Float, nullable=False)     
    parcelas_totais = db.Column(db.Integer, nullable=False)
    parcelas_restantes = db.Column(db.Integer, nullable=False)
    valor_parcela = db.Column(db.Float, nullable=False)
    dia_vencimento = db.Column(db.Integer, nullable=False)   

class Contrato(db.Model):
    __tablename__ = 'contratos'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    empresa_npc = db.Column(db.String(100), nullable=False)  
    produto_exigido = db.Column(db.String(50), nullable=False)
    quantidade_exigida = db.Column(db.Float, nullable=False)
    pagamento_recompensa = db.Column(db.Float, nullable=False)
    prazo_dias = db.Column(db.Integer, nullable=False)       
    concluido = db.Column(db.Boolean, default=False)

class Anuncio(db.Model):
    __tablename__ = 'anuncios'
    id = db.Column(db.Integer, primary_key=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey('animais.id'), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data_anuncio = db.Column(db.DateTime, default=db.func.now())
    vendedor = db.relationship('Jogador', backref='meus_anuncios')
    animal = db.relationship('Animal', backref='meu_anuncio', uselist=False)

class Transacao(db.Model):
    __tablename__ = 'transacoes'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    tipo = db.Column(db.String(10), nullable=False) 
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(255), nullable=False)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    jogador = db.relationship('Jogador', backref=db.backref('transacoes', lazy=True))

class HistoricoMorte(db.Model):
    __tablename__ = 'historico_mortes'
    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=True)
    raca = db.Column(db.String(50), nullable=False)
    fase = db.Column(db.String(20), nullable=False)
    causa = db.Column(db.String(100), default="Maus tratos / Fome")
    data_morte = db.Column(db.DateTime, default=datetime.utcnow)
    propriedade = db.relationship('Propriedade', backref='mortes_registradas', lazy=True)

class MensagemChat(db.Model):
    __tablename__ = 'mensagens_chat'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    texto = db.Column(db.String(300), nullable=False)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow)
    jogador = db.relationship('Jogador', backref='mensagens_enviadas')

# ==============================================================
# GERAÇÃO DO MAPA
# ==============================================================
def popular_mapa_inicial():
    if Propriedade.query.first(): 
        return

    cidades = ['Mutum Paraná', 'Rio Madeira', 'Jirau', 'Jaci Paraná', 'Porto Velho', 'São Domingos', 'Itapuã do Oeste', 'Bom Futuro', 'Buritis', 'Alto Paraíso', 'Campo Novo', 'Monte Negro', 'Ariquemes', 'Rio Crespo', 'Cujubim', 'Machadinho', 'Jaru', 'São Miguel', 'Alvorada', 'Ouro Preto', 'Nova Brasilândia', 'Castanheiras', 'Santa Luzia', 'Cacoal', 'Alta Floresta', 'Rolim de Moura', 'Ji-Paraná']
    sufixos = ['do Sol', 'Boa Esperança', 'Vale Verde', 'Recanto', 'Nova Vida']
    tipos_terreno = [("Chácara", 150000.0, 2), ("Sítio", 450000.0, 5), ("Fazenda", 2500000.0, 12), ("Latifúndio", 10000000.0, 25)]

    for cidade in cidades:
        for tipo, preco_base, qtd_lotes in tipos_terreno:
            for i in range(5):
                preco_final = preco_base + (i * (preco_base * 0.05))
                nova_propriedade = Propriedade(nome=f"{tipo} {sufixos[i]} de {cidade}", preco=preco_final, tipo=tipo)
                
                for j in range(qtd_lotes):
                    nova_propriedade.lotes.append(Lote(nome=f"Hectare {j+1}", status="mato"))
                db.session.add(nova_propriedade)
    db.session.commit()

class AnuncioImovel(db.Model):
    __tablename__ = 'anuncios_imoveis'
    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data_anuncio = db.Column(db.DateTime, default=datetime.utcnow)
    
    propriedade = db.relationship('Propriedade', backref='anuncio_imovel', uselist=False)
    vendedor = db.relationship('Jogador', backref='imoveis_anunciados')

class Notificacao(db.Model):
    __tablename__ = 'notificacoes'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    texto = db.Column(db.String(255), nullable=False)
    lida = db.Column(db.Boolean, default=False)
    data = db.Column(db.DateTime, default=datetime.utcnow)
    jogador = db.relationship('Jogador', backref=db.backref('notificacoes_recebidas', lazy=True))
