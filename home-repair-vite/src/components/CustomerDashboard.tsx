import { useState, useRef, useMemo } from 'react';
import { t } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { payWithRazorpay, canPay } from '../lib/paymentService';
import { estimateCost } from '../lib/estimator';
import {
  Plus,
  FileText,
  MessageSquare,
  X,
  CreditCard,
  AlertCircle,
  Send,
  XCircle,
  Siren,
  Wrench,
  Crown,
  Phone,
  MapPin,
} from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import ContactCard from './ui/ContactCard';
import NotificationCenter from './ui/NotificationCenter';
import Catalog from './Catalog';
import { CustomerSubscriptions } from './SubscriptionsTab';
import AIRecommendations from './ui/AIRecommendations';
import DocketTimeline from './ui/DocketTimeline';
import { uuid } from '../lib/utils';
import { openCall } from '../lib/call';
import CustomerTracking from './CustomerTracking';
import AIChatbot from './chat/AIChatbot';
import type { Docket, Complaint, ChatMessage } from '../lib/types';
import type { ServiceCategory, ServiceSub } from '../lib/services';
import { Bot } from 'lucide-react';

type Tab = 'requests' | 'services' | 'plans';

export default function CustomerDashboard() {
  const currentUser = useStore((s) => s.currentUser);
  const allDockets = useStore((s) => s.dockets);
  const allComplaints = useStore((s) => s.complaints);
  const users = useStore((s) => s.users);
  const getEmployee = (username: string) => users.find((u) => u.username === username);
  const addDocket = useStore((s) => s.addDocket);
  const updateDocket = useStore((s) => s.updateDocket);
  const addComplaint = useStore((s) => s.addComplaint);
  const addNotification = useStore((s) => s.addNotification);
  const addActivityLog = useStore((s) => s.addActivityLog);
  const activityLogs = useStore((s) => s.activityLogs);
  const customerDockets = useMemo(() => allDockets.filter((d) => d.customer === currentUser?.username), [allDockets, currentUser]);
  const customerComplaints = useMemo(() => allComplaints.filter((c) => c.customer === currentUser?.username), [allComplaints, currentUser]);

  const [tab, setTab] = useState<Tab>('requests');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNewComplaint, setShowNewComplaint] = useState(false);
  const [chatDocketId, setChatDocketId] = useState<string | null>(null);
  const [trackingDocketId, setTrackingDocketId] = useState<string | null>(null);
  const [showChatbot, setShowChatbot] = useState(false);
  const [timelineDocketId, setTimelineDocketId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [chatText, setChatText] = useState('');
  const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  const [reqForm, setReqForm] = useState({
    type: 'repair' as 'repair' | 'installation',
    title: '',
    desc: '',
    address: '',
    pincode: '',
    preferredDate: '',
  });
  const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const [compForm, setCompForm] = useState({ title: '', desc: '' });

  function handleCaptureLocation() {
    if (!navigator.geolocation) { alert(t('employee.gpsNotAvailable')); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCapturedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { alert(t('employee.gpsEnable')); setLocating(false); }
    );
  }

  function handleSubmitRequest() {
    if (!reqForm.title || !reqForm.desc || !reqForm.address || !reqForm.preferredDate) return;
    const newDocket: Docket = {
      id: `d-${Date.now()}`,
      customer: currentUser?.username || '',
      type: reqForm.type,
      title: reqForm.title,
      desc: reqForm.desc,
      address: reqForm.address,
      pincode: reqForm.pincode,
      lat: capturedLocation?.lat,
      lng: capturedLocation?.lng,
      preferredDate: reqForm.preferredDate,
      status: 'pending',
      assignedTo: '',
      date: new Date().toISOString(),
      completedDate: '',
      expectedDate: '',
      serviceFee: 0,
      materialCosts: 0,
      usedPart: '',
      amountReceived: 0,
      paymentMethod: '',
      rejectionReason: '',
      rating: 0,
      review: '',
      chat: [],
      photoUrls: newPhotos,
      createdAt: new Date().toISOString(),
    };
    addDocket(newDocket);
    addActivityLog({ id: uuid(), docketId: newDocket.id, action: 'created', actor: currentUser?.username || 'customer', detail: `${currentUser?.name} created "${reqForm.title}"`, timestamp: new Date().toISOString() });
    addNotification({ id: uuid(), userId: 'admin', title: 'New Service Request', body: `${currentUser?.name} requested "${reqForm.title}"`, type: 'info', read: false, createdAt: new Date().toISOString() });
    setReqForm({ type: 'repair', title: '', desc: '', address: '', pincode: '', preferredDate: '' });
    setCapturedLocation(null);
    setNewPhotos([]);
    setShowNewRequest(false);
  }

  function handleCatalogPick(category: ServiceCategory, sub: ServiceSub) {
    setReqForm({
      type: category.docketType,
      title: `${category.name} — ${sub.name}`,
      desc: `${sub.name} under ${category.name}. Indicative price ₹${sub.price}.`,
      address: currentUser?.address || '',
      pincode: '',
      preferredDate: new Date().toISOString().slice(0, 10),
    });
    setTab('requests');
    setShowNewRequest(true);
  }

  async function handleSOS() {
    if (!navigator.geolocation || sosStatus === 'sending') return;
    setSosStatus('sending');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newDocket: Docket = {
          id: `sos-${Date.now()}`,
          customer: currentUser?.username || '',
          type: 'repair',
          title: '🚨 EMERGENCY REPAIR REQUEST',
          desc: 'Urgent same-day assistance requested via SOS button.',
          address: currentUser?.address || 'Location shared via GPS',
          pincode: '',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          preferredDate: new Date().toISOString().slice(0, 10),
          status: 'pending',
          assignedTo: '',
          date: new Date().toISOString(),
          completedDate: '',
          expectedDate: '',
          serviceFee: 0,
          materialCosts: 0,
          usedPart: '',
          amountReceived: 0,
          paymentMethod: '',
          rejectionReason: '',
          rating: 0,
          review: '',
          chat: [],
          photoUrls: [],
          createdAt: new Date().toISOString(),
        };
        await addDocket(newDocket);
        addActivityLog({ id: uuid(), docketId: newDocket.id, action: 'updated', actor: currentUser?.username || 'customer', detail: 'SOS emergency request', timestamp: new Date().toISOString() });
        await addNotification({
          id: uuid(),
          userId: 'admin',
          title: '🚨 EMERGENCY SOS',
          body: `${currentUser?.name || 'A customer'} needs urgent help. Location captured.`,
          type: 'error',
          read: false,
          createdAt: new Date().toISOString(),
        });
        setSosStatus('done');
        setTimeout(() => setSosStatus('idle'), 4000);
        setTab('requests');
      },
      () => {
        setSosStatus('idle');
        alert('Could not get your location. Please enable GPS and try again.');
      }
    );
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewPhotos((prev) => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto(index: number) {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmitComplaint() {
    if (!compForm.title || !compForm.desc) return;
    const newComplaint: Complaint = {
      id: `c-${Date.now()}`,
      customer: currentUser?.username || '',
      title: compForm.title,
      desc: compForm.desc,
      status: 'pending',
      date: new Date().toISOString(),
    };
    addComplaint(newComplaint);
    setCompForm({ title: '', desc: '' });
    setShowNewComplaint(false);
  }

  function handleCancelDocket(id: string) {
    updateDocket(id, { status: 'rejected', rejectionReason: 'Cancelled by customer' });
    addActivityLog({ id: uuid(), docketId: id, action: 'rejected', actor: currentUser?.username || 'customer', detail: 'Cancelled by customer', timestamp: new Date().toISOString() });
  }

  function handleChat(docketId: string) {
    if (!chatText.trim()) return;
    const docket = allDockets.find((d) => d.id === docketId);
    if (docket) {
      const msg: ChatMessage = {
        sender: currentUser?.name || currentUser?.username || '',
        text: chatText,
        time: new Date().toISOString(),
      };
      updateDocket(docketId, { chat: [...docket.chat, msg] });
      addActivityLog({ id: uuid(), docketId, action: 'chat', actor: currentUser?.username || 'customer', detail: chatText, timestamp: new Date().toISOString() });
      setChatText('');
    }
  }

  function handlePayOnline(docket: Docket) {
    payWithRazorpay(docket, { name: currentUser?.name, email: currentUser?.email, mobile: currentUser?.mobile }, (result) => {
      updateDocket(docket.id, { amountReceived: result.amount, paymentMethod: result.method });
    });
  }

  function canPayFn(docket: Docket) {
    return canPay(docket);
  }

  return (
    <div className="space-y-6 relative pb-20">
      {/* Floating SOS button */}
      <button
        onClick={handleSOS}
        disabled={sosStatus !== 'idle'}
        className="fixed bottom-6 right-6 z-40 btn shadow-lg"
        style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white' }}
        title="Emergency repair"
      >
        <Siren size={18} className="mr-1.5" />
        {sosStatus === 'sending' ? t('customer.sosSending') : sosStatus === 'done' ? t('customer.sosSent') : t('customer.sos')}
      </button>

      <div className="glass p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t('dashboard.welcome')}, {currentUser?.name || 'Customer'}
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">{t('dashboard.subtitle.customer')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NotificationCenter />
          <button
            className="btn flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white' }}
            onClick={handleSOS}
            disabled={sosStatus !== 'idle'}
          >
            <Siren size={16} />
            {t('customer.sos')}
          </button>
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowNewRequest(true)}
          >
            <Plus size={18} />
            {t('customer.newRequest')}
          </button>
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations onBookService={handleCatalogPick} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'requests', label: t('customer.myRequests'), icon: FileText },
          { id: 'services', label: t('customer.services'), icon: Wrench },
          { id: 'plans', label: t('customer.carePlans'), icon: Crown },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/5 text-[#94a3b8] border border-white/10 hover:bg-white/10'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'services' && (
        <div className="glass p-6">
          <Catalog onPick={handleCatalogPick} />
        </div>
      )}

      {tab === 'plans' && (
        <div className="glass p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{t('customer.homePlan')}</h2>
            <p className="text-sm text-[#94a3b8] mt-0.5">{t('customer.homePlanDesc')}</p>
          </div>
          <CustomerSubscriptions />
        </div>
      )}

      {tab === 'requests' && showNewRequest && (
        <div className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('customer.createRequest')}</h2>
            <button onClick={() => setShowNewRequest(false)} className="text-[#94a3b8] hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.type')}</label>
              <select
                value={reqForm.type}
                onChange={(e) => setReqForm({ ...reqForm, type: e.target.value as 'repair' | 'installation' })}
              >
                <option value="repair">{t('customer.repair')}</option>
                <option value="installation">{t('customer.installation')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.preferredDate')}</label>
              <input
                type="date"
                value={reqForm.preferredDate}
                onChange={(e) => setReqForm({ ...reqForm, preferredDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.title')}</label>
              <input
                type="text"
                placeholder="e.g. Leaking Pipe"
                value={reqForm.title}
                onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.description')}</label>
              <textarea
                rows={3}
                placeholder="Describe the issue in detail"
                value={reqForm.desc}
                onChange={(e) => setReqForm({ ...reqForm, desc: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.address')}</label>
              <input
                type="text"
                placeholder="Full address"
                value={reqForm.address}
                onChange={(e) => setReqForm({ ...reqForm, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.pincode')}</label>
              <input
                type="text"
                placeholder="e.g. 110001"
                value={reqForm.pincode}
                onChange={(e) => setReqForm({ ...reqForm, pincode: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.location')}</label>
              <button
                type="button"
                className={`btn ${capturedLocation ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'btn-secondary'} text-xs flex items-center gap-1.5`}
                onClick={handleCaptureLocation}
                disabled={locating}
              >
                {locating ? 'Locating...' : capturedLocation ? `✔ ${capturedLocation.lat.toFixed(4)}, ${capturedLocation.lng.toFixed(4)}` : 'Send My Location'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-[#94a3b8] block mb-1">{t('customer.photos')}</label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('customer.addPhoto')}
            </button>
            {newPhotos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {newPhotos.map((photo, i) => (
                  <div key={i} className="relative">
                    <img
                      src={photo}
                      alt={`Photo ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      onClick={() => handleRemovePhoto(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {reqForm.title || reqForm.desc ? (() => {
            const est = estimateCost({ type: reqForm.type, title: reqForm.title, desc: reqForm.desc });
            const confColors = { low: 'text-yellow-400', medium: 'text-indigo-400', high: 'text-green-400' };
            return (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#94a3b8]">{t('customer.estimatedCost')}</span>
                  <span className={`text-xs font-semibold ${confColors[est.confidence]}`}>{est.confidence} confidence</span>
                </div>
                <div className="text-lg font-bold text-white">₹{est.min} – ₹{est.max}</div>
                <div className="text-xs text-[#94a3b8] mt-1">{est.explanation}</div>
              </div>
            );
          })() : null}
          <button className="btn btn-primary" onClick={handleSubmitRequest}>
            {t('customer.submitRequest')}
          </button>
        </div>
      )}

      {tab === 'requests' && (
      <>
      <div className="glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#94a3b8]" />
          {t('customer.myRequests')}
        </h2>
        {customerDockets.length === 0 ? (
          <p className="text-[#94a3b8] text-sm">{t('customer.noRequests')}</p>
        ) : (
          <div className="space-y-3">
            {customerDockets.map((docket) => (
              <div key={docket.id} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{docket.title}</h3>
                      <StatusBadge status={docket.status} />
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-1 capitalize">{docket.type}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-[#94a3b8]">
                  <span>Date: {new Date(docket.date).toLocaleDateString()}</span>
                  <span>Address: {docket.address}</span>
                </div>
                {docket.assignedTo && (
                  <ContactCard user={getEmployee(docket.assignedTo)} label="Your Assigned Technician" />
                )}
                {docket.status === 'completed' && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1 text-sm">
                    <p className="text-green-400 font-medium">{t('customer.completionDetails')}</p>
                    <p className="text-[#94a3b8]">
                      Service Fee: ₹{docket.serviceFee} | Material: ₹{docket.materialCosts}
                    </p>
                    {docket.usedPart && <p className="text-[#94a3b8]">Part used: {docket.usedPart}</p>}
                    {(docket.amountReceived ?? 0) > 0 && (
                      <p className="text-[#94a3b8]">
                        Paid: ₹{docket.amountReceived} via {docket.paymentMethod}
                      </p>
                    )}
                  </div>
                )}
                {docket.status === 'completed' && !docket.rating && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium">{t('customer.rateService')}</h4>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="text-xl text-yellow-400"
                          onClick={() => {
                            updateDocket(docket.id, { rating: star });
                          }}
                        >
                          {star <= (docket.rating || 0) ? '★' : '☆'}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder={t('customer.writeReview')}
                      className="text-sm"
                      value={docket.review || ''}
                      onChange={(e) => {
                        updateDocket(docket.id, { review: e.target.value });
                      }}
                    />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {(docket.status === 'assigned' || docket.status === 'completed') && (
                    <>
                      <button
                        className="btn btn-secondary flex items-center gap-1.5 text-xs"
                        onClick={() =>
                          setChatDocketId(chatDocketId === docket.id ? null : docket.id)
                        }
                      >
                        <MessageSquare size={14} />
                        {t('customer.chat')}
                      </button>
                      {docket.assignedTo && (
                        <>
                          <button
                            className="btn btn-secondary flex items-center gap-1.5 text-xs"
                            onClick={() => {
                              const emp = getEmployee(docket.assignedTo!);
                              openCall(docket.assignedTo!, emp?.name || docket.assignedTo!, 'audio');
                            }}
                          >
                            <Phone size={14} />
                            {t('call.call')}
                          </button>
                          {docket.status === 'assigned' && (
                            <button
                              className="btn btn-secondary flex items-center gap-1.5 text-xs text-[#00a884] border-[#00a884]/30 bg-[#00a884]/10"
                              onClick={() =>
                                setTrackingDocketId(trackingDocketId === docket.id ? null : docket.id)
                              }
                            >
                              <MapPin size={14} />
                              {trackingDocketId === docket.id ? 'Hide Location' : 'Live Location'}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {docket.status === 'pending' && (
                    <button
                      className="btn btn-secondary flex items-center gap-1.5 text-xs text-red-400"
                      onClick={() => handleCancelDocket(docket.id)}
                    >
                      <XCircle size={14} />
                      {t('customer.cancel')}
                    </button>
                  )}
                  {docket.status === 'completed' && (
                    <a
                      href={`https://wa.me/919876543210?text=${encodeURIComponent(
                        `Hi! I have a query regarding my service request "${docket.title}" (ID: ${docket.id}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary flex items-center gap-1.5 text-xs"
                    >
                      {t('customer.shareWhatsApp')}
                    </a>
                  )}
                  {canPayFn(docket) && (
                    <button
                      className="btn flex items-center gap-1.5 text-xs"
                      style={{ background: 'var(--primary)', color: 'white' }}
                      onClick={() => handlePayOnline(docket)}
                    >
                      <CreditCard size={14} />
                      {t('customer.payOnline')}
                    </button>
                  )}
                </div>

                {trackingDocketId === docket.id && docket.assignedTo && (
                  <div className="mt-4 h-[300px] rounded-xl overflow-hidden border border-[#00a884]/30 shadow-[0_0_15px_rgba(0,168,132,0.1)]">
                    <CustomerTracking 
                      technicianUsername={docket.assignedTo} 
                      technicianName={getEmployee(docket.assignedTo)?.name || docket.assignedTo} 
                    />
                  </div>
                )}

                {chatDocketId === docket.id && (
                  <div className="bg-black/20 rounded-lg p-3 space-y-2 mt-4">
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
                        className="input flex-1"
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleChat(docket.id);
                          }
                        }}
                      />
                      <button onClick={() => handleChat(docket.id)} className="btn btn-primary rounded-l-none whitespace-nowrap">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                )}
                {docket.status === 'assigned' && docket.assignedTo && (
                  <div className="mt-4 h-64 border border-white/10 rounded-lg overflow-hidden">
                    <CustomerTracking technicianUsername={docket.assignedTo} technicianName={getEmployee(docket.assignedTo)?.name || docket.assignedTo} />
                  </div>
                )}
                <button onClick={() => setTimelineDocketId(timelineDocketId === docket.id ? null : docket.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
                  {timelineDocketId === docket.id ? 'Hide Timeline' : 'Show Timeline'}
                </button>
                {timelineDocketId === docket.id && (
                  <div className="pt-3 border-t border-white/10">
                    <DocketTimeline logs={activityLogs.filter(l => l.docketId === docket.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle size={20} className="text-[#94a3b8]" />
            {t('complaint.title')}
          </h2>
          <button
            className="btn btn-secondary flex items-center gap-2 text-sm"
            onClick={() => setShowNewComplaint(true)}
          >
            <Plus size={16} />
            {t('customer.fileComplaint')}
          </button>
        </div>
        {showNewComplaint && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Complaint title"
              value={compForm.title}
              onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
            />
            <textarea
              rows={3}
              placeholder="Describe your complaint"
              value={compForm.desc}
              onChange={(e) => setCompForm({ ...compForm, desc: e.target.value })}
            />
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={handleSubmitComplaint}>
                {t('common.submit')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowNewComplaint(false)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        {customerComplaints.length === 0 ? (
          <p className="text-[#94a3b8] text-sm">{t('customer.noComplaints')}</p>
        ) : (
          <div className="space-y-2">
            {customerComplaints.map((comp) => (
              <div
                key={comp.id}
                className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-start justify-between"
              >
                <div>
                  <h4 className="font-medium text-sm">{comp.title}</h4>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{comp.desc}</p>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    {new Date(comp.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    comp.status === 'resolved'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  }`}
                >
                  {comp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* AI Chatbot FAB */}
      <button 
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-indigo-500 transition-colors z-[90]"
      >
        <Bot size={28} />
      </button>

      {/* AI Chatbot Window */}
      {showChatbot && <AIChatbot onClose={() => setShowChatbot(false)} />}
    </div>
  );
}
