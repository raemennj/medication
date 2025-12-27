
import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { BigButton, Toggle } from './Components';
import { ShoppingBag, Phone, Copy, CheckCircle2, Clock, Calendar as CalendarIcon, Package, ArrowLeft, RefreshCcw, Bell } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

interface RefillModalProps {
  medication: Medication;
  onClose: () => void;
  onRefill: (id: string, amount: number, refillsRemaining?: number) => void;
  onOrder: (id: string, expectedDate: number, alertEnabled?: boolean, alertTime?: string) => void;
}

type Mode = 'menu' | 'pickup' | 'order';

export const RefillModal: React.FC<RefillModalProps> = ({ medication, onClose, onRefill, onOrder }) => {
  const [mode, setMode] = useState<Mode>('menu');
  
  // Pickup State
  const [amount, setAmount] = useState<number>(30);
  const [refillsLeft, setRefillsLeft] = useState<number | undefined>(
    typeof medication.refillsRemaining === 'number' ? medication.refillsRemaining : undefined
  );

  // Order State
  const [expectedDate, setExpectedDate] = useState<Date>(
    medication.refillExpectedDate ? new Date(medication.refillExpectedDate) : addDays(new Date(), 1)
  );
  const [alertEnabled, setAlertEnabled] = useState<boolean>(medication.refillAlertEnabled ?? true);
  const [alertTime, setAlertTime] = useState<string>(medication.refillAlertTime ?? "10:00");

  const handleConfirmPickup = () => {
    onRefill(medication.id, amount, refillsLeft);
    onClose();
  };

  const handleConfirmOrder = () => {
    // Pass the actual date and alert settings back
    onOrder(medication.id, expectedDate.getTime(), alertEnabled, alertTime);
    onClose();
  };

  const renderPharmacyCard = () => (
    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm">
                    <ShoppingBag size={24} />
                </div>
                <div>
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Pharmacy</div>
                    <div className="font-bold text-blue-900 text-lg leading-tight">{medication.pharmacyName || "No Pharmacy Set"}</div>
                </div>
            </div>
            {medication.pharmacyPhone && (
                <a href={`tel:${medication.pharmacyPhone}`} className="bg-green-500 text-white p-3 rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-transform">
                    <Phone size={24} />
                </a>
            )}
        </div>
        
        <div className="bg-white/80 p-3 rounded-xl flex items-center justify-between border border-blue-100">
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Rx Number</div>
                <div className="font-mono text-slate-700 font-bold tracking-wider text-lg">{medication.rxNumber || "N/A"}</div>
            </div>
            {medication.rxNumber && (
                <button 
                    onClick={() => {navigator.clipboard.writeText(medication.rxNumber || ''); alert("Rx Number Copied!")}}
                    className="text-blue-400 font-bold text-xs flex items-center gap-1 hover:text-blue-600"
                >
                    <Copy size={12} /> COPY
                </button>
            )}
        </div>
    </div>
  );

  // --- MENU MODE ---
  if (mode === 'menu') {
      return (
          <div className="space-y-4">
              {renderPharmacyCard()}
              
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Actions</div>
              
              <BigButton 
                  label="Refill Now" 
                  subLabel="Add to inventory"
                  icon={<Package />}
                  primary
                  onClick={() => setMode('pickup')}
              />

              <BigButton 
                  label="Order Pickup" 
                  subLabel="Set pickup reminder"
                  icon={<Clock />}
                  onClick={() => setMode('order')}
              />
          </div>
      );
  }

  // --- ORDER MODE ---
  if (mode === 'order') {
      return (
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
                 <button onClick={() => setMode('menu')} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                     <ArrowLeft className="text-slate-500" />
                 </button>
                 <h3 className="font-bold text-lg text-slate-800">When will it be ready?</h3>
             </div>

             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => {
                        const today = new Date();
                        setExpectedDate(today);
                    }}
                    className={`p-4 rounded-xl border-2 font-bold text-left transition-all ${format(expectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600'}`}
                 >
                     <div className="text-xs uppercase opacity-70 mb-1">Estimated</div>
                     Today
                 </button>
                 <button 
                    onClick={() => {
                        const tomorrow = addDays(new Date(), 1);
                        setExpectedDate(tomorrow);
                    }}
                    className={`p-4 rounded-xl border-2 font-bold text-left transition-all ${format(expectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600'}`}
                 >
                     <div className="text-xs uppercase opacity-70 mb-1">Estimated</div>
                     Tomorrow
                 </button>
             </div>

             <div>
                 <label className="block text-sm font-bold text-slate-500 mb-2">Or select specific date</label>
                 <input 
                    type="date"
                    value={format(expectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                        if (e.target.value) {
                            // Using parseISO to ensure local time is respected correctly by most browsers
                            setExpectedDate(parseISO(e.target.value));
                        }
                    }}
                    className="w-full p-4 rounded-xl border-2 border-slate-200 text-lg font-bold text-slate-700 bg-white"
                 />
             </div>

             {/* NOTIFICATION SETTINGS FOR ORDER */}
             <div className="bg-fuchsia-50 p-6 rounded-[2rem] border-2 border-fuchsia-100 space-y-4">
                 <div className="flex items-center gap-2 text-fuchsia-600 font-black uppercase text-xs tracking-widest mb-1">
                    <Bell size={18} /> Pickup Reminder
                 </div>
                 
                 <Toggle 
                   label="Alert me on pickup day"
                   enabled={alertEnabled}
                   onChange={setAlertEnabled}
                 />

                 {alertEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-black text-fuchsia-400 uppercase mb-2 ml-1">Choose Alert Time</label>
                        <input 
                            type="time"
                            value={alertTime}
                            onChange={(e) => setAlertTime(e.target.value)}
                            className="w-full p-4 rounded-2xl border-2 border-fuchsia-200 text-3xl font-black text-fuchsia-900 bg-white outline-none focus:border-fuchsia-500"
                        />
                    </div>
                 )}
             </div>

             <BigButton 
                 label="Set Reminder"
                 subLabel={`Alert on ${format(expectedDate, 'MMM do')}${alertEnabled ? ` at ${alertTime}` : ''}`}
                 icon={<CalendarIcon />}
                 primary
                 onClick={handleConfirmOrder}
                 className="mt-4"
             />
          </div>
      );
  }

  // --- PICKUP MODE ---
  if (mode === 'pickup') {
      return (
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
                 <button onClick={() => setMode('menu')} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
                     <ArrowLeft className="text-slate-500" />
                 </button>
                 <h3 className="font-bold text-lg text-slate-800">Restock Inventory</h3>
             </div>

             {renderPharmacyCard()}

             <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Quantity Received</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                    {[30, 60, 90].map(q => (
                        <button 
                        key={q}
                        onClick={() => setAmount(q)}
                        className={`py-3 rounded-xl font-bold border-2 transition-all active:scale-95 ${amount === q ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                        {q}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input 
                        type="number" 
                        value={amount.toString()} 
                        onChange={e => setAmount(parseInt(e.target.value) || 0)}
                        className="w-full p-4 rounded-xl border-2 border-slate-200 font-bold text-xl text-slate-800 outline-none focus:border-blue-500 transition-colors bg-white"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none uppercase text-xs tracking-wide">
                        {medication.inventoryUnit}
                    </div>
                </div>
            </div>

            <div className="bg-fuchsia-50 p-5 rounded-2xl border border-fuchsia-100">
                 <div className="flex items-center gap-2 mb-3 text-fuchsia-700 font-bold text-sm">
                    <RefreshCcw size={16} /> Update Refills Left
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setRefillsLeft(0)}
                      className={`flex-1 py-3 rounded-xl font-black text-xs tracking-widest transition-all ${refillsLeft === 0 ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-white text-fuchsia-400 border border-fuchsia-200'}`}
                    >
                        NO REFILLS LEFT
                    </button>
                    <div className="flex items-center bg-white border border-fuchsia-200 rounded-xl px-4 py-2 gap-4">
                        <button onClick={() => setRefillsLeft(p => Math.max(0, (p || 0) - 1))} className="text-fuchsia-500 font-bold text-2xl active:scale-90">-</button>
                        <span className="font-black text-xl text-fuchsia-900 w-8 text-center">{refillsLeft ?? '?'}</span>
                        <button onClick={() => setRefillsLeft(p => (p || 0) + 1)} className="text-fuchsia-500 font-bold text-2xl active:scale-90">+</button>
                    </div>
                 </div>
                 <p className="text-[10px] text-fuchsia-400 mt-2 text-center font-bold">This counts how many times the doctor will refill this Rx.</p>
            </div>

             <BigButton 
                 label="Confirm Pickup"
                 subLabel={`Add ${amount} to stock`}
                 icon={<CheckCircle2 />}
                 primary
                 onClick={handleConfirmPickup}
                 className="mt-4"
             />
          </div>
      );
  }

  return null;
};
