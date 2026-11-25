"""Explicit operator commands; never provision privileged demo users at startup."""
import click
from marshmallow import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import Admin, User
from app.schemas.user_schema import UserSchema
from app.services.commerce import audit


def register_operator_commands(app):
    @app.cli.command('create-admin')
    @click.option('--email', prompt='Administrator email')
    @click.option('--full-name', prompt='Full name')
    @click.password_option(confirmation_prompt=True)
    def create_admin(email, full_name, password):
        """Create a NEW administrator intentionally, with a hidden strong password."""
        try:
            values=UserSchema().load({'email':email.strip().lower(),'full_name':full_name.strip(),'password':password})
        except ValidationError as error:
            raise click.ClickException(' '.join(str(message) for messages in error.messages.values() for message in messages)) from None
        if db.session.scalar(select(User).where(func.lower(User.email)==values['email'])):
            raise click.ClickException('That account already exists. No password, role or profile was changed.')
        user=User(full_name=values['full_name'],email=values['email'])
        user.set_password(password)
        try:
            db.session.add(user);db.session.flush()
            db.session.add(Admin(user_id=user.user_id,status='active'))
            audit('user',user.user_id,'administrator_created',user.user_id,source='operator_cli')
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise click.ClickException('The account could not be created because it conflicts with an existing account.') from None
        click.echo('Administrator created. Sign in using the normal login page.')
