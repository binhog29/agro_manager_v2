from flask import Blueprint, jsonify, request, session
from database import db, Jogador, Propriedade

agricultura_bp = Blueprint('agricultura', __name__)

# O esqueleto está pronto! As rotas de sementes, colheita e silo entrarão aqui.
