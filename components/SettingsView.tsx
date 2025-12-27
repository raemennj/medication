
import React, { useRef } from 'react';
import { AppSettings } from '../types';
import { Toggle, BigButton } from './Components';
import { Bell, BellRing, Clock, Info, ArrowLeft, Sparkles, ShieldCheck, Heart, Download, Smartphone } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onBack }) => {
  const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateIcons = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sizes = [192, 512];
    
    sizes.forEach(size => {
      canvas.width = size;
      canvas.height = size;

      // 1. Background Gradient
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#d946ef'); // Fuchsia 500
      grad.addColorStop(1, '#4f46e5'); // Indigo 600
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 2. White Pill Shape
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-Math.PI / 4);
      
      const pillW = size * 0.5;
      const pillH = size * 0.22;
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(-pillW/2, -pillH/2, pillW, pillH, pillH/2);
      ctx.fill();
      
      // 3. Pink half of pill
      ctx.clip();
      ctx.fillStyle = '#f472b6'; // Pink 400
      ctx.fillRect(0, -pillH, pillW, pillH * 2);
      ctx.restore();

      // 4. Heart Detail
      ctx.fillStyle = 'white';
      ctx.font = `bold ${size * 0.15}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('❤', size * 0.75, size * 0.3);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `icon-${size}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-3 -ml-3 rounded-full hover:bg-slate-100 active:scale-90 transition-all">
            <ArrowLeft className="w-10 h-10 text-slate-800" strokeWidth={2.5} />
          </button>
          <h1 className="text-3xl font-black text-indigo-900 tracking-tight">Preferences</h1>
      </div>

      {/* Reminder Status Header */}
      <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-5 shadow-sm
        ${notifPermission === 'granted' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}
      `}>
          <div className={`p-4 rounded-2xl shadow-sm ${notifPermission === 'granted' ? 'bg-white text-green-500' : 'bg-white text-red-500'}`}>
              {notifPermission === 'granted' ? <ShieldCheck size={32} /> : <BellRing size={32} />}
          </div>
          <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Alert Status</p>
              <h3 className={`text-xl font-black ${notifPermission === 'granted' ? 'text-green-800' : 'text-red-800'}`}>
                  {notifPermission === 'granted' ? 'Alerts are Active' : 'Alerts are Off'}
              </h3>
          </div>
      </div>

      {/* Daily Digest Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-purple-50 space-y-8">
        <div className="flex items-start gap-4">
           <div className="bg-fuchsia-100 p-4 rounded-2xl text-fuchsia-600 shadow-sm">
              <Bell size={32} />
           </div>
           <div className="flex-1">
              <h3 className="font-black text-indigo-900 text-2xl mb-1">Magic Reminders</h3>
              <p className="text-slate-500 text-lg leading-snug">Get one list of all your pills at a time you choose.</p>
           </div>
        </div>

        <div className="py-4 border-t border-b border-slate-50">
            <Toggle 
              label="Turn Reminders On"
              enabled={settings.dailySummaryEnabled}
              onChange={(val) => onUpdate({ ...settings, dailySummaryEnabled: val })}
            />
        </div>

        {settings.dailySummaryEnabled && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
            <div className="flex items-center gap-2 text-fuchsia-600 font-black uppercase text-sm tracking-widest ml-1">
               <Clock size={18} /> Choose Your Time
            </div>
            <input 
              type="time" 
              value={settings.dailySummaryTime}
              onChange={(e) => onUpdate({ ...settings, dailySummaryTime: e.target.value })}
              className="w-full p-6 rounded-3xl border-4 border-slate-100 text-5xl font-black text-indigo-900 focus:border-fuchsia-400 outline-none bg-slate-50 shadow-inner"
            />
            <p className="text-slate-400 text-center font-bold italic">This is when your phone will ding!</p>
          </div>
        )}
      </div>

      {/* PWA Asset Studio */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-purple-50">
          <div className="flex items-center gap-4 mb-6">
              <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600">
                  <Smartphone size={32} />
              </div>
              <div>
                  <h3 className="font-black text-indigo-900 text-2xl">PWA Studio</h3>
                  <p className="text-slate-500 font-medium">Create Mom's app button</p>
              </div>
          </div>

          <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-indigo-600 shadow-xl flex items-center justify-center text-white relative overflow-hidden mb-4">
                  <div className="rotate-[-45deg] bg-white w-20 h-8 rounded-full flex overflow-hidden">
                      <div className="w-1/2 bg-pink-400"></div>
                  </div>
                  <Heart className="absolute top-2 right-2 text-white/40" size={24} fill="currentColor" />
              </div>
              <p className="text-center text-slate-500 text-sm px-4">This beautiful icon will be the button on Mom's home screen.</p>
          </div>

          <canvas ref={canvasRef} className="hidden" />
          
          <BigButton 
            label="Generate & Download Icons" 
            subLabel="Creates 192px and 512px PNGs"
            icon={<Download />} 
            primary
            onClick={generateIcons} 
          />
          
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  TIP: After downloading, put <span className="text-indigo-600">icon-192.png</span> and <span className="text-indigo-600">icon-512.png</span> in your root folder next to index.html.
              </p>
          </div>
      </div>

      {/* Helpful Tips */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-[2rem] border border-blue-100 text-blue-900 flex gap-4">
         <Info className="shrink-0 text-blue-500 mt-1" size={24} />
         <div className="text-lg">
           <p className="font-black mb-2 flex items-center gap-2">How it works <Heart size={16} fill="currentColor" className="text-pink-400" /></p>
           <p className="text-slate-600 leading-snug">These alerts pop up on your lock screen. Just tap them to see what to take next!</p>
         </div>
      </div>

      <div className="text-center pt-8 opacity-40">
         <Sparkles className="inline-block mb-2 text-fuchsia-400" />
         <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Handcrafted with Love for Mom</p>
      </div>
    </div>
  );
};
