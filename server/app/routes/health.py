from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    return jsonify({
        "status": "ok",
        "service": "agribridge-api"
    }), 200

@health_bp.get('/ready')
def readiness_check():
    """Deployment readiness includes database connectivity, without leaking errors."""
    from sqlalchemy import text
    from sqlalchemy.exc import SQLAlchemyError
    from app.extensions import db
    try:
        db.session.execute(text('SELECT 1'))
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(status='unavailable', service='agribridge-api'), 503
    return jsonify(status='ok', service='agribridge-api'), 200
