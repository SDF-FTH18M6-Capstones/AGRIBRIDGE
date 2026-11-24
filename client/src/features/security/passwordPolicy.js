export function passwordRules(value = '') {
  const root = value.toLowerCase().replace(/[^a-z]/g, '');
  const common = ['password', 'qwerty', 'welcome', 'admin', 'administrator', 'letmein', 'changeme', 'agribridge'].includes(root);
  return [
    ['length', 'At least 12 characters', [...value].length >= 12],
    ['uppercase', 'An uppercase letter', /[A-Z]/.test(value)],
    ['lowercase', 'A lowercase letter', /[a-z]/.test(value)],
    ['number', 'A number', /[0-9]/.test(value)],
    ['special', 'A special character', /[^\p{L}\p{N}\s]|_/u.test(value)],
    ['bytes', 'At most 72 UTF-8 bytes', new TextEncoder().encode(value).length <= 72],
    ['common', 'Avoid common, predictable passwords', value.length > 0 && !common],
  ];
}
export const strongPassword = value => passwordRules(value).every(([, , valid]) => valid);
