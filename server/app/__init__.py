from pathlib import Path
from flask import Flask
from flask_cors import CORS

from app.routes.farmer_verifications import farmer_verifications_bp
from app.routes.orders import orders_bp
from app.routes.payments import payments_bp
from app.config import Config
from app.extensions import db, migrate, jwt, bcrypt
from app import models

from app.routes.auth import auth_bp
from app.routes.products import products_bp
from app.routes.profiles import profiles_bp
from app.routes.categories import categories_bp
from app.routes.requests import requests_bp
from app.routes.responses import responses_bp
from app.routes.reviews import reviews_bp
from app.routes.health import health_bp
from app.routes.dashboards import dashboards_bp
from app.routes.saved_products import saved_products_bp

from app.seed import register_seed_command
from app.routes.portal import portal_bp
from app.routes.v1 import v1_bp
from app.services.worker import register_worker


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    if not app.config.get("TESTING"):
        required_secrets = ("SECRET_KEY", "JWT_SECRET_KEY")
        missing_secrets = [
            key for key in required_secrets
            if not app.config.get(key)
        ]

        if missing_secrets:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing_secrets)}"
            )

    if app.config.get("TESTING") and not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
    )

    db.init_app(app)
    migrate.init_app(app, db, directory=str(Path(__file__).resolve().parent.parent / "migrations"))
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(farmer_verifications_bp, url_prefix="/api/farmer-verifications")
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(profiles_bp, url_prefix="/api/profiles")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(responses_bp, url_prefix="/api")
    app.register_blueprint(reviews_bp, url_prefix="/api")
    app.register_blueprint(dashboards_bp, url_prefix="/api/dashboards")
    app.register_blueprint(saved_products_bp, url_prefix="/api/saved-products")

    app.register_blueprint(portal_bp, url_prefix="/api")

    app.register_blueprint(v1_bp, url_prefix="/api")
    from app.routes.locations import locations_bp
    from app.routes.sessions import sessions_bp
    from app.routes.media import media_bp
    app.register_blueprint(locations_bp, url_prefix='/api')
    app.register_blueprint(sessions_bp, url_prefix='/api')
    app.register_blueprint(media_bp, url_prefix='/api')
    register_worker(app)
    register_seed_command(app)
    from app.commands import register_operator_commands
    register_operator_commands(app)

    @app.errorhandler(413)
    def oversized_upload(error):
        from flask import jsonify
        return jsonify(error={'code':'FILE_TOO_LARGE','message':'Upload one file at a time: images up to 5 MB and PDFs up to 10 MB.'}),413

    @app.before_request
    def sensitive_password_confirmation():
        from flask import request, jsonify
        if request.method not in ['PATCH','PUT','POST','DELETE']: return
        if not (request.path.startswith('/api/admin/order-issues/') or request.path == '/api/admin/settings' or request.path.startswith('/api/sessions/revoke')): return
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        from app.services.sessions import require_recent_password
        if not require_recent_password():
            return jsonify(error={'code':'REAUTH_REQUIRED','message':'Confirm your password to continue.'}),403

    return app
