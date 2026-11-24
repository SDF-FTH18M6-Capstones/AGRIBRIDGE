"""One password policy for registration, changes, resets and staff provisioning."""
import re

COMMON = {'password123!', 'password1234!', 'password12345!', 'qwerty123456!',
          'welcome12345!', 'administrator1!', 'agribridge123!', 'changeme12345!'}


def password_errors(value):
    if not isinstance(value, str):
        return ['Enter a password.']
    errors = []
    if len(value) < 12: errors.append('Use at least 12 characters.')
    if len(value.encode('utf-8')) > 72: errors.append('Use at most 72 UTF-8 bytes.')
    if not re.search(r'[A-Z]', value): errors.append('Include an uppercase letter.')
    if not re.search(r'[a-z]', value): errors.append('Include a lowercase letter.')
    if not re.search(r'[0-9]', value): errors.append('Include a number.')
    if not re.search(r'[^\w\s]|_', value, re.UNICODE): errors.append('Include a special character.')
    root = re.sub(r'[^a-z]', '', value.casefold())
    if value.casefold() in COMMON or root in {'password','qwerty','welcome','admin','administrator','letmein','changeme','agribridge'}: errors.append('Choose a less common password.')
    return errors


def validate_password(value):
    errors = password_errors(value)
    if errors: raise ValueError(' '.join(errors))
    return value
