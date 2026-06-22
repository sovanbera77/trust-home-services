import { Phone, MessageSquare, Mail, MapPin, User as UserIcon } from 'lucide-react';
import type { User } from '../../lib/types';
import { t } from '../../lib/i18n';

interface ContactCardProps {
  user?: User;
  label?: string; // e.g. "Customer", "Assigned Technician"
}

/**
 * Shows a person's contact details with quick Call / WhatsApp / Email actions.
 * Used by admin, customer and employee dashboards for mutual visibility.
 */
export default function ContactCard({ user, label }: ContactCardProps) {
  if (!user) return null;

  const phone = user.mobile || '';
  const cleanPhone = phone.replace(/[^\d]/g, '');

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
      {label && (
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide">{label}</p>
      )}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center font-bold text-sm shrink-0">
          {(user.name || user.username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
            <UserIcon size={12} className="text-[#94a3b8]" />
            {user.name || user.username}
            {user.specialty && (
              <span className="chip !py-0 !px-1.5 !text-[10px]">{user.specialty}</span>
            )}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-[#94a3b8]">
            {phone && (
              <p className="flex items-center gap-1.5">
                <Phone size={11} /> {phone}
              </p>
            )}
            {user.email && (
              <p className="flex items-center gap-1.5 truncate">
                <Mail size={11} /> {user.email}
              </p>
            )}
            {user.address && (
              <p className="flex items-center gap-1.5">
                <MapPin size={11} /> {user.address}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap pt-1">
        {cleanPhone && (
          <>
            <a
              href={`tel:${cleanPhone}`}
              className="btn btn-primary text-xs !py-1.5 !px-3"
            >
              <Phone size={13} className="mr-1" /> {t('contact.call')}
            </a>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-xs !py-1.5 !px-3"
              style={{ background: '#22c55e', color: 'white' }}
            >
              <MessageSquare size={13} className="mr-1" /> {t('contact.whatsapp')}
            </a>
          </>
        )}
        {user.email && (
          <a
            href={`mailto:${user.email}`}
            className="btn btn-secondary text-xs !py-1.5 !px-3"
          >
            <Mail size={13} className="mr-1" /> {t('contact.email')}
          </a>
        )}
      </div>
    </div>
  );
}
