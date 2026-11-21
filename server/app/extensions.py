
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
bcrypt = Bcrypt()


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    from app.models import RevokedToken, User

    jti = jwt_payload.get("jti")
    identity = jwt_payload.get("sub")

    if not jti or not identity:
        return True

    revoked = db.session.query(RevokedToken).filter_by(
        jti=jti
    ).first()

    if revoked is not None:
        return True

    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return True

    user = db.session.get(User, user_id)

    return user is None
