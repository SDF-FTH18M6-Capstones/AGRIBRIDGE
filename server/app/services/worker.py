"""Independent durable-work loop: expiry, reconciliation and notification email."""
from datetime import timedelta
from email.message import EmailMessage
import smtplib
import ssl
import time
import click
from flask import current_app
from sqlalchemy import select
from app.extensions import db
from app.models import Notification, Payment
from app.services.commerce import now, expire_due_orders, settle_payment


def deliver_emails(limit=20):
    app = current_app
    if not app.config.get('NOTIFICATION_EMAILS_ENABLED') or not app.config.get('MAIL_SERVER') or not app.config.get('MAIL_DEFAULT_SENDER'):
        return 0
    ids = db.session.scalars(select(Notification.notification_id).where(
        Notification.email_status == 'pending',
        (Notification.email_retry_at.is_(None) | (Notification.email_retry_at <= now())),
    ).order_by(Notification.notification_id).limit(limit)).all()
    sent = 0
    for notification_id in ids:
        row = db.session.scalar(select(Notification).where(Notification.notification_id == notification_id)
                                .with_for_update(skip_locked=True).execution_options(populate_existing=True))
        if not row or row.email_status != 'pending':
            db.session.commit(); continue
        message = EmailMessage()
        message['Subject'], message['From'], message['To'] = row.title, app.config['MAIL_DEFAULT_SENDER'], row.user.email
        message.set_content(row.message+'\n\n'+app.config['PUBLIC_FRONTEND_URL'].rstrip('/')+row.link)
        transport = smtplib.SMTP_SSL if app.config['MAIL_USE_SSL'] else smtplib.SMTP
        try:
            with transport(app.config['MAIL_SERVER'], app.config['MAIL_PORT'], timeout=app.config['MAIL_TIMEOUT'],
                           **({'context': ssl.create_default_context()} if app.config['MAIL_USE_SSL'] else {})) as smtp:
                if app.config['MAIL_USE_TLS'] and not app.config['MAIL_USE_SSL']:
                    smtp.starttls(context=ssl.create_default_context())
                if app.config.get('MAIL_USERNAME'):
                    smtp.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
                smtp.send_message(message)
            row.email_status = 'sent'; sent += 1
        except Exception:
            app.logger.warning('Notification email delivery failed for notification %s', row.notification_id)
            row.email_attempts += 1
            row.email_status = 'failed' if row.email_attempts >= 5 else 'pending'
            row.email_retry_at = now()+timedelta(minutes=2**row.email_attempts)
        db.session.commit()
    return sent


def reconcile_pending(limit=20):
    from app.services import paystack
    if not paystack.configured():
        return 0
    ids = db.session.scalars(select(Payment.payment_id).where(
        Payment.payment_status == 'pending', Payment.payment_method == 'paystack', Payment.provider_request_id.is_not(None),
        ~Payment.provider_request_id.startswith('awaiting:'),
    ).order_by(Payment.updated_at, Payment.payment_id).limit(limit)).all()
    count = 0
    for payment_id in ids:
        payment = db.session.get(Payment, payment_id)
        try:
            result = paystack.query(payment.provider_request_id)
            settle_payment(payment, result)
            db.session.commit(); count += 1
        except paystack.ProviderError:
            db.session.rollback()
            current_app.logger.warning('Payment %s is awaiting provider reconciliation', payment_id)
        payment = db.session.get(Payment, payment_id)
        payment.updated_at = now()
        db.session.commit()
    return count


def run_once():
    reconciled = reconcile_pending()
    expired = expire_due_orders()
    emailed = deliver_emails()
    # Close read-only transactions too; an idle worker must not pin a DB snapshot.
    db.session.commit()
    return {'reconciled': reconciled, 'expired': expired, 'emailed': emailed}


def register_worker(app):
    @app.cli.command('v1-worker')
    @click.option('--once', is_flag=True, help='Process one batch and exit.')
    def worker(once):
        """Run as a separate supervised process, even when no browsers are open."""
        while True:
            try:
                result = run_once()
                if once:
                    click.echo(result)
            except Exception:
                db.session.rollback()
                app.logger.exception('V1 worker batch failed')
                if once:
                    raise
            if once:
                break
            time.sleep(max(1, app.config['WORKER_INTERVAL_SECONDS']))
