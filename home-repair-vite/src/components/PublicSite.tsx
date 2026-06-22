import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Star,
  Menu,
  X,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { SERVICE_CATALOG } from '../lib/services';
import { fetchPublishedConfig } from '../lib/siteConfig';
import { useStore } from '../lib/store';
import { useShallow } from 'zustand/react/shallow';
import type { SiteConfig, AppStore } from '../lib/types';

const selectActivePlans = (s: AppStore) => s.subscriptionPlans.filter((p) => p.active);

const WHATSAPP = '917501257731';
const EMAIL = 'sovan@engineer.com';
const PHONE = '+91-7501257731';
const ADDRESS = 'BARABARI, HALDIA, PURBA MEDINIPUR, WEST BENGAL - 721645';

const STEPS = [
  { icon: '📝', title: 'Tell us the problem', desc: 'Pick a service or describe your issue with photos.' },
  { icon: '🛠️', title: 'We assign a verified pro', desc: 'A background-checked technician is matched instantly.' },
  { icon: '✅', title: 'Get it fixed', desc: 'Track live, chat, and pay securely — all in one place.' },
];

const FAQS = [
  { q: 'How fast can you reach me?', a: 'Most bookings are attended the same day. Emergency SOS requests get priority response within the hour in serviced areas.' },
  { q: 'Are your technicians verified?', a: 'Yes. Every technician is background-checked, trained, and rated by real customers after each job.' },
  { q: 'What does the pricing include?', a: 'Prices shown are indicative starting rates. The final quote is confirmed by the technician after diagnosis — no hidden charges.' },
  { q: 'Do you offer a warranty?', a: 'Yes, repairs carry a service warranty. Home Care (AMC) plans add priority support and free seasonal maintenance.' },
  { q: 'How do I pay?', a: 'Cash, UPI, card or online — your choice. You only pay after the job is done.' },
];

