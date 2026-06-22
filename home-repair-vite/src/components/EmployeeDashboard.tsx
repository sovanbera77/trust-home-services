import { useState, useRef, useMemo, useEffect } from 'react';
import { t } from '../lib/i18n';
import { useStore } from '../store/useStore';
import {
  MapPin,
  MessageSquare,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Send,
  ClipboardList,
  Camera,
  Phone,
} from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import ContactCard from './ui/ContactCard';
import NotificationCenter from './ui/NotificationCenter';
import type { Attendance, ChatMessage } from '../lib/types';
import { getCurrentPosition, takePhoto } from '../lib/native';
import { uuid } from '../lib/utils';
import { startTracking, stopTracking } from '../lib/tracking';
import { openCall } from '../lib/call';
import RouteOptimizer from './ui/RouteOptimizer';
import DocketTimeline from './ui/DocketTimeline';
import { isWithinGeofence, getGeofence } from '../lib/geofence';

export default function EmployeeDashboard() {
  const currentUser = useStore((s) => s.currentUser);
  const users = useStore((s) => s.users);
  const allDockets = useStore((s) => s.dockets);
  const allAttendance = useStore((s) => s.attendance);
  const addDocket = useStore((s) => s.addDocket);
  const addAttendance = useStore((s) => s.addAttendance);

  useEffect(() => {
    if (currentUser?.status === 'online') {
      startTracking(currentUser.username, 30000);
    }
    return () => stopTracking();
  }, [currentUser?.username, currentUser?.status]);

  const myDockets = useMemo(() => allDockets.filter((d) => d.assignedTo === currentUser?.username), [allDockets, currentUser]);
  const myAttendance = useMemo(() => allAttendance.filter((a) => a.user_id === currentUser?.username), [allAttendance, currentUser]);

  const [chatDocketId, setChatDocketId] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [completeDocketId, setCompleteDocketId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<string | null>(null);
  const [timelineDocketId, setTimelineDocketId] = useState<string | null>(null);

  const [completeForm, setCompleteForm] = useState({
    serviceFee: 0,
    materialCosts: 0,
    usedPart: '',
    amountReceived: 0,
    paymentMethod: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [completePhotos, setCompletePhotos] = useState<string[]>([]);

  function handleToggleDuty() {
    if (!currentUser) return;
    const newStatus = currentUser.status === 'online' ? 'offline' as const : 'online' as const;
    const updated = users.map((u) =>
      u.username === currentUser.username
        ? { ...u, status: newStatus }
        : u
    );
    useStore.setState({ users: updated, currentUser: { ...currentUser, status: newStatus } });
    if (newStatus === 'online') {
      startTracking(currentUser.username, 30000);
    } else {
      stopTracking();
    }
  }

  function handleCheckIn(docketId: string) {
    setGpsLoading(docketId);
    getCurrentPosition().then((pos) => {
      if (!pos) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const { inside, distance } = isWithinGeofence(p.coords.latitude, p.coords.longitude);
              if (!inside) {
                const ans = confirm(`You are ${Math.round(distance)}m outside the allowed geofence (${getGeofence().radius}m). Check in anyway?`);
                if (!ans) { setGpsLoading(null); return; }
              }
              const record: Attendance = {
                id: `att-${Date.now()}`,
                user_id: currentUser?.username || '',
                type: 'check-in',
                lat: p.coords.latitude,
                lng: p.coords.longitude,
                created_at: new Date().toISOString(),
              };
              addAttendance(record);
              setGpsLoading(null);
            },
            () => {
              setGpsLoading(null);
              alert(t('employee.gpsEnable'));
            }
          );
        } else {
          setGpsLoading(null);
          alert(t('employee.gpsNotAvailable'));
        }
        return;
      }
      const { inside, distance } = isWithinGeofence(pos.lat, pos.lng);
      if (!inside) {
        const ans = confirm(`You are ${Math.round(distance)}m outside the allowed geofence (${getGeofence().radius}m). Check in anyway?`);
        if (!ans) { setGpsLoading(null); return; }
      }
      const record: Attendance = {
        id: `att-${Date.now()}`,
        user_id: currentUser?.username || '',
        type: 'check-in',
        lat: pos.lat,
        lng: pos.lng,
        created_at: new Date().toISOString(),
      };
      addAttendance(record);
      setGpsLoading(null);
    });
  }

  async function handleCapturePhoto() {
    const photo = await takePhoto();
    if (photo) {
      setCompletePhotos((prev) => [...prev, photo]);
    }
  }

  function handleSendChat(docketId: string) {
    if (!chatText.trim()) return;
    const docket = allDockets.find((d) => d.id === docketId);
    if (docket) {
      const msg: ChatMessage = {
        sender: currentUser?.name || currentUser?.username || '',
        text: chatText,
        time: new Date().toISOString(),
      };
      addDocket({ ...docket, chat: [...docket.chat, msg] });
      addActivityLog({ id: uuid(), docketId, action: 'chat', actor: currentUser?.username || 'employee', detail: chatText, timestamp: new Date().toISOString() });
      setChatText('');
    }
  }

  const addNotification = useStore((s) => s.addNotification);
  const addActivityLog = useStore((s) => s.addActivityLog);
  const activityLogs = useStore((s) => s.activityLogs);

  function handleCompleteJob(docketId: string) {
    const docket = allDockets.find((d) => d.id === docketId);
    if (!docket) return;
    addDocket({
      ...docket,
      status: 'completed',
      completedDate: new Date().toISOString(),
      serviceFee: completeForm.serviceFee,
      materialCosts: completeForm.materialCosts,
      usedPart: completeForm.usedPart,
      amountReceived: completeForm.amountReceived,
      paymentMethod: completeForm.paymentMethod,
      photoUrls: [...docket.photoUrls, ...completePhotos],
    });
    addActivityLog({ id: uuid(), docketId, action: 'completed', actor: currentUser?.username || 'employee', detail: `Job completed by ${currentUser?.name}`, timestamp: new Date().toISOString() });
    addNotification({ id: uuid(), userId: 'admin', title: 'Job Completed', body: `${currentUser?.name} completed "${docket.title}"`, type: 'success', read: false, createdAt: new Date().toISOString() });
    addNotification({ id: uuid(), userId: docket.customer, title: 'Work Completed', body: `Your docket "${docket.title}" has been completed by ${currentUser?.name}`, type: 'success', read: false, createdAt: new Date().toISOString() });
    addAttendance({ id: uuid(), user_id: currentUser?.username || '', type: 'check-in', created_at: new Date().toISOString() });
    setCompleteDocketId(null);
    setCompleteForm({ serviceFee: 0, materialCosts: 0, usedPart: '', amountReceived: 0, paymentMethod: '' });
    setCompletePhotos([]);
  }

  function handleCompletePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompletePhotos((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveCompletePhoto(index: number) {
    setCompletePhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function getCustomer(username: string) {
    return users.find((u) => u.username === username);
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {t('dashboard.welcome')}, {currentUser?.name || 'Employee'}
            {currentUser?.specialty && (
              <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full font-medium">
                {currentUser.specialty}
              </span>
            )}
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">{t('dashboard.subtitle.employee')}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            className={`btn flex items-center gap-2 ${
              currentUser?.status === 'online'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}
            onClick={handleToggleDuty}
          >
            {currentUser?.status === 'online' ? <Wifi size={16} /> : <WifiOff size={16} />}
            {currentUser?.status === 'online' ? t('employee.onDuty') : t('employee.offDuty')}
          </button>
        </div>
      </div>

      <RouteOptimizer />

      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClipboardList size={20} className="text-[#94a3b8]" />
          {t('employee.myJobs')}
        </h2>
        {myDockets.length === 0 ? (
          <p className="text-[#94a3b8] text-sm">{t('employee.noJobs')}</p>
        ) : (
          <div className="space-y-3">
            {myDockets.map((docket) => (
              <div key={docket.id} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{docket.title}</h3>
                      <StatusBadge status={docket.status} />
                    </div>
                  </div>
                </div>
                <ContactCard user={getCustomer(docket.customer)} label={t('employee.customer')} />
                <div className="grid grid-cols-2 gap-2 text-sm text-[#94a3b8]">
                  {docket.expectedDate && (
                    <span>{t('employee.expected')} {new Date(docket.expectedDate).toLocaleDateString()}</span>
                  )}
                </div>
                {docket.status === 'assigned' && docket.expectedDate && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-400 font-medium text-sm">
                      {t('employee.expectedCompletion')} {new Date(docket.expectedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {docket.status === 'completed' && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1 text-sm">
                    <p className="text-green-400 font-medium">{t('employee.completionDetails')}</p>
                    <p className="text-[#94a3b8]">
                      {t('employee.serviceFee')}: ₹{docket.serviceFee} | {t('employee.materialCosts')}: ₹{docket.materialCosts}
                    </p>
                    {docket.usedPart && <p className="text-[#94a3b8]">{t('employee.usedPart')}: {docket.usedPart}</p>}
                    <p className="text-[#94a3b8]">
                      Received: ₹{docket.amountReceived} via {docket.paymentMethod}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {docket.status === 'assigned' && (
                    <>
                      <button
                        className="btn btn-secondary flex items-center gap-1.5 text-xs"
                        onClick={() =>
                          setChatDocketId(chatDocketId === docket.id ? null : docket.id)
                        }
                      >
                        <MessageSquare size={14} />
                        {t('employee.chat')}
                      </button>
                      <button
                        className="btn btn-secondary flex items-center gap-1.5 text-xs"
                        onClick={() => openCall(docket.customer, getCustomer(docket.customer)?.name || docket.customer, 'audio')}
                      >
                        <Phone size={14} />
                        {t('call.call')}
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(docket.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary flex items-center gap-1.5 text-xs"
                      >
                        <MapPin size={14} />
                        {t('employee.navigate')}
                      </a>
                      <button
                        className="btn btn-secondary flex items-center gap-1.5 text-xs"
                        onClick={() => handleCheckIn(docket.id)}
                        disabled={gpsLoading === docket.id}
                      >
                        <MapPin size={14} />
                        {gpsLoading === docket.id ? t('employee.locating') : t('employee.checkinGps')}
                      </button>
                      <button
                        className="btn flex items-center gap-1.5 text-xs"
                        style={{ background: 'var(--primary)', color: 'white' }}
                        onClick={() => {
                          setCompleteDocketId(completeDocketId === docket.id ? null : docket.id);
                          setCompleteForm({
                            serviceFee: 0,
                            materialCosts: 0,
                            usedPart: '',
                            amountReceived: 0,
                            paymentMethod: '',
                          });
                        }}
                      >
                        <CheckCircle size={14} />
                        {t('employee.completeJob')}
                      </button>
                    </>
                  )}
                </div>
                <button onClick={() => setTimelineDocketId(timelineDocketId === docket.id ? null : docket.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
                  {timelineDocketId === docket.id ? 'Hide Timeline' : 'Show Timeline'}
                </button>
                {timelineDocketId === docket.id && (
                  <div className="pt-3 border-t border-white/10">
                    <DocketTimeline logs={activityLogs.filter(l => l.docketId === docket.id)} />
                  </div>
                )}
                {chatDocketId === docket.id && (
                  <div className="bg-black/20 rounded-lg p-3 space-y-2">
                    {docket.chat.map((msg, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-[#94a3b8] text-xs">{msg.sender}: </span>
                        <span>{msg.text}</span>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat(docket.id)}
                      />
                      <button
                        className="btn btn-primary !p-2"
                        onClick={() => handleSendChat(docket.id)}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
                {completeDocketId === docket.id && (
                  <div className="bg-black/20 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium">{t('employee.completeJob')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.serviceFee')}</label>
                        <input
                          type="number"
                          min={0}
                          value={completeForm.serviceFee}
                          onChange={(e) =>
                            setCompleteForm({ ...completeForm, serviceFee: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.materialCosts')}</label>
                        <input
                          type="number"
                          min={0}
                          value={completeForm.materialCosts}
                          onChange={(e) =>
                            setCompleteForm({ ...completeForm, materialCosts: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.usedPart')}</label>
                        <input
                          type="text"
                          placeholder="e.g. PVC pipe"
                          value={completeForm.usedPart}
                          onChange={(e) =>
                            setCompleteForm({ ...completeForm, usedPart: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.amountReceived')}</label>
                        <input
                          type="number"
                          min={0}
                          value={completeForm.amountReceived}
                          onChange={(e) =>
                            setCompleteForm({ ...completeForm, amountReceived: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.paymentMethod')}</label>
                        <select
                          value={completeForm.paymentMethod}
                          onChange={(e) =>
                            setCompleteForm({ ...completeForm, paymentMethod: e.target.value })
                          }
                        >
                          <option value="">Select</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                          <option value="Online (Razorpay)">Online (Razorpay)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#94a3b8] block mb-1">{t('employee.jobPhotos')}</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleCompletePhotoUpload}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={handleCapturePhoto}
                      >
                        <Camera size={14} /> {t('employee.camera')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t('employee.gallery')}
                      </button>
                      {completePhotos.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {completePhotos.map((photo, i) => (
                            <div key={i} className="relative">
                              <img
                                src={photo}
                                alt={`Job photo ${i + 1}`}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <button
                                className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                onClick={() => handleRemoveCompletePhoto(i)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleCompleteJob(docket.id)}
                      >
                        {t('employee.markCompleted')}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setCompleteDocketId(null)}
                      >
                        {t('employee.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-[#94a3b8]" />
          {t('employee.myAttendance')}
        </h2>
        {myAttendance.length === 0 ? (
          <p className="text-[#94a3b8] text-sm">{t('employee.noAttendance')}</p>
        ) : (
          <div className="space-y-2">
            {[...myAttendance]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((a) => (
                <div key={a.id} className="flex justify-between items-center text-sm p-2 bg-black/20 rounded">
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  <span className={a.type === 'check-in' ? 'text-emerald-400' : 'text-orange-400'}>{a.type}</span>
                  {a.lat != null && a.lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${a.lat},${a.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary !p-2"
                    >
                      <MapPin size={14} />
                    </a>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
