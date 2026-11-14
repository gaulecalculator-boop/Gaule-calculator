import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAppIntegrityLock } from './utils/appIntegrityLock';

initAppIntegrityLock();

createRoot(document.getElementById('root')!).render(<App />);
