from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random

db = SQLAlchemy()

# =========================================================
# DICIONÁRIOS DE GENÉTICA (O "DNA" DO MOTOR BIOLÓGICO)
# =========================================================

INFO_ESPECIES = {
    'bovino_corte': {
        'racas': ['nelore', 'angus', 'guzera', 'brahman'], 
        'peso_jovem': 12.0, 'peso_adulto': 18.0, 'gestacao': 280, 'ganho_dia': 0.8, 'dieta': 'pasto'
    },
    'bovino_leite': {
        'racas': ['girolando'], 
        'peso_jovem': 10.0, 'peso_adulto': 15.0, 'gestacao': 280, 'ganho_dia': 0.6, 'dieta': 'pasto'
    },
    'equino': {
        'racas': ['cavalo'], 
        'peso_jovem': 15.0, 'peso_adulto': 25.0, 'gestacao': 340, 'ganho_dia': 0.5, 'dieta': 'pasto'
    },
    'suino': {
        'racas': ['porco'], 
        'peso_jovem': 2.0, 'peso_adulto': 6.0, 'gestacao': 114, 'ganho_dia': 0.3, 'dieta': 'racao'
    },
    'ave': {
        'racas': ['galinha', 'pato', 'peru'], 
        'peso_jovem': 0.05, 'peso_adulto': 0.15, 'gestacao': 21, 'ganho_dia': 0.01, 'dieta': 'racao'
    },
    'peixe_gigante': {
        'racas': ['pirarucu', 'surubim', 'pintado', 'cachara'], 
        'peso_jovem': 1.0, 'peso_adulto': 4.0, 'gestacao': 0, 'ganho_dia': 0.1, 'dieta': 'racao'
    },
    'peixe_medio': {
        'racas': ['tambaqui', 'pacu', 'matrinxa', 'tucunare', 'curimata', 'piau', 'jaraqui'], 
        'peso_jovem': 0.05, 'peso_adulto': 0.2, 'gestacao': 0, 'ganho_dia': 0.02, 'dieta': 'racao'
    }
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

# ---------------------------------------------------------
# TABELA 1: JOGADOR
# ---------------------------------------------------------
class Jogador(db.Model):
    __tablename__ = 'jogadores'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    senha_hash = db.Column(db.String(128), nullable=False)
    
    saldo = db.Column(db.Float, default=1000.0)
    nivel = db.Column(db.Integer, default=1)
    
    hora = db.Column(db.Integer, default=6) 
    dia = db.Column(db.Integer, default=1)
    mes = db.Column(db.Integer, default=1)
    ano = db.Column(db.Integer, default=2026)
    
    is_admin = db.Column(db.Boolean, default=False)
    ultima_acao = db.Column(db.DateTime, default=datetime.utcnow)
    
    propriedades = db.relationship('Propriedade', backref='dono', lazy=True)
    
TABELA_PRECOS = {
    'nelore': {'filhote': 1000, 'adulto': 2500},
    'angus': {'filhote': 1500, 'adulto': 3500},
    'girolando': {'filhote': 1800, 'adulto': 4180},
    'guzera': {'filhote': 1700, 'adulto': 4000},
    'brahman': {'filhote': 2000, 'adulto': 4500},
    'cavalo': {'filhote': 3500, 'adulto': 8000},
    'porco': {'filhote': 400, 'adulto': 990},
    'ovelha': {'filhote': 450, 'adulto': 1100},
    'cabra': {'filhote': 420, 'adulto': 1050},
    'galinha': {'filhote': 20, 'adulto': 60},
    'pato': {'filhote': 30, 'adulto': 75},
    'peru': {'filhote': 45, 'adulto': 110},
    'tambaqui': {'filhote': 25, 'adulto': 60},
    'pirarucu': {'filhote': 150, 'adulto': 400},
    'pacu': {'filhote': 20, 'adulto': 55},
    'matrinxa': {'filhote': 30, 'adulto': 80},
    'jaraqui': {'filhote': 15, 'adulto': 35},
    'curimata': {'filhote': 20, 'adulto': 45},
    'surubim': {'filhote': 60, 'adulto': 130},
    'pintado': {'filhote': 70, 'adulto': 150},
    'cachara': {'filhote': 65, 'adulto': 140},
    'tucunare': {'filhote': 40, 'adulto': 95},
    'piau': {'filhote': 20, 'adulto': 45}
}

# ---------------------------------------------------------
# TABELA 2: PROPRIEDADE
# ---------------------------------------------------------
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
    tem_represa_geral = db.Column(db.Boolean, default=False)
    tem_chiqueiro = db.Column(db.Boolean, default=False)
    tem_galinheiro = db.Column(db.Boolean, default=False)

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

    est_sal = db.Column(db.Integer, default=0)
    est_racao = db.Column(db.Integer, default=0)
    est_adubo = db.Column(db.Integer, default=0)
    est_veneno = db.Column(db.Integer, default=0)
    est_combustivel = db.Column(db.Integer, default=0)
    est_vacina_aftosa = db.Column(db.Integer, default=0)
    est_vacina_brucelose = db.Column(db.Integer, default=0)
    est_medicamento_geral = db.Column(db.Integer, default=0)
    est_suplemento_engorda = db.Column(db.Integer, default=0)

    lotes = db.relationship('Lote', backref='fazenda', lazy=True)

# ---------------------------------------------------------
# TABELA 3: LOTE
# ---------------------------------------------------------
class Lote(db.Model):
    __tablename__ = 'lotes'

    id = db.Column(db.Integer, primary_key=True)
    fazenda_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    nome = db.Column(db.String(50), default="Hectare")
    status = db.Column(db.String(50), default='mato') 
    
    tem_cerca = db.Column(db.Boolean, default=False)
    tem_cocho = db.Column(db.Boolean, default=False)
    tem_bebedouro = db.Column(db.Boolean, default=False)
    tipo_capim = db.Column(db.String(50), nullable=True)
    qualidade_capim = db.Column(db.Integer, default=0) 
    
    tipo_cultivo = db.Column(db.String(50), nullable=True)
    dias_plantado = db.Column(db.Integer, default=0)
    fase_planta = db.Column(db.String(20), default='Nenhuma') 
    umidade_solo = db.Column(db.Integer, default=50) 
    
    animais_no_lote = db.relationship('Animal', backref='lote_atual', lazy=True)

    def processar_biologia_vegetal(self, clima):
        if self.status not in ['pasto', 'cultivo']:
            return 
            
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
                if self.umidade_solo >= dados_planta['agua_necessaria']:
                    self.dias_plantado += 1
                
                if self.dias_plantado < dados_planta['dias_semente']:
                    self.fase_planta = 'Semente'
                elif self.dias_plantado < dados_planta['dias_broto']:
                    self.fase_planta = 'Broto'
                elif self.dias_plantado < dados_planta['dias_colheita']:
                    self.fase_planta = 'Crescimento'
                else:
                    self.fase_planta = 'Ponto de Colheita'

# ---------------------------------------------------------
# TABELA 4: ANIMAL
# ---------------------------------------------------------
class Animal(db.Model):
    __tablename__ = 'animais'

    id = db.Column(db.Integer, primary_key=True)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=True)
    
    raca = db.Column(db.String(50), nullable=False)
    sexo = db.Column(db.String(10), default='M')
    fase = db.Column(db.String(20), default='Bezerro')
    peso = db.Column(db.Float, nullable=False)
    idade_meses = db.Column(db.Integer, default=0)
    
    saude = db.Column(db.Integer, default=100) 
    fome = db.Column(db.Integer, default=0)    
    prenha = db.Column(db.Boolean, default=False)
    dias_gestacao = db.Column(db.Integer, default=0)
    
    vacinado_aftosa = db.Column(db.Boolean, default=False)
    vacinado_brucelose = db.Column(db.Boolean, default=False)
    medicado = db.Column(db.Boolean, default=False)
    suplementado = db.Column(db.Boolean, default=False) # Status de engorda via cocho

    onde_esta = db.Column(db.String(50), default='curral') 
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    origem = db.Column(db.String(50), default='Mercado Oficial')

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
            self.peso = max(0.1, self.peso - (dna['ganho_dia'] * 1.5))
            return

        esta_alimentado = False
        if dna['dieta'] == 'pasto' and ambiente.get('qualidade_pasto', 0) > 20:
            esta_alimentado = True
        elif dna['dieta'] == 'racao' and ambiente.get('tem_racao', False):
            esta_alimentado = True
            
        if not esta_alimentado and not ambiente.get('tem_sal', False):
            self.fome = min(100, self.fome + 15)
            if self.fome == 100:
                self.saude = max(0, self.saude - 25) 
        else:
            self.fome = max(0, self.fome - 20)
            self.saude = min(100, self.saude + 10)

        # ---------------------------------------------------------
        # SISTEMA DE PESO (Com Suplemento/Engorda via Cocho)
        # ---------------------------------------------------------
        peso_maximo_genetico = dna['peso_adulto'] * 1.3 
        
        if self.fome > 50 or self.saude < 40:
            self.peso = max(0.1, self.peso - (dna['ganho_dia'] * 1.5)) 
        elif self.fome == 0 and self.saude > 80:
            if self.peso < peso_maximo_genetico:
                ganho_base = dna['ganho_dia']
                if ambiente.get('tem_sal', False):
                    ganho_base += (dna['ganho_dia'] * 0.5)
                if self.suplementado:
                    ganho_base *= 1.8 # Bônus forte de engorda com suplemento
                
                self.peso += ganho_base
                    
        self.peso = round(min(self.peso, peso_maximo_genetico), 2)
                
        if self.peso < dna['peso_jovem']:
            self.fase = 'Filhote'
        elif self.peso < dna['peso_adulto']:
            self.fase = 'Jovem'
        else:
            self.fase = 'Adulto'
            
        if self.prenha and dna['gestacao'] > 0:
            self.dias_gestacao += 1

