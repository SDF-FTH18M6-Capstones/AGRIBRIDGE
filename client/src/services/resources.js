import api from './api';
import { createResourceLoader } from './resourceLoader';
export const resources = createResourceLoader(path => api.get(path), () => `${sessionStorage.getItem('agribridge_auth_token') || 'guest'}:${sessionStorage.getItem('agribridge_tab_id') || ''}`);
if (typeof window !== 'undefined') {
  for (const name of ['agribridge:resource-invalidated', 'agribridge:unauthorized', 'agribridge:session-updated']) window.addEventListener(name, resources.invalidate);
}
