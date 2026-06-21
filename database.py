from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random

db = SQLAlchemy()

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
        # ... suas outras colunas (saldo, nivel, etc)
    hora = db.Column(db.Integer, default=6) # Jogo começa às 06:00 da manhã
    dia = db.Column(db.Integer, default=1)
    mes = db.Column(db.Integer, default=1)
    ano = db.Column(db.Integer, default=2026)
    
    # --- RELÓGIO DO JOGADOR ---
    hora = db.Column(db.Integer, default=6)
    dia = db.Column(db.Integer, default=1)
    mes = db.Column(db.Integer, default=1)
    ano = db.Column(db.Integer, default=2026)
    
    # NOVO: Etiqueta especial para a conta CEO
    is_admin = db.Column(db.Boolean, default=False)
    
    ultima_acao = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento: Um jogador pode ter várias propriedades
    propriedades = db.relationship('Propriedade', backref='dono', lazy=True)
    
# --- TABELA DE PREÇOS (O coração do mercado) ---
TABELA_PRECOS = {
    # --- BOVINOS & EQUINOS ---
    'nelore': {'filhote': 1000, 'adulto': 2500},
    'angus': {'filhote': 1500, 'adulto': 3500},
    'girolando': {'filhote': 1800, 'adulto': 4180},
    'guzera': {'filhote': 1700, 'adulto': 4000},
    'brahman': {'filhote': 2000, 'adulto': 4500},
    'cavalo': {'filhote': 3500, 'adulto': 8000},

    # --- MÉDIOS E PEQUENOS ANIMAIS ---
    'porco': {'filhote': 400, 'adulto': 990},
    'ovelha': {'filhote': 450, 'adulto': 1100},
    'cabra': {'filhote': 420, 'adulto': 1050},

    # --- AVES ---
    'galinha': {'filhote': 20, 'adulto': 60},
    'pato': {'filhote': 30, 'adulto': 75},
    'peru': {'filhote': 45, 'adulto': 110},

    # --- PEIXES ---
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
# TABELA 2: PROPRIEDADE (O Mapa Compartilhado)
# ---------------------------------------------------------
class Propriedade(db.Model):
    __tablename__ = 'propriedades'

    # --- SUAS COISAS EXISTENTES (MANTIDAS INTACTAS) ---
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False) # Ex: "Sítio Beira Rio 32"
    preco = db.Column(db.Float, nullable=False)
    tipo = db.Column(db.String(50), default="Sítio") # Sítio, Chácara, Fazenda
    
    # Se estiver NULO, a terra está à venda. Se tiver um ID, tem dono!
    dono_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=True)

    # --- NOVOS BOLSOS PARA O SILO E CURRAL FUNCIONAREM ---
    cap_silo = db.Column(db.Integer, default=500)
    cap_armazem = db.Column(db.Integer, default=200)
    cap_curral = db.Column(db.Integer, default=10)
    tem_represa_geral = db.Column(db.Boolean, default=False)
    tem_chiqueiro = db.Column(db.Boolean, default=False)
    tem_galinheiro = db.Column(db.Boolean, default=False)

    # Estoque do Silo (Grãos)
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

    # Estoque do Armazém e Saúde
    est_sal = db.Column(db.Integer, default=0)
    est_racao = db.Column(db.Integer, default=0)
    est_adubo = db.Column(db.Integer, default=0)
    est_veneno = db.Column(db.Integer, default=0)
    est_combustivel = db.Column(db.Integer, default=0)
    est_vacina_aftosa = db.Column(db.Integer, default=0)
    est_vacina_brucelose = db.Column(db.Integer, default=0)
    est_medicamento_geral = db.Column(db.Integer, default=0)
    est_suplemento_engorda = db.Column(db.Integer, default=0)

    # Relacionamento: Uma fazenda possui vários lotes (hectares)
    lotes = db.relationship('Lote', backref='fazenda', lazy=True)

# ---------------------------------------------------------
# TABELA 3: LOTE (Os Hectares de terra dentro da Fazenda)
# ---------------------------------------------------------
class Lote(db.Model):
    __tablename__ = 'lotes'

    id = db.Column(db.Integer, primary_key=True)
    
    # A qual propriedade este pedaço de terra pertence
    fazenda_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=False)
    
    nome = db.Column(db.String(50), default="Hectare") # Ex: Hectare 1, Lote Norte
    
    # Status atual da terra: 'mato', 'limpo', 'arado', 'cercado', 'pasto', 'cultivo'
    status = db.Column(db.String(50), default='mato') 
    
    # --- MECÂNICA DE PECUÁRIA (PASTO) ---
    tem_cerca = db.Column(db.Boolean, default=False)
    tem_cocho = db.Column(db.Boolean, default=False)
    tem_bebedouro = db.Column(db.Boolean, default=False)
    tipo_capim = db.Column(db.String(50), nullable=True)  # ex: braquiaria, mombaca
    qualidade_capim = db.Column(db.Integer, default=0)    # Vai de 0 a 100%
    
    # --- MECÂNICA DE AGRICULTURA (CULTIVO) ---
    tipo_cultivo = db.Column(db.String(50), nullable=True) # ex: cafe, cacau, soja
    dias_crescimento = db.Column(db.Integer, default=0)    # Tempo para colheita
    
    # MUDANÇA AQUI: Deixe o relacionamento básico
    # O "animais" aqui será um método que busca os animais que correspondem ao status do lote
    @property
    def animais(self):
        # Busca animais que estão no pasto correspondente a este lote
        busca = f'pasto_{self.id}'
        lista = Animal.query.filter(Animal.onde_esta == busca).all()
        # Debug no console do Termux para você ver se ele está achando algo
        print(f"DEBUG: Buscando animais para o {busca}. Encontrados: {len(lista)}")
        return lista

