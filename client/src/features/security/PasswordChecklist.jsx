import { passwordRules } from './passwordPolicy';
export default function PasswordChecklist({ value }) {
  return <ul aria-label="Password requirements" className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">{passwordRules(value).map(([id, label, valid]) => <li key={id} className={`flex items-center gap-2 ${valid ? 'text-green-800' : 'text-gray-500'}`}><svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" />{valid && <path d="m6 10 3 3 5-6" stroke="currentColor" strokeWidth="2" />}</svg>{label}</li>)}</ul>;
}
