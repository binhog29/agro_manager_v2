from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random

db = SQLAlchemy()

# ==============================================================
# DICIONÁRIOS DE DADOS BIOLÓGICOS E MERCADO
# ==============================================================
INFO_ESPECIES = {
    'bovino_corte': {'racas': ['nelore', 'angus', 'guzera', 'brahman'], 'peso_jovem': 28.0, 'peso_adulto': 380.0, 'gestacao': 280, 'ganho_dia': 1.2, 'dieta': 'pasto'},
    'bovino_leite': {'racas': ['girolando'], 'peso_jovem': 28.0, 'peso_adulto': 350.0, 'gestacao': 280, 'ganho_dia': 1.0, 'dieta': 'pasto'},
    'equino': {'racas': ['cavalo'], 'peso_jovem': 150.0, 'peso_adulto': 350.0, 'gestacao': 340, 'ganho_dia': 0.8, 'dieta': 'pasto'},
    'suino': {'racas': ['porco'], 'peso_jovem': 15.0, 'peso_adulto': 100.0, 'gestacao': 114, 'ganho_dia': 0.5, 'dieta': 'racao'},
    'ave': {'racas': ['galinha', 'pato', 'peru'], 'peso_jovem': 0.5, 'peso_adulto': 2.5, 'gestacao': 21, 'ganho_dia': 0.05, 'dieta': 'racao'},
    'peixe_gigante': {'racas': ['pirarucu', 'surubim', 'pintado', 'cachara'], 'peso_jovem': 5.0, 'peso_adulto': 45.0, 'gestacao': 0, 'ganho_dia': 0.3, 'dieta': 'racao'},
    'peixe_medio': {'racas': ['tambaqui', 'pacu', 'matrinxa', 'tucunare', 'curimata', 'piau', 'jaraqui'], 'peso_jovem': 0.5, 'peso_adulto': 3.0, 'gestacao': 0, 'ganho_dia': 0.1, 'dieta': 'racao'}
}

INFO_CULTIVOS = {
    'feijao':   {'dias_semente': 8,  'dias_broto': 25,  'dias_colheita': 80,   'agua_necessaria': 30},
    'melancia': {'dias_semente': 12, 'dias_broto': 35,  'dias_colheita': 85,   'agua_necessaria': 30},
    'milho':    {'dias_semente': 10, 'dias_broto': 30,  'dias_colheita': 90,   'agua_necessaria': 40},
    'soja':     {'dias_semente': 12, 'dias_broto': 35,  'dias_colheita': 110,  'agua_necessaria': 50},
    'arroz':    {'dias_semente': 10, 'dias_broto': 40,  'dias_colheita': 120,  'agua_necessaria': 80},
    'algodao':  {'dias_semente': 15, 'dias_broto': 50,  'dias_colheita': 150,  'agua_necessaria': 60},
    'pimenta':  {'dias_semente': 20, 'dias_broto': 60,  'dias_colheita': 150,  'agua_necessaria': 40},
    'mandioca': {'dias_semente': 20, 'dias_broto': 60,  'dias_colheita': 240,  'agua_necessaria': 20},
    'banana':   {'dias_semente': 30, 'dias_broto': 120, 'dias_colheita': 330,  'agua_necessaria': 50},
    'cana':     {'dias_semente': 30, 'dias_broto': 90,  'dias_colheita': 365,  'agua_necessaria': 50},
    'cafe':     {'dias_semente': 60, 'dias_broto': 180, 'dias_colheita': 730,  'agua_necessaria': 40},
    'cupuacu':  {'dias_semente': 90, 'dias_broto': 300, 'dias_colheita': 1095, 'agua_necessaria': 60},
    'cacau':    {'dias_semente': 60, 'dias_broto': 200, 'dias_colheita': 1095, 'agua_necessaria': 60},
    'acai':     {'dias_semente': 90, 'dias_broto': 365, 'dias_colheita': 1460, 'agua_necessaria': 70}
}

