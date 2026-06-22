import { Link } from 'react-router-dom';
import { t } from '../lib/i18n';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0b1120' }}>
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-bold text-indigo-500/30">404</div>
        <h1 className="text-2xl font-bold text-white">{t('notFound.title')}</h1>
        <p className="text-[#94a3b8]">{t('notFound.message')}</p>
        <Link to="/" className="btn btn-primary inline-flex">
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  );
}
