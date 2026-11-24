import { renderToString } from 'react-dom/server';
import ProductPages from './features/marketplace/ProductPages';
export function render(props) {
  return renderToString(<ProductPages {...props} />);
}
