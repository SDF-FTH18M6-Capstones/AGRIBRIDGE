
from flask import Flask
from flask_cors import CORS

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

from app.seed import register_seed_command


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
        resources={r"/api/*": {"origins": ["http://localhost:5173"]}},
    )

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(profiles_bp, url_prefix="/api/profiles")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(responses_bp, url_prefix="/api")
    app.register_blueprint(reviews_bp, url_prefix="/api")
    app.register_blueprint(dashboards_bp, url_prefix="/api/dashboards")

    register_seed_command(app)

    return app