TABELA_PRECOS = {
    'nelore': {'filhote': 1000, 'adulto': 2500}, 'angus': {'filhote': 1500, 'adulto': 3500},
    'girolando': {'filhote': 1800, 'adulto': 4180}, 'guzera': {'filhote': 1700, 'adulto': 4000},
    'brahman': {'filhote': 2000, 'adulto': 4500}, 'cavalo': {'filhote': 3500, 'adulto': 8000},
    'porco': {'filhote': 400, 'adulto': 990}, 'ovelha': {'filhote': 450, 'adulto': 1100},
    'cabra': {'filhote': 420, 'adulto': 1050}, 'galinha': {'filhote': 20, 'adulto': 60},
    'pato': {'filhote': 30, 'adulto': 75}, 'peru': {'filhote': 45, 'adulto': 110},
    'tambaqui': {'filhote': 25, 'adulto': 60}, 'pirarucu': {'filhote': 150, 'adulto': 400},
    'pacu': {'filhote': 20, 'adulto': 55}, 'matrinxa': {'filhote': 30, 'adulto': 80},
    'jaraqui': {'filhote': 15, 'adulto': 35}, 'curimata': {'filhote': 20, 'adulto': 45},
    'surubim': {'filhote': 60, 'adulto': 130}, 'pintado': {'filhote': 70, 'adulto': 150},
    'cachara': {'filhote': 65, 'adulto': 140}, 'tucunare': {'filhote': 40, 'adulto': 95},
    'piau': {'filhote': 20, 'adulto': 45}
}

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
    
    # RPG e Status
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
        
        # 📈 CURVA MAIS DIFÍCIL: Exemplo multiplicando por 5000 (ou o valor que preferir)
        while self.xp >= (self.nivel * 5000):
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

    # Capacidades e Estruturas
    cap_silo = db.Column(db.Integer, default=500)
    cap_armazem = db.Column(db.Integer, default=200)
    cap_curral = db.Column(db.Integer, default=10)
    cap_barracao = db.Column(db.Integer, default=0)
    cap_camara_fria = db.Column(db.Integer, default=0)       

    # Melhorias Gerais
    tem_represa_geral = db.Column(db.Boolean, default=False)
    tem_chiqueiro = db.Column(db.Boolean, default=False)
    tem_galinheiro = db.Column(db.Boolean, default=False)
    tem_energia_solar = db.Column(db.Boolean, default=False) 
    nivel_seguranca = db.Column(db.Integer, default=0)       

    # Estoques Agrícolas
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

    # Estoques de Insumos e Produtos Animais
    est_sal = db.Column(db.Integer, default=0)
    est_racao = db.Column(db.Integer, default=0)
    est_adubo = db.Column(db.Integer, default=0)
    est_veneno = db.Column(db.Integer, default=0)
    est_combustivel = db.Column(db.Integer, default=0)
    est_vacina_aftosa = db.Column(db.Integer, default=0)
    est_vacina_brucelose = db.Column(db.Integer, default=0)
    est_medicamento_geral = db.Column(db.Integer, default=0)
    est_suplemento_engorda = db.Column(db.Integer, default=0)
    
    # Produtos Finais
    est_leite = db.Column(db.Float, default=0.0)             
    est_ovos = db.Column(db.Integer, default=0)              
    est_calcario = db.Column(db.Float, default=0.0)          

    lotes = db.relationship('Lote', backref='fazenda', lazy=True)
    maquinarios = db.relationship('Maquinario', backref='fazenda', lazy=True)

# ==============================================================
# AGRONOMIA REALISTA (Lotes)
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

    def processar_biologia_vegetal(self, clima):
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
                # -----------------------------------------------------
                # 👨‍🌾 BÔNUS DO AGRÔNOMO: Acelera o crescimento das plantas!
                # -----------------------------------------------------
                bonus_agronomo = 1.0
                if self.fazenda and getattr(self.fazenda, 'equipe', None):
                    # Cada agrônomo contratado aumenta a velocidade de crescimento em 25%
                    bonus_agronomo += (self.fazenda.equipe.agronomos * 0.25)

                if self.umidade_solo < dados_planta['agua_necessaria'] and self.sistema_irrigacao != 'nenhum':
                    self.umidade_solo = dados_planta['agua_necessaria']

                if self.umidade_solo >= dados_planta['agua_necessaria']:
                    fator_crescimento = 1.0
                    if self.compactacao_solo > 70: fator_crescimento -= 0.2
                    if self.ph_solo < 5.0: fator_crescimento -= 0.3
                    
                    # Aplica o bônus de velocidade do agrônomo!
                    self.dias_plantado += (1 * max(0.1, fator_crescimento) * bonus_agronomo)
                
                if self.dias_plantado < dados_planta['dias_semente']:
                    self.fase_planta = 'Semente'
                elif self.dias_plantado < dados_planta['dias_broto']:
                    self.fase_planta = 'Broto'
                elif self.dias_plantado < dados_planta['dias_colheita']:
                    self.fase_planta = 'Crescimento'
                else:
                    self.fase_planta = 'Ponto de Colheita'

