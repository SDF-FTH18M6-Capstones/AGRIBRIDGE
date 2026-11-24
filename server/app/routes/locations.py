from flask import Blueprint, jsonify
from app.services.locations import DATA
locations_bp = Blueprint('locations',__name__)

@locations_bp.get('/locations')
def locations():
    response = jsonify(data=DATA)
    response.headers['Cache-Control'] = 'public, max-age=86400'
    return response
