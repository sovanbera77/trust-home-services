import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trust Home Services',
  description: 'Premium Field Service Management Platform',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var API = localStorage.getItem('API_URL') || 'http://localhost:3001/api';
              fetch(API + '/settings/background')
                .then(function(r){ return r.json(); })
                .then(function(json){
                  if(!json.success || !json.data.background || !json.data.background.src) return;
                  var bg = json.data.background;
                  var el = document.createElement('div');
                  el.id = 'hero-bg-web';
                  el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;';
                  if(bg.type === 'video') {
                    el.innerHTML = '<video src="' + bg.src + '" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>';
                  } else if(bg.type === 'color') {
                    el.style.background = bg.src;
                  } else {
                    el.innerHTML = '<img src="' + bg.src + '" alt="" style="width:100%;height:100%;object-fit:cover;" />';
                  }
                  document.body.prepend(el);
                  if(json.data.opacity != null) {
                    var ov = document.createElement('div');
                    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,' + json.data.opacity + ');z-index:-1;pointer-events:none;';
                    document.body.prepend(ov);
                  }
                })
                .catch(function(){});
            })();
          `
        }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