# ---------------------------------------------------------
# OUTRAS TABELAS (Anúncios, Transações e MORTES)
# ---------------------------------------------------------
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


def popular_mapa_inicial():
    if Propriedade.query.first():
        return

    NOMES_FAZENDA = ["Estrela do Norte", "Rio Madeira", "Santa Fé", "Boa Esperança", "Nova Vida", "São João"]
    NOMES_SITIO = ["Sítio Recanto", "Sítio Sossego", "Sítio Primavera", "Sítio Beira Rio"]
    NOMES_CHACARA = ["Chácara Vovó Ana", "Chácara Bela Vista", "Chácara Paraíso"]
    
    propriedades_para_criar = []
    
    for i in range(1, 51):
        sorteio_tipo = random.choice(["Chácara", "Sítio", "Fazenda"])
        
        if sorteio_tipo == "Chácara":
            nome_base = random.choice(NOMES_CHACARA)
            preco = 5000.0
            qtd_hectares = 2
        elif sorteio_tipo == "Sítio":
            nome_base = random.choice(NOMES_SITIO)
            preco = 25000.0
            qtd_hectares = 5
        else:
            nome_base = random.choice(NOMES_FAZENDA)
            preco = 100000.0
            qtd_hectares = 10
            
        nome_final = f"{nome_base} {i}"
        nova_terra = Propriedade(nome=nome_final, preco=preco, tipo=sorteio_tipo, dono_id=None)
        
        for j in range(1, qtd_hectares + 1):
            novo_lote = Lote(nome=f"Hectare {j}", status='mato')
            nova_terra.lotes.append(novo_lote)
            
        propriedades_para_criar.append(nova_terra)
        
    db.session.add_all(propriedades_para_criar)
    db.session.commit()
