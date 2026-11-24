
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

    if user is None or jwt_payload.get('auth_version',0) != user.auth_version: return True
    sid = jwt_payload.get('sid')
    if not sid:
        from flask import current_app
        return not current_app.testing
    from flask import request
    from app.models import AuthSession
    from app.services.sessions import valid
    session = db.session.get(AuthSession, sid)
    return not session or session.user_id != user_id or request.headers.get('X-Tab-ID') != session.tab_id or not valid(session)


@jwt.additional_claims_loader
def user_token_version(identity):
    from app.models import User
    user = db.session.get(User, int(identity))
    return {"auth_version": user.auth_version if user else 0}
