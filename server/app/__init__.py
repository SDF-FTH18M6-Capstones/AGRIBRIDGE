from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db, migrate, jwt
from app.routes.products import products_bp
from app.routes.health import health_bp


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    if app.config.get("TESTING") and not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    CORS(
        app,
        resources={r"/api/*": {
            "origins": ["http://localhost:5173"]
        }}
    )

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    app.register_blueprint( products_bp, url_prefix="/api/products")
    app.register_blueprint(health_bp, url_prefix="/api")

    return app