# ==============================================================
# FISIOLOGIA ANIMAL AVANÇADA
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
        dna = self.obter_dna()
        if not dna: return 

        if self.onde_esta == 'pasto' and not ambiente.get('infra_completa', False):
            self.fome = min(100, self.fome + 15)
            self.saude = max(0, self.saude - 20)
            self.estresse = min(100, self.estresse + 10)
            self.peso = max(0.1, self.peso - (dna['ganho_dia'] * 1.5))
            return

        esta_alimentado = False
        if dna['dieta'] == 'pasto' and ambiente.get('qualidade_pasto', 0) > 20:
            esta_alimentado = True
        elif dna['dieta'] == 'racao' and ambiente.get('tem_racao', False):
            esta_alimentado = True
            
        if not esta_alimentado and not ambiente.get('tem_sal', False):
            self.fome = min(100, self.fome + 15)
            self.estresse = min(100, self.estresse + 5)
            if self.fome == 100: self.saude = max(0, self.saude - 25) 
        else:
            self.fome = max(0, self.fome - 20)
            self.saude = min(100, self.saude + 10)
            self.estresse = max(0, self.estresse - 10)
            
        # -----------------------------------------------------
        # 🩺 BÔNUS DO VETERINÁRIO: Cura passiva e alívio de estresse!
        # -----------------------------------------------------
        prop = Propriedade.query.get(self.propriedade_id) if self.propriedade_id else None
        if prop and getattr(prop, 'equipe', None) and prop.equipe.veterinarios > 0:
            # Cada veterinário cura 2 pontos de saúde e reduz 1 ponto de estresse por hora
            self.saude = min(100, self.saude + (prop.equipe.veterinarios * 2))
            self.estresse = max(0, self.estresse - (prop.equipe.veterinarios * 1))

        peso_maximo_genetico = dna['peso_adulto'] * (self.qualidade_genetica / 100.0)
        
        if self.fome > 50 or self.saude < 40 or self.estresse > 80:
            self.peso = max(0.1, self.peso - (dna['ganho_dia'] * 1.5)) 
        elif self.fome == 0 and self.saude > 80 and self.estresse < 30:
            if self.peso < peso_maximo_genetico:
                fator_individual = random.uniform(0.75, 1.25) * (self.qualidade_genetica / 100.0)
                ganho_base = dna['ganho_dia'] * fator_individual
                
                if ambiente.get('tem_sal', False): ganho_base += (dna['ganho_dia'] * 0.4)
                if self.suplementado: ganho_base *= 1.8 
                self.peso += ganho_base
                    
        self.peso = round(min(self.peso, peso_maximo_genetico), 2)
                
        if self.peso < dna['peso_jovem']: self.fase = 'Filhote'
        elif self.peso < dna['peso_adulto']: self.fase = 'Jovem'
        else: self.fase = 'Adulto'
            
        if self.prenha and dna['gestacao'] > 0:
            self.dias_gestacao += 1

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
# ECONOMIA HARDCORE: BANCO E CONTRATOS
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

# ==============================================================
# MERCADO E HISTÓRICOS
# ==============================================================
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

# ==============================================================
# SISTEMA SOCIAL E CHAT (MÓDULO INDEPENDENTE)
# ==============================================================
class MensagemChat(db.Model):
    __tablename__ = 'mensagens_chat'
    id = db.Column(db.Integer, primary_key=True)
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    texto = db.Column(db.String(300), nullable=False)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow)
    
    jogador = db.relationship('Jogador', backref='mensagens_enviadas')

# ==============================================================
# GERAÇÃO DO MAPA (Mercado Regionalizado com Hectares)
# ==============================================================
def popular_mapa_inicial():
    if Propriedade.query.first(): 
        return

    cidades = [
        'Mutum Paraná', 'Rio Madeira', 'Jirau', 'Jaci Paraná', 
        'Porto Velho', 'São Domingos', 'Itapuã do Oeste',
        'Bom Futuro', 'Buritis', 'Alto Paraíso', 'Campo Novo',
        'Monte Negro', 'Ariquemes', 'Rio Crespo', 'Cujubim',
        'Machadinho', 'Jaru', 'São Miguel', 'Alvorada', 'Ouro Preto',
        'Nova Brasilândia', 'Castanheiras', 'Santa Luzia', 'Cacoal', 
        'Alta Floresta', 'Rolim de Moura', 'Ji-Paraná'
    ]

    sufixos = ['do Sol', 'Boa Esperança', 'Vale Verde', 'Recanto', 'Nova Vida']

    tipos_terreno = [
        ("Chácara", 150000.0, 2),     
        ("Sítio", 450000.0, 5),        
        ("Fazenda", 2500000.0, 12),    
        ("Latifúndio", 10000000.0, 25) 
    ]

    for cidade in cidades:
        for tipo, preco_base, qtd_lotes in tipos_terreno:
            for i in range(5):
                nome_terra = f"{tipo} {sufixos[i]} de {cidade}"
                preco_final = preco_base + (i * (preco_base * 0.05))
                
                nova_propriedade = Propriedade(nome=nome_terra, preco=preco_final, tipo=tipo)
                
                for j in range(qtd_lotes):
                    hectare = Lote(nome=f"Hectare {j+1}", status="mato")
                    nova_propriedade.lotes.append(hectare)

                db.session.add(nova_propriedade)

    db.session.commit()
    print("Sucesso: 540 propriedades criadas com seus respectivos hectares!")