export default function PublicSite() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const localPlans = useStore(useShallow(selectActivePlans));
  const localBackground = useStore((s) => s.background);
  const localBgOpacity = useStore((s) => s.bgOpacity);

  useEffect(() => {
    fetchPublishedConfig().then((cfg) => {
      if (cfg.plans?.length) {
        setSiteConfig(cfg);
      } else if (localPlans.length) {
        setSiteConfig({ plans: localPlans, background: localBackground, bgOpacity: localBgOpacity });
      }
      setLoading(false);
    }).catch(() => {
      if (localPlans.length) {
        setSiteConfig({ plans: localPlans, background: localBackground, bgOpacity: localBgOpacity });
      }
      setLoading(false);
    });
  }, [localPlans, localBackground, localBgOpacity]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const plans = siteConfig?.plans?.filter((p) => p.active) ?? [];

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const bg = siteConfig?.background;
  const bgOpacity = siteConfig?.bgOpacity ?? 0.4;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1120' }}>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#94a3b8] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {bg?.src && (
        <>
          {bg.type === 'video' ? (
            <video className="hero-bg" src={bg.src} autoPlay muted loop playsInline />
          ) : bg.type === 'color' ? (
            <div className="hero-bg" style={{ background: bg.src }} />
          ) : (
            <img className="hero-bg" src={bg.src} alt="" />
          )}
          <div className="hero-overlay" style={{ opacity: bgOpacity }} />
        </>
      )}
      {/* Nav */}
      <header className="glass sticky top-0 z-50 !rounded-none border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-lg gradient-text">Trust Home Services</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#94a3b8]">
            <button onClick={() => scrollTo('services')} className="hover:text-white transition-colors">Services</button>
            <button onClick={() => scrollTo('how')} className="hover:text-white transition-colors">How it works</button>
            <button onClick={() => scrollTo('plans')} className="hover:text-white transition-colors">Plans</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-white transition-colors">Contact</button>
            <button onClick={() => navigate('/login?mode=signup')} className="hover:text-indigo-400 transition-colors">Partner Sign-up</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="btn btn-secondary text-sm hidden sm:inline-flex">
              Login
            </button>
            <button onClick={() => navigate('/login')} className="btn btn-primary text-sm">
              Book a Service
            </button>
            <button className="btn btn-ghost md:hidden !p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-sm">
            <button onClick={() => scrollTo('services')} className="text-left text-[#94a3b8]">Services</button>
            <button onClick={() => scrollTo('how')} className="text-left text-[#94a3b8]">How it works</button>
            <button onClick={() => scrollTo('plans')} className="text-left text-[#94a3b8]">Plans</button>
            <button onClick={() => scrollTo('faq')} className="text-left text-[#94a3b8]">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="text-left text-[#94a3b8]">Contact</button>
            <button onClick={() => navigate('/login?mode=signup')} className="text-left text-indigo-400 font-medium">Partner Sign-up</button>
            <button onClick={() => navigate('/login')} className="btn btn-secondary text-sm w-full">Login</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="chip mx-auto mb-5 !bg-indigo-500/10 !border-indigo-500/30 text-indigo-300">
          <Star size={12} /> 4.9/5 from 2,400+ happy homes
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto">
          Home repairs, <span className="gradient-text">done right.</span>
        </h1>
        <p className="text-[#94a3b8] text-lg mt-5 max-w-xl mx-auto">
          Plumbing, electrical, AC, appliances and more — verified pros at your door, with upfront pricing and same-day service.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <button onClick={() => navigate('/login')} className="btn btn-primary !px-6 !py-3 text-base">
            Book a Service <ArrowRight size={18} className="ml-1.5" />
          </button>
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !px-6 !py-3 text-base">
            <MessageSquare size={18} className="mr-1.5" /> Chat on WhatsApp
          </a>
        </div>
        <div className="flex items-center justify-center gap-6 mt-10 flex-wrap text-sm text-[#94a3b8]">
          <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-green-400" /> Verified pros</span>
          <span className="flex items-center gap-1.5"><Clock size={16} className="text-blue-400" /> Same-day service</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-indigo-400" /> No hidden charges</span>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">What can we fix today?</h2>
          <p className="text-[#94a3b8] mt-2">From dripping taps to deep cleans — one trusted partner for your whole home.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SERVICE_CATALOG.map((cat) => (
            <div key={cat.id} className="card card-hover p-5 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold">{cat.name}</h3>
              <p className="text-xs text-[#94a3b8] mt-1 flex-1">{cat.blurb}</p>
              <span className="chip mt-3 !text-[#94a3b8]">from ₹{cat.fromPrice}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/login')} className="btn btn-secondary">
            View all services & pricing <ArrowRight size={16} className="ml-1.5" />
          </button>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Booked in 3 simple steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={i} className="card p-6 text-center relative">
              <div className="text-4xl mb-3">{s.icon}</div>
              <div className="absolute top-4 right-4 text-5xl font-extrabold text-white/5">{i + 1}</div>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-[#94a3b8] mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Home Care Plans (AMC)</h2>
          <p className="text-[#94a3b8] mt-2">Save more with annual maintenance & priority support.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card p-6 relative flex flex-col ${plan.popular ? 'border-[#818cf8]/60' : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gradient-to-r from-[#818cf8] to-[#c084fc] px-3 py-1 rounded-full flex items-center gap-1">
                  <Star size={11} /> MOST POPULAR
                </span>
              )}
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-3xl font-bold mt-2">
                ₹{plan.price}
                <span className="text-sm text-[#94a3b8] font-normal">/{plan.interval === 'monthly' ? 'mo' : plan.interval === 'quarterly' ? 'qtr' : 'yr'}</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.perks.map((p, i) => (
                  <li key={i} className="text-sm text-[#cbd5e1] flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-green-400 mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/login')} className={`btn mt-5 ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                Get started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Loved by homeowners</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { name: 'priya', text: 'Booked an AC service in the morning, fixed by noon. The technician was polite and the price was exactly as quoted.', role: 'Chaitanyapur' },
            { name: 'rahul', text: 'The emergency SOS button saved us during a late-night pipe burst. Someone reached us in under an hour!', role: 'Manjusree' },
            { name: 'anita', text: 'Our Home Shield plan pays for itself. Free seasonal servicing and real priority when something breaks.', role: 'Mahisadal' },
          ].map((t, i) => (
            <div key={i} className="card p-6">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={15} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-[#cbd5e1] leading-relaxed">“{t.text}”</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-[#94a3b8]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-medium text-sm">{f.q}</span>
                <ChevronDown size={18} className={`text-[#94a3b8] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-4 pb-4 text-sm text-[#94a3b8] animate-in">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="max-w-6xl mx-auto px-4 py-16">
        <div className="glass p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold">Ready when you are.</h2>
          <p className="text-[#94a3b8] mt-3 max-w-lg mx-auto">
            Book a service in seconds, or reach us directly — we’re here to help.
          </p>
          <div className="flex items-center justify-center gap-4 mt-7 flex-wrap">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="btn !py-3" style={{ background: '#22c55e', color: 'white' }}>
              <MessageSquare size={18} className="mr-1.5" /> WhatsApp
            </a>
            <a href={`tel:+${WHATSAPP}`} className="btn btn-secondary !py-3">
              <Phone size={18} className="mr-1.5" /> {PHONE}
            </a>
            <a href={`mailto:${EMAIL}`} className="btn btn-secondary !py-3">
              <Mail size={18} className="mr-1.5" /> Email
            </a>
          </div>
          <p className="text-sm text-[#94a3b8] mt-4">{ADDRESS}</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary !py-3 mt-6">
            Book a Service now <ArrowRight size={18} className="ml-1.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-6 h-6" />
            <span className="gradient-text font-semibold">Trust Home Services</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
            <a href={`tel:+${WHATSAPP}`} className="hover:text-white">Call</a>
            <a href={`mailto:${EMAIL}`} className="hover:text-white">Email</a>
            <button onClick={() => navigate('/login')} className="hover:text-white">Login</button>
          </div>
          <p>© {new Date().getFullYear()} Trust Home Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
