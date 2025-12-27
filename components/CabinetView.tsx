
import React, { useState, useRef, useEffect } from 'react';
import { Medication, Frequency, TimeBlockId, AnchorType } from '../types';
import { BigButton, TimeBlockChip, Modal } from './Components';
import { Plus, Camera, ScanLine, Edit3, ForkKnife, Pill, Check, AlertCircle, X, ImagePlus, History, Stethoscope, ShoppingBag, ChevronRight, Sparkles, Bell, BellRing, Settings, Heart } from 'lucide-react';
import { FREQUENCIES, TIME_BLOCKS, MEDICATION_COLORS } from '../constants';
import { scanMedicationLabel } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface CabinetViewProps {
  medications: Medication[];
  onAddMedication: (med: Medication) => void;
  onSelectMedication: (med: Medication) => void;
  onOpenSettings: () => void;
}

const AddMedicationWizard: React.FC<{
  onClose: () => void;
  onSave: (med: Medication) => void;
}> = ({ onClose, onSave }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('Tablet');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState<string>(MEDICATION_COLORS[0]);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [anchorType, setAnchorType] = useState<AnchorType>('time');
  const [selectedBlocks, setSelectedBlocks] = useState<TimeBlockId[]>([]);
  const [currentInventory, setCurrentInventory] = useState<number>(30);
  const [refillsRemaining, setRefillsRemaining] = useState<number | undefined>(undefined);
  const [rxNumber, setRxNumber] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newImages: string[] = [];
    await Promise.all(files.map(file => new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') newImages.push(reader.result);
            resolve();
        };
        reader.readAsDataURL(file as Blob);
    })));
    setCapturedImages(prev => [...prev, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (index: number) => setCapturedImages(prev => prev.filter((_, i) => i !== index));

  const processImages = async () => {
    if (capturedImages.length === 0) return;
    setLoading(true);
    try {
      setPrimaryImage(capturedImages[0]);
      const data = await scanMedicationLabel(capturedImages);
      setName(data.name || '');
      setStrength(data.strength || '');
      setForm(data.form || 'Tablet');
      setInstructions(data.instructions || '');
      setRxNumber(data.rxNumber || '');
      if (typeof data.quantity === 'number') setCurrentInventory(data.quantity);
      if (typeof data.refillsRemaining === 'number') setRefillsRemaining(data.refillsRemaining);
      setStep(2);
    } catch (err) {
      alert("Could not scan labels clearly. Please enter details manually.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = (id: TimeBlockId) => {
    if (selectedBlocks.includes(id)) setSelectedBlocks(prev => prev.filter(b => b !== id));
    else setSelectedBlocks(prev => [...prev, id]);
  };

  const handleSave = () => {
    const newMed: Medication = {
      id: uuidv4(),
      name,
      strength,
      form,
      instructions,
      color,
      image: primaryImage || undefined,
      frequency,
      anchorType,
      schedule: selectedBlocks.map(blockId => ({ 
        id: uuidv4(), 
        timeBlock: blockId, 
        dose: 1,
        notificationEnabled: false
      })),
      currentInventory,
      refillThreshold: 10,
      inventoryUnit: form.toLowerCase() + 's',
      rxNumber,
      refillsRemaining,
      status: 'active',
      dateAdded: Date.now()
    };
    onSave(newMed);
  };

  if (step === 1) {
    return (
      <div className="space-y-6">
        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
        {loading ? (
          <div className="flex flex-col items-center animate-pulse py-12">
            <ScanLine className="w-20 h-20 text-fuchsia-500 mb-6" />
            <p className="text-2xl font-bold text-fuchsia-800">Reading Labels...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {capturedImages.length === 0 ? (
              <div className="text-center p-8 border-4 border-dashed border-fuchsia-200 rounded-3xl bg-fuchsia-50 w-full mb-4">
                <Camera className="w-16 h-16 text-fuchsia-400 mb-4 mx-auto" />
                <p className="text-lg text-indigo-900 mb-2 font-bold">Snap your photos!</p>
                <p className="text-sm text-slate-500 mb-6">Take one of the front, and one of the back instructions.</p>
                <BigButton label="Open Camera" primary onClick={() => fileInputRef.current?.click()} icon={<Camera />} />
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="grid grid-cols-3 gap-2 w-full">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm group">
                      <img src={img} className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-90"><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-fuchsia-300 bg-fuchsia-50 flex flex-col items-center justify-center text-fuchsia-500 hover:bg-fuchsia-100 transition-colors"><Plus size={24} /><span className="text-xs font-bold mt-1">Add</span></button>
                </div>
                <BigButton label={`Analyze ${capturedImages.length} Photos`} primary onClick={processImages} icon={<ScanLine />} />
              </div>
            )}
            <div className="mt-6 w-full pt-6 border-t border-slate-100 text-center">
               <button onClick={() => setStep(2)} className="text-slate-400 font-bold hover:text-fuchsia-600 transition-colors">Skip & Type Manually</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-500 mb-1">Medication Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-xl font-bold p-4 rounded-xl border-2 border-slate-200 focus:border-fuchsia-500 outline-none text-indigo-900" placeholder="e.g. Lisinopril" />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Strength</label>
            <input type="text" value={strength} onChange={e => setStrength(e.target.value)} className="w-full text-lg p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700" placeholder="10mg" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Form</label>
            <input type="text" value={form} onChange={e => setForm(e.target.value)} className="w-full text-lg p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700" placeholder="Tablet" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Rx Number</label>
            <input type="text" value={rxNumber} onChange={e => setRxNumber(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700" placeholder="RX-123456" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Quantity</label>
            <input 
              type="number" 
              min={0}
              value={currentInventory.toString()} 
              onChange={e => setCurrentInventory(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold text-slate-700"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 bg-fuchsia-50 p-4 rounded-2xl border border-fuchsia-100">
           <div className="flex-1">
              <label className="block text-sm font-bold text-slate-500 mb-1">Refills Remaining</label>
              <div className="flex items-center gap-2">
                 <button onClick={() => setRefillsRemaining(0)} className={`px-3 py-1 rounded-lg font-bold text-xs ${refillsRemaining === 0 ? 'bg-fuchsia-600 text-white' : 'bg-white text-fuchsia-600 border border-fuchsia-200'}`}>NO REFILLS</button>
                 <input 
                   type="number" 
                   value={refillsRemaining ?? ''} 
                   onChange={e => setRefillsRemaining(e.target.value === '' ? undefined : parseInt(e.target.value))} 
                   className="w-16 p-1 text-center font-bold border-b-2 border-fuchsia-200 bg-transparent outline-none focus:border-fuchsia-500"
                   placeholder="#"
                 />
              </div>
           </div>
        </div>
        <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Instructions</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-200 font-medium text-slate-700" rows={3} />
        </div>
        <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">Color Tag</label>
            <div className="flex flex-wrap gap-2">
                {MEDICATION_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-full transition-transform shadow-sm border-2 border-white ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                ))}
            </div>
        </div>
        <BigButton label="Next: Schedule" primary onClick={() => setStep(3)} className="mt-6" />
      </div>
    );
  }

  if (step === 3) {
    const foodRequired = anchorType === 'meal';
    const availableBlocks = Object.values(TIME_BLOCKS).filter(b => foodRequired ? b.isMeal : !b.isMeal).sort((a, b) => a.sortOrder - b.sortOrder);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-orange-50 p-4 rounded-xl border border-orange-100">
          <div className="flex items-center gap-3"><ForkKnife className={foodRequired ? "text-orange-500" : "text-slate-400"} /><span className="font-bold text-slate-700">Must take with food?</span></div>
          <button onClick={() => { setAnchorType(prev => prev === 'time' ? 'meal' : 'time'); setSelectedBlocks([]); }} className={`w-14 h-8 rounded-full p-1 transition-colors ${foodRequired ? 'bg-orange-500' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${foodRequired ? 'translate-x-6' : ''}`} /></button>
        </div>
        <div>
          <h3 className="text-lg font-bold text-indigo-900 mb-3">Which times?</h3>
          <div className="flex flex-wrap gap-2">
            {availableBlocks.map(block => (<TimeBlockChip key={block.id} blockId={block.id} selected={selectedBlocks.includes(block.id)} onClick={() => toggleBlock(block.id)} />))}
          </div>
        </div>
        <BigButton label="Save Medication" primary disabled={selectedBlocks.length === 0} onClick={handleSave} icon={<Check />} className="mt-8" />
      </div>
    );
  }
  return null;
};

export const CabinetView: React.FC<CabinetViewProps> = ({ medications, onAddMedication, onSelectMedication, onOpenSettings }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const activeMeds = medications.filter(m => m.status === 'active');
  const historyMeds = medications.filter(m => m.status === 'stopped');

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
        alert("This browser doesn't support notifications. Try saving to home screen!");
        return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
        alert("Yay! Magic Reminders are now active. 🌸");
    }
  };

  return (
    <div className="pb-24 space-y-4">
      {/* Rainbow Header */}
      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 p-6 rounded-3xl text-white shadow-lg shadow-purple-200 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-300" />
                <h1 className="text-3xl font-black tracking-tight">Medicine Cabinet</h1>
             </div>
             <button onClick={onOpenSettings} className="p-3 bg-white/20 backdrop-blur-md rounded-2xl hover:bg-white/30 transition-colors">
                <Settings size={24} />
             </button>
          </div>
          <p className="opacity-90 text-lg font-medium">You have {activeMeds.length} active pills.</p>
        </div>
      </div>

      {/* RE-DESIGNED Magic Reminders Prompt */}
      {notifPermission !== 'granted' && (
          <div className="bg-white border-4 border-fuchsia-400 rounded-[2.5rem] p-6 shadow-xl shadow-fuchsia-100 mb-8 relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 bg-fuchsia-100 w-24 h-24 rounded-full blur-2xl group-hover:bg-pink-200 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg ring-4 ring-fuchsia-50">
                      <BellRing size={40} className="animate-bounce" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-indigo-900 leading-tight mb-2">Magic Reminders</h2>
                  <p className="text-slate-600 text-lg font-medium mb-6 leading-snug">
                    I can alert you when it's time to take your pills so you never forget!
                  </p>
                  
                  <button 
                    onClick={requestNotificationPermission}
                    className="w-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-600 text-white text-xl font-black py-5 rounded-3xl shadow-xl shadow-fuchsia-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Check size={28} strokeWidth={4} />
                    START REMINDERS
                  </button>
                  
                  <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Heart size={12} fill="currentColor" className="text-pink-400" /> One-tap setup for Mom
                  </p>
              </div>
          </div>
      )}

      {/* Medication List */}
      <div className="grid gap-4">
        {activeMeds.length === 0 && (
            <div className="py-12 text-center text-slate-400">
               <Pill size={48} className="mx-auto mb-4 opacity-20" />
               <p className="font-bold text-lg">Your cabinet is empty!</p>
               <p>Tap the button below to add your first pill.</p>
            </div>
        )}

        {activeMeds.map(med => {
          const isLow = med.currentInventory <= med.refillThreshold && med.refillsRemaining !== 0;
          const hasNoRefills = med.refillsRemaining === 0;
          const isFinalDoses = hasNoRefills && med.currentInventory <= 3 && med.currentInventory > 0;

          return (
            <button 
              key={med.id} 
              onClick={() => onSelectMedication(med)}
              className={`bg-white p-5 rounded-3xl shadow-sm border-2 transition-all active:scale-[0.99] group flex items-center justify-between
                ${isFinalDoses ? 'border-orange-300 bg-orange-50 shadow-orange-100' : isLow ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-100 hover:border-violet-200 hover:shadow-md'}
              `}
            >
              <div className="flex items-center gap-4">
                {med.image ? (
                  <img src={med.image} className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shadow-sm" />
                ) : (
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${isFinalDoses ? 'bg-orange-100 text-orange-400' : 'bg-fuchsia-50 text-fuchsia-400'}`}>
                    <Pill size={32} />
                  </div>
                )}
                <div className="text-left">
                  <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2 group-hover:text-fuchsia-600 transition-colors">
                      {med.name}
                      {med.color && <span className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: med.color }}></span>}
                  </h3>
                  <p className="text-slate-500 font-medium">{med.strength} • {med.form}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {isFinalDoses && <span className="bg-orange-200 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1"><Sparkles size={10}/> Finishing Strong</span>}
                    {isLow && !isFinalDoses && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1"><AlertCircle size={12}/> Refill Soon</span>}
                    {med.schedule.map(s => <span key={s.id} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">{TIME_BLOCKS[s.timeBlock].label}</span>)}
                  </div>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-fuchsia-400 transition-colors" />
            </button>
          );
        })}
        
        <button onClick={() => setIsAdding(true)} className="p-8 rounded-[2.5rem] border-4 border-dashed border-violet-200 bg-violet-50 text-violet-500 flex flex-col items-center justify-center hover:bg-violet-100 hover:border-violet-300 transition-all group mt-4">
          <div className="bg-white rounded-full p-4 mb-3 shadow-md group-hover:scale-110 transition-transform"><Plus className="w-10 h-10 text-violet-600" strokeWidth={3} /></div>
          <span className="font-black text-2xl text-violet-700">Add New Pill</span>
        </button>

        {historyMeds.length > 0 && (
            <button onClick={() => setShowHistory(true)} className="mt-8 p-4 rounded-2xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors border border-slate-200">
                <History size={20} /> Past Medications ({historyMeds.length})
            </button>
        )}
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Add Medication">
        <AddMedicationWizard onClose={() => setIsAdding(false)} onSave={(med) => { onAddMedication(med); setIsAdding(false); }} />
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Medication History">
          <div className="space-y-4">
              {historyMeds.length === 0 && <p className="text-center text-slate-400 py-8">No history yet.</p>}
              {historyMeds.map(med => (
                  <button key={med.id} onClick={() => onSelectMedication(med)} className="w-full bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors text-left group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg text-slate-700 group-hover:text-blue-700">{med.name}</h3>
                            <p className="text-slate-500 text-sm">{med.strength} • {med.form}</p>
                        </div>
                        <div className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-lg font-bold uppercase">Archived</div>
                      </div>
                      <div className="flex items-center justify-end text-blue-500 text-xs font-bold pt-2 opacity-0 group-hover:opacity-100 transition-opacity">View Details <ChevronRight size={14} /></div>
                  </button>
              ))}
          </div>
      </Modal>
    </div>
  );
};
