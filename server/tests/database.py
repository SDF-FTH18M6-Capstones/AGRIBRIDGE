"""Disposable local database setup for route integration tests."""
from contextlib import contextmanager
from app import create_app
from app.extensions import db
from app.models import Role


@contextmanager
def isolated_app():
    # Intentionally ignore .env database URLs: test data must never reach a shared DB.
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
                      'SECRET_KEY': 'local-test-secret',
                      'JWT_SECRET_KEY': 'local-test-jwt-secret-at-least-32-bytes'})
    with app.app_context():
        db.create_all()
        db.session.add_all([Role(role_name=name) for name in ('farmer', 'buyer', 'admin', 'field_officer')])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()
