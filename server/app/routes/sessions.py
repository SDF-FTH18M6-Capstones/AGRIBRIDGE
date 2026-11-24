from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, update
from app.extensions import db
from app.models import AuthSession, UsedRefresh, User
from app.services.sessions import digest, valid, serialize, new_session, credentials, current_session
from app.services.commerce import now, audit
from app.services.passwords import password_errors

sessions_bp=Blueprint('sessions',__name__)


def failure(message,status=401): return jsonify(error={'code':'SESSION_INVALID','message':message}),status


@sessions_bp.post('/sessions/refresh')
def refresh():
    body=request.get_json(silent=True) or {}
    token=body.get('refresh_token') if isinstance(body,dict) else None
    if not isinstance(token,str) or not 20<len(token)<300: return failure('Please log in again.')
    hashed=digest(token)
    session=db.session.scalar(select(AuthSession).where(AuthSession.refresh_hash==hashed).with_for_update().execution_options(populate_existing=True))
    if not session:
        old=db.session.get(UsedRefresh,hashed)
        if old:
            db.session.execute(update(AuthSession).where(AuthSession.session_id==old.session_id).values(revoked_at=now()))
            db.session.commit()
        return failure('This session is no longer valid. Please log in again.')
    if not valid(session) or request.headers.get('X-Tab-ID')!=session.tab_id:
        return failure('This session expired or belongs to another tab. Please log in again.')
    import secrets
    rotated=secrets.token_urlsafe(48)
    db.session.add(UsedRefresh(token_hash=hashed,session_id=session.session_id))
    session.refresh_hash=digest(rotated)
    result=credentials(session,rotated);db.session.commit()
    return jsonify(data=result)


@sessions_bp.post('/sessions/end')
def end_session():
    # Logout also works after the short-lived access token expires, and races
    # safely with rotation. Only this session is revoked, never the user's others.
    body=request.get_json(silent=True) or {}
    token=body.get('refresh_token') if isinstance(body,dict) else None
    if not isinstance(token,str) or not 20<len(token)<300: return failure('Invalid session.',400)
    hashed=digest(token)
    session=db.session.scalar(select(AuthSession).where(AuthSession.refresh_hash==hashed).with_for_update())
    if not session:
        used=db.session.get(UsedRefresh,hashed)
        session=db.session.get(AuthSession,used.session_id) if used else None
    if not session or request.headers.get('X-Tab-ID')!=session.tab_id: return failure('Session not found.',404)
    session.revoked_at=now();db.session.commit()
    return jsonify(message='This tab is signed out.')


@sessions_bp.get('/sessions/current')
@jwt_required()
def current():
    session=current_session()
    return jsonify(data=serialize(session)) if session else failure('Please log in again.')


@sessions_bp.post('/sessions/activity')
@jwt_required()
def activity():
    session=current_session()
    if not session: return failure('Please log in again.')
    session.last_activity_at=now();db.session.commit()
    return jsonify(data=serialize(session))


@sessions_bp.get('/sessions')
@jwt_required()
def sessions():
    rows=db.session.scalars(select(AuthSession).where(AuthSession.user_id==int(get_jwt_identity())).order_by(AuthSession.created_at.desc()).limit(100)).all()
    current=current_session()
    return jsonify(data=[{**serialize(s),'current':bool(current and current.session_id==s.session_id)} for s in rows])


@sessions_bp.delete('/sessions/<session_id>')
@jwt_required()
def revoke(session_id):
    session=db.session.get(AuthSession,session_id)
    if not session or session.user_id!=int(get_jwt_identity()): return failure('Session not found.',404)
    session.revoked_at=now();audit('user',session.user_id,'session_revoked',session.user_id,session_id=session_id);db.session.commit()
    return jsonify(message='Session signed out.')


@sessions_bp.post('/sessions/revoke')
@jwt_required()
def revoke_many():
    body=request.get_json(silent=True) or {}
    if not isinstance(body,dict) or body.get('scope') not in ['others','all']: return failure('Choose other sessions or all sessions.',400)
    uid=int(get_jwt_identity());session=current_session()
    query=update(AuthSession).where(AuthSession.user_id==uid,AuthSession.revoked_at.is_(None))
    if body['scope']=='others' and session: query=query.where(AuthSession.session_id!=session.session_id)
    db.session.execute(query.values(revoked_at=now()))
    if body['scope']=='all':
        user=db.session.get(User,uid);user.auth_version+=1
    audit('user',uid,'sessions_revoked',uid,scope=body['scope']);db.session.commit()
    return jsonify(message='Sessions signed out.')


@sessions_bp.post('/sessions/reauthenticate')
@jwt_required()
def reauthenticate():
    body=request.get_json(silent=True) or {};user=db.session.get(User,int(get_jwt_identity()))
    if not isinstance(body,dict) or not user.check_password(body.get('password')): return failure('Password is incorrect.',400)
    session=current_session()
    if session: session.verified_at=now();db.session.commit()
    return jsonify(message='Password confirmed.')


@sessions_bp.post('/change-password')
@jwt_required()
def change_password():
    body=request.get_json(silent=True) or {}
    if not isinstance(body,dict): return failure('Enter your current and new passwords.',400)
    uid=int(get_jwt_identity())
    user=db.session.scalar(select(User).where(User.user_id==uid).with_for_update())
    if not user.check_password(body.get('current_password')): return failure('Current password is incorrect.',400)
    errors=password_errors(body.get('new_password'))
    if errors: return failure(' '.join(errors),400)
    if body.get('confirm_password')!=body.get('new_password'): return failure('Passwords do not match.',400)
    if user.check_password(body['new_password']): return failure('Choose a different new password.',400)
    user.set_password(body['new_password']);user.auth_version+=1
    db.session.execute(update(AuthSession).where(AuthSession.user_id==uid).values(revoked_at=now()))
    audit('user',uid,'password_changed',uid);db.session.commit()
    return jsonify(message='Password changed. Please log in again on each tab.')
