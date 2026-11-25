"""Deployment endpoints must distinguish process health from database readiness."""
from unittest.mock import patch
from sqlalchemy.exc import SQLAlchemyError
from app import create_app


def app():
    return create_app({'TESTING':True,'SECRET_KEY':'test-secret','JWT_SECRET_KEY':'x'*40,
                       'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:'})


def test_readiness_checks_database_and_returns_no_sensitive_errors():
    client=app().test_client()
    assert client.get('/api/health').status_code==200
    assert client.get('/api/ready').json['status']=='ok'
    with patch('app.extensions.db.session.execute',side_effect=SQLAlchemyError('private connection details')):
        response=client.get('/api/ready')
    assert response.status_code==503
    assert response.json=={'status':'unavailable','service':'agribridge-api'}
    assert b'private connection' not in response.data


def test_operator_creates_new_admin_without_overwriting_existing_accounts():
    from app.extensions import db
    from app.models import User, Admin
    application=app()
    with application.app_context():
        db.create_all()
        runner=application.test_cli_runner()
        args=['create-admin','--email','operator@example.com','--full-name','Deployment Operator']
        password='FreshDeployment2026!'
        result=runner.invoke(args=args,input=f'{password}\n{password}\n')
        assert result.exit_code==0,result.output
        assert password not in result.output
        user=User.query.one();assert user.check_password(password)
        assert Admin.query.one().status=='active'
        original=user.password_hash
        result=runner.invoke(args=args,input=f'{password}\n{password}\n')
        assert result.exit_code!=0 and 'already exists' in result.output
        assert User.query.count()==1 and user.password_hash==original
        result=runner.invoke(args=['create-admin','--email','other@example.com','--full-name','Other Operator'],input='weak\nweak\n')
        assert result.exit_code!=0 and User.query.count()==1
        db.session.remove();db.drop_all()
