from flask import Blueprint, jsonify, request, session
from database import db, Lote

cultivo_bp = Blueprint('cultivo', __name__)

@cultivo_bp.route('/api/cultivo/plantar', methods=['POST'])
def plantar_semente():
    if 'usuario' not in session:
        return jsonify({'sucesso': False, 'erro': 'Sessão expirada.'})

    dados = request.get_json()
    lote_id = dados.get('lote_id')
    tipo_cultivo = dados.get('tipo_cultivo') # 'soja' ou 'milho'

    lote = Lote.query.get(lote_id)
    if not lote:
        return jsonify({'sucesso': False, 'erro': 'Terra não encontrada.'})

    if lote.status != 'arado':
        return jsonify({'sucesso': False, 'erro': 'A terra precisa estar arada antes de plantar!'})

    # Joga a semente na terra
    lote.status = 'plantado'
    lote.tipo_cultivo = tipo_cultivo
    
    db.session.commit()

    return jsonify({'sucesso': True, 'msg': f'Sementes de {tipo_cultivo.capitalize()} plantadas com sucesso!'})