class Animal(db.Model):
    __tablename__ = 'animais'

    id = db.Column(db.Integer, primary_key=True)
    # A qual fazenda ele pertence (se for NULL, ele está no limbo do leilão)
    propriedade_id = db.Column(db.Integer, db.ForeignKey('propriedades.id'), nullable=True)
    
    # Características
    raca = db.Column(db.String(50), nullable=False)
    sexo = db.Column(db.String(10), default='M')
    fase = db.Column(db.String(20), default='Bezerro') # Bezerro, Adulto
    peso = db.Column(db.Float, nullable=False)
    idade_meses = db.Column(db.Integer, default=0)
    
    # Saúde e Localização
    prenha = db.Column(db.Boolean, default=False)
    vacinado_aftosa = db.Column(db.Boolean, default=False)
    vacinado_brucelose = db.Column(db.Boolean, default=False)
    medicado = db.Column(db.Boolean, default=False)

    onde_esta = db.Column(db.String(50), default='curral') # curral, pasto, represa, chiqueiro, venda
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    origem = db.Column(db.String(50), default='Mercado Oficial')

class Anuncio(db.Model):
    __tablename__ = 'anuncios'

    id = db.Column(db.Integer, primary_key=True)
    vendedor_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey('animais.id'), nullable=False)
    
    valor = db.Column(db.Float, nullable=False)
    data_anuncio = db.Column(db.DateTime, default=db.func.now())
    
    # Ligações automáticas para facilitar a busca no Python
    vendedor = db.relationship('Jogador', backref='meus_anuncios')
    animal = db.relationship('Animal', backref='meu_anuncio', uselist=False)

class Transacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # A MUDANÇA ESTÁ AQUI: apontando para 'jogadores.id'
    jogador_id = db.Column(db.Integer, db.ForeignKey('jogadores.id'), nullable=False)
    tipo = db.Column(db.String(10), nullable=False) # 'entrada' ou 'saida'
    valor = db.Column(db.Float, nullable=False)
    descricao = db.Column(db.String(255), nullable=False)
    data = db.Column(db.DateTime, default=datetime.utcnow)

    jogador = db.relationship('Jogador', backref=db.backref('transacoes', lazy=True))

def popular_mapa_inicial():
    """Cria os terrenos iniciais do jogo usando os nomes originais se o banco estiver vazio"""
    if Propriedade.query.first():
        return

    print("Povoando o mapa de Rondônia com as propriedades originais...")
    
    # Listas exatas fornecidas para a identidade do jogo
    NOMES_FAZENDA = ["Estrela do Norte", "Rio Madeira", "Santa Fé", "Boa Esperança", "Nova Vida", "São João"]
    NOMES_SITIO = ["Sítio Recanto", "Sítio Sossego", "Sítio Primavera", "Sítio Beira Rio"]
    NOMES_CHACARA = ["Chácara Vovó Ana", "Chácara Bela Vista", "Chácara Paraíso"]
    
    propriedades_para_criar = []
    
        # Gera as 50 propriedades numeradas para o mapa compartilhado
    for i in range(1, 51):
        sorteio_tipo = random.choice(["Chácara", "Sítio", "Fazenda"])
        
        if sorteio_tipo == "Chácara":
            nome_base = random.choice(NOMES_CHACARA)
            preco = 5000.0
            qtd_hectares = 2  # Chácara começa com 2 lotes
        elif sorteio_tipo == "Sítio":
            nome_base = random.choice(NOMES_SITIO)
            preco = 25000.0
            qtd_hectares = 5  # Sítio começa com 5 lotes
        else:
            nome_base = random.choice(NOMES_FAZENDA)
            preco = 100000.0  # Fazenda
            qtd_hectares = 10 # Fazenda começa com 10 lotes
            
        nome_final = f"{nome_base} {i}"
        
        nova_terra = Propriedade(nome=nome_final, preco=preco, tipo=sorteio_tipo, dono_id=None)
        
        # A MÁGICA AQUI: Gera os hectares de mato para a propriedade!
        for j in range(1, qtd_hectares + 1):
            from database import Lote # Garante a importação
            novo_lote = Lote(nome=f"Hectare {j}", status='mato')
            nova_terra.lotes.append(novo_lote)
            
        propriedades_para_criar.append(nova_terra)
        
    db.session.add_all(propriedades_para_criar)
    db.session.commit()
    print("Mapa povoado com sucesso, agora com lotes de mato!")

    