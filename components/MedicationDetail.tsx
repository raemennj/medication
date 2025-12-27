
import React, { useState, useMemo } from 'react';
import { Medication, MedLog, ScheduleBlock, TimeBlockId } from '../types';
import { BigButton, TimeBlockChip, Modal, Toggle } from './Components';
import { RefillModal } from './RefillModal';
import { ArrowLeft, Phone, Share, Trash2, Pill, ForkKnife, Edit, CheckCircle2, TrendingUp, Save, Plus, AlertCircle, Copy, History, ShoppingBag, X, Calendar as CalendarIcon, Stethoscope, Archive, RotateCcw, Bell, Clock, RefreshCcw, Sparkles } from 'lucide-react';
import { TIME_BLOCKS, MEDICATION_COLORS } from '../constants';
import { differenceInDays, subDays, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface MedicationDetailProps {
  medication: Medication;
  logs: MedLog[];
  onBack: () => void;
  onUpdate: (med: Medication) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onRefill: (id: string, amount: number, refillsRemaining?: number) => void;
  onOrder: (id: string, expectedDate: number) => void;
}

const EditScheduleBlockModal: React.FC<{
  block: ScheduleBlock;
  existingTimeBlocks: TimeBlockId[];
  onClose: () => void;
  onSave: (updatedBlock: ScheduleBlock) => void;
  onDelete: (blockId: string) => void;
  formType: string;
}> = ({ block, existingTimeBlocks, onClose, onSave, onDelete, formType }) => {
  const [selectedTime, setSelectedTime] = useState<TimeBlockId>(block.timeBlock);
  const [dose, setDose] = useState<string>(block.dose.toString());
  const [notifEnabled, setNotifEnabled] = useState(block.notificationEnabled || false);
  const [notifTime, setNotifTime] = useState(block.notificationTime || "08:00");

  const availableBlocks = Object.values(TIME_BLOCKS).sort((a,b) => a.sortOrder - b.sortOrder);

  const handleSave = () => {
    const numDose = parseFloat(dose);
    if (isNaN(numDose) || numDose <= 0) {
        alert("Please enter a valid dose");
        return;
    }
    if (selectedTime !== block.timeBlock && existingTimeBlocks.includes(selectedTime)) {
        alert(`You already have a schedule for ${TIME_BLOCKS[selectedTime].label}.`);
        return;
    }
    onSave({ 
      ...block, 
      timeBlock: selectedTime, 
      dose: numDose,
      notificationEnabled: notifEnabled,
      notificationTime: notifEnabled ? notifTime : undefined
    });
  };

  return (
      <div className="space-y-6">
          <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Time of Day</label>
              <div className="flex flex-wrap gap-2">
                  {availableBlocks.map(def => {
                      const disabled = existingTimeBlocks.includes(def.id) && def.id !== block.timeBlock;
                      return (
                        <button
                            key={def.id}
                            disabled={disabled}
                            onClick={() => setSelectedTime(def.id)}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all font-medium text-sm
                                ${selectedTime === def.id 
                                    ? `${def.color} border-current ring-2 ring-offset-1 ring-current` 
                                    : disabled 
                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <span>{def.label}</span>
                        </button>
                      )
                  })}
              </div>
          </div>

          <div>
              <label className="block text-sm font-bold text-slate-500 mb-2">Dosage ({formType}s)</label>
              <div className="flex items-center gap-3">
                  <button onClick={() => setDose(d => Math.max(0.25, parseFloat(d||'0') - 0.25).toString())} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 active:scale-95">-</button>
                  <input 
                    type="number" 
                    value={dose} 
                    onChange={e => setDose(e.target.value)}
                    className="flex-1 p-3 text-center font-bold text-2xl border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500"
                  />
                  <button onClick={() => setDose(d => (parseFloat(d||'0') + 0.25).toString())} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 active:scale-95">+</button>
              </div>
          </div>

          <div className="bg-fuchsia-50 p-4 rounded-2xl border border-fuchsia-100 space-y-4">
              <div className="flex items-center gap-2 text-fuchsia-600 mb-1">
                 <Bell size={18} />
                 <span className="font-black text-sm uppercase">Notifications</span>
              </div>
              <Toggle 
                label="Set Alert for this dose"
                enabled={notifEnabled}
                onChange={setNotifEnabled}
              />
              {notifEnabled && (
                <div className="flex items-center gap-3 animate-in fade-in duration-300">
                    <Clock size={20} className="text-fuchsia-400" />
                    <input 
                      type="time"
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      className="flex-1 p-3 rounded-xl border-2 border-fuchsia-200 text-2xl font-black text-fuchsia-900 bg-white"
                    />
                </div>
              )}
          </div>

          <BigButton label="Update Schedule" primary onClick={handleSave} icon={<CheckCircle2 />} />
          <BigButton
            label="Delete Dose"
            danger
            icon={<Trash2 />}
            onClick={() => {
              if (confirm("Delete this scheduled dose?")) {
                onDelete(block.id);
                onClose();
              }
            }}
          />
      </div>
  )
};

const EditMedicationModal: React.FC<{
  medication: Medication;
  onClose: () => void;
  onSave: (med: Medication) => void;
}> = ({ medication, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: medication.name,
    strength: medication.strength || '',
    form: medication.form || '',
    instructions: medication.instructions || '',
    pharmacyName: medication.pharmacyName || '',
    pharmacyPhone: medication.pharmacyPhone || '',
    rxNumber: medication.rxNumber || '',
    doctorName: medication.doctorName || '',
    doctorPhone: medication.doctorPhone || '',
    notes: medication.notes || '',
    color: medication.color || MEDICATION_COLORS[0],
    refillsRemaining: medication.refillsRemaining
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Medication Name</label>
        <input name="name" value={formData.name} onChange={handleChange} className="w-full text-lg p-3 rounded-xl border-2 border-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-500 mb-1">Strength</label>
          <input name="strength" value={formData.strength} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-500 mb-1">Form</label>
          <input name="form" value={formData.form} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" />
        </div>
      </div>
      <div className="bg-fuchsia-50 p-4 rounded-2xl border border-fuchsia-100">
          <label className="block text-sm font-bold text-fuchsia-700 mb-1">Refills Remaining</label>
          <div className="flex items-center gap-3">
             <button onClick={() => setFormData(p => ({...p, refillsRemaining: 0}))} className={`px-4 py-2 rounded-xl font-bold text-xs ${formData.refillsRemaining === 0 ? 'bg-fuchsia-600 text-white' : 'bg-white text-fuchsia-600 border border-fuchsia-200'}`}>NO REFILLS</button>
             <input 
                type="number" 
                value={formData.refillsRemaining ?? ''} 
                onChange={e => setFormData(p => ({...p, refillsRemaining: e.target.value === '' ? undefined : parseInt(e.target.value)}))} 
                className="flex-1 p-2 text-center font-bold text-xl border-b-2 border-fuchsia-300 bg-transparent outline-none focus:border-fuchsia-600"
                placeholder="#"
             />
          </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Instructions</label>
        <textarea name="instructions" value={formData.instructions} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" rows={2} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1">Notes</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" rows={3} />
      </div>
      <div>
            <label className="block text-sm font-bold text-slate-500 mb-2">Color Tag</label>
            <div className="flex flex-wrap gap-2">
                {MEDICATION_COLORS.map(c => (
                    <button key={c} onClick={() => setFormData(prev => ({...prev, color: c}))} className={`w-10 h-10 rounded-full transition-transform ${formData.color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                ))}
            </div>
      </div>
      <div className="border-t border-slate-100 pt-4 mt-4">
        <h3 className="font-bold text-slate-700 mb-3">Pharmacy & Doctor</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Pharmacy</label>
            <input name="pharmacyName" value={formData.pharmacyName} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" placeholder="Name" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Phone</label>
            <input name="pharmacyPhone" value={formData.pharmacyPhone} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" placeholder="Number" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Doctor Name</label>
            <input name="doctorName" value={formData.doctorName} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" placeholder="Dr. Smith" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Dr Phone</label>
            <input name="doctorPhone" value={formData.doctorPhone} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" placeholder="Number" />
          </div>
        </div>
        <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">Rx Number</label>
            <input name="rxNumber" value={formData.rxNumber} onChange={handleChange} className="w-full p-3 rounded-xl border-2 border-slate-200" />
        </div>
      </div>
      <BigButton label="Save Changes" primary icon={<Save />} onClick={() => { onSave({ ...medication, ...formData }); onClose(); }} className="mt-6" />
    </div>
  );
};

export const MedicationDetail: React.FC<MedicationDetailProps> = ({ medication, logs, onBack, onUpdate, onDelete, onRefill, onOrder, onRestore, onPermanentDelete }) => {
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  const [isAddingTime, setIsAddingTime] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  const isStopped = medication.status === 'stopped';

  const handleInventoryChange = (delta: number) => {
    const newCount = Math.max(0, medication.currentInventory + delta);
    onUpdate({ ...medication, currentInventory: newCount });
  };

  const handleDeleteScheduleBlock = (blockId: string) => {
    const newSchedule = medication.schedule.filter(s => s.id !== blockId);
    onUpdate({ ...medication, schedule: newSchedule });
  };

  const handleUpdateScheduleBlock = (updatedBlock: ScheduleBlock) => {
    const newSchedule = medication.schedule.map(s => s.id === updatedBlock.id ? updatedBlock : s);
    onUpdate({ ...medication, schedule: newSchedule });
    setEditingBlock(null);
  };

  const handleAddScheduleBlock = (blockId: TimeBlockId) => {
    if (medication.schedule.some(s => s.timeBlock === blockId)) {
        alert("This time is already scheduled.");
        return;
    }
    const newBlock: ScheduleBlock = { id: uuidv4(), timeBlock: blockId, dose: 1, notificationEnabled: false };
    onUpdate({ ...medication, schedule: [...medication.schedule, newBlock] });
    setIsAddingTime(false);
  };

  const adherence = useMemo(() => {
    if (medication.status !== 'active') return 0;
    const today = new Date();
    let totalScheduled = 0;
    let totalTaken = 0;
    for(let i=0; i<30; i++) {
       const date = subDays(today, i);
       if (medication.dateAdded && date.getTime() < new Date(medication.dateAdded).setHours(0,0,0,0)) continue;
       const dateStr = date.toISOString().split('T')[0];
       medication.schedule.forEach(block => {
           totalScheduled++;
           const taken = logs.some(l => l.medicationId === medication.id && l.scheduledDate === dateStr && l.timeBlock === block.timeBlock && l.taken);
           if(taken) totalTaken++;
       });
    }
    if (totalScheduled === 0) return 100;
    return Math.round((totalTaken / totalScheduled) * 100);
  }, [medication, logs]);

  const hasNoRefills = medication.refillsRemaining === 0;
  const isFinalDoses = hasNoRefills && medication.currentInventory <= 3 && medication.currentInventory > 0;
  const isLow = !hasNoRefills && medication.currentInventory <= medication.refillThreshold;
  
  const availableBlocks = Object.values(TIME_BLOCKS).filter(b => !medication.schedule.some(s => s.timeBlock === b.id)).sort((a,b) => a.sortOrder - b.sortOrder);
  const recentLogs = useMemo(() => {
    return logs
      .filter(log => log.medicationId === medication.id && log.taken)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(log => {
        const dose = medication.schedule.find(block => block.timeBlock === log.timeBlock)?.dose ?? 1;
        return { ...log, dose };
      });
  }, [logs, medication.id, medication.schedule]);

  return (
    <div className="pb-24 relative">
      {isStopped && (
          <div className="bg-slate-800 text-slate-200 text-sm font-bold p-3 text-center sticky top-0 z-20 shadow-md">
              <Archive size={16} className="inline mr-2 mb-0.5" />
              Archived on {medication.dateStopped ? format(medication.dateStopped, 'MMM do, yyyy') : 'Unknown Date'}
          </div>
      )}

      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-8 h-8 text-slate-700" /></button>
            <h1 className="text-xl font-bold text-slate-800">{isStopped ? 'Archived Medication' : 'Details'}</h1>
        </div>
        <button onClick={() => setIsEditingDetails(true)} className="p-2 bg-slate-100 text-blue-600 rounded-full hover:bg-blue-50"><Edit size={20} /></button>
      </div>

      <div className={`p-6 rounded-3xl shadow-sm border mb-6 flex flex-col items-center text-center relative overflow-hidden transition-all duration-500
        ${isStopped ? 'bg-slate-50 border-slate-200 opacity-90 grayscale-[0.5]' : (isFinalDoses ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-orange-200 shadow-orange-100' : 'bg-white border-slate-100')}`}>
        
        {!isStopped && isLow && !medication.refillExpectedDate && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold py-1 flex items-center justify-center gap-1">
            <AlertCircle size={12} /> Low Stock - Refill Needed
          </div>
        )}
        
        {!isStopped && isFinalDoses && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-black py-1 flex items-center justify-center gap-1 uppercase tracking-widest animate-pulse">
            <Sparkles size={12} /> Finishing Strong! <Sparkles size={12} />
          </div>
        )}

        {!isStopped && medication.refillExpectedDate && !isFinalDoses && (
          <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-xs font-bold py-1 flex items-center justify-center gap-1">
            <CalendarIcon size={12} /> Ordered - Arriving {format(medication.refillExpectedDate, 'MMM do')}
          </div>
        )}

        {medication.image ? (<img src={medication.image} className={`w-32 h-32 rounded-2xl object-cover mb-4 shadow-lg border-4 ${isLow ? 'border-red-100' : (isFinalDoses ? 'border-orange-100' : 'border-white')} mt-4`} />) : (<div className={`w-32 h-32 rounded-2xl ${isFinalDoses ? 'bg-orange-100 text-orange-400' : 'bg-blue-50 text-blue-400'} flex items-center justify-center mb-4 shadow-inner mt-4`}><Pill size={48} /></div>)}
        
        <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{medication.name}</h2>
        <p className="text-xl text-slate-500 font-medium mt-1 mb-2">{medication.strength} • {medication.form}</p>
        
        {typeof medication.refillsRemaining === 'number' && (
           <div className={`mb-4 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${hasNoRefills ? (isFinalDoses ? 'bg-orange-200 text-orange-800' : 'bg-red-100 text-red-600') : 'bg-blue-100 text-blue-600'}`}>
              <RefreshCcw size={10} className="inline mr-1 mb-0.5" />
              {hasNoRefills ? 'No Refills Left' : `${medication.refillsRemaining} Refills Remaining`}
           </div>
        )}

        {!isStopped && (<div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${adherence >= 80 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}><TrendingUp size={16} /><span>{adherence}% Adherence</span></div>)}
      </div>
      
      {medication.instructions && (
         <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl text-yellow-900 mb-6 flex items-start gap-3">
           <CheckCircle2 className="shrink-0 mt-1 opacity-60" size={20} />
           <div><div className="text-xs font-bold uppercase tracking-wide opacity-60 mb-1">Instructions</div><p className="font-medium text-lg leading-snug">"{medication.instructions}"</p></div>
         </div>
      )}
      
      {medication.notes && (
         <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-slate-700 mb-6">
           <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Notes</div>
           <p className="font-medium text-base leading-snug">{medication.notes}</p>
         </div>
      )}

      {isFinalDoses && (
        <div className="bg-gradient-to-r from-orange-100 to-pink-100 border border-orange-200 p-5 rounded-3xl mb-6 shadow-sm flex items-center gap-4">
           <div className="bg-white p-3 rounded-2xl text-orange-500 shadow-sm"><Sparkles /></div>
           <div>
              <p className="font-black text-orange-900 leading-tight">Almost done!</p>
              <p className="text-sm text-orange-700 font-medium">Just {medication.currentInventory} {medication.inventoryUnit} left. You've got this, Mom! 🌸</p>
           </div>
        </div>
      )}

      <div className="mb-8">
         <div className="flex items-center justify-between mb-3 px-1">
           <h3 className="text-lg font-bold text-slate-700">Schedule</h3>
           {!isStopped && (<button onClick={() => { setEditingSchedule(!editingSchedule); setIsAddingTime(false); }} className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full">{editingSchedule ? 'Done' : 'Edit'}</button>)}
         </div>
         <div className="space-y-2">
           {medication.schedule.map((block) => {
             const def = TIME_BLOCKS[block.timeBlock];
             return (
               <div key={block.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${def.color} bg-opacity-20 text-current`}>{React.cloneElement(def.icon === 'Coffee' ? <ForkKnife size={20}/> : <Pill size={20}/>)}</div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                         {def.label}
                         {block.notificationEnabled && <Bell size={14} className="text-fuchsia-500" />}
                      </div>
                      <div className="text-slate-500 text-sm font-medium">Take <span className="text-slate-900 font-bold">{block.dose}</span> {medication.form} {block.notificationTime ? `at ${block.notificationTime}` : ''}</div>
                    </div>
                  </div>
                  {editingSchedule && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingBlock(block)} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"><Edit size={20} /></button>
                      <button onClick={() => handleDeleteScheduleBlock(block.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  )}
               </div>
             );
           })}
           {editingSchedule && (<button onClick={() => setIsAddingTime(true)} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"><Plus size={20} /> Add Dose</button>)}
         </div>
      </div>

      <h3 className="text-lg font-bold text-slate-700 mb-3 px-1">Inventory</h3>
      <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="grid grid-cols-2 gap-2">
            <div className={`p-4 rounded-2xl ${isLow && !isStopped ? 'bg-red-50' : (isFinalDoses ? 'bg-orange-50' : 'bg-slate-50')} flex flex-col justify-between`}>
               <span className={`text-xs font-bold uppercase ${isLow && !isStopped ? 'text-red-400' : (isFinalDoses ? 'text-orange-400' : 'text-slate-400')}`}>Current Stock</span>
               <div className="flex items-center gap-3 my-2">
                  <div className={`text-5xl font-black ${isLow && !isStopped ? 'text-red-600' : (isFinalDoses ? 'text-orange-600' : 'text-slate-800')}`}>{medication.currentInventory}</div>
                  {!isStopped && (<div className="flex flex-col gap-1"><button onClick={() => handleInventoryChange(1)} className="w-8 h-8 bg-white rounded-lg shadow-sm text-slate-600 font-bold border border-slate-200">+</button><button onClick={() => handleInventoryChange(-1)} className="w-8 h-8 bg-white rounded-lg shadow-sm text-slate-600 font-bold border border-slate-200">-</button></div>)}
               </div>
               <span className="text-xs font-medium text-slate-400">{medication.inventoryUnit} remaining</span>
            </div>
            {!isStopped && !hasNoRefills ? (
                <button onClick={() => setIsRefilling(true)} className="p-4 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-colors flex flex-col justify-center items-center text-center gap-2 group"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform"><Pill size={24} /></div><div><div className="font-bold text-blue-700">Refill Bottle</div><div className="text-xs text-blue-400 font-medium">Order or Log</div></div></button>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col justify-center items-center text-center gap-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                  {hasNoRefills ? <RefreshCcw size={24} /> : <Pill size={24} />}
                </div>
                <div className="text-slate-400 font-bold text-sm">{hasNoRefills ? 'No Refills Left' : 'Refills Disabled'}</div>
              </div>
            )}
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-bold text-slate-700 mb-3 px-1">Recent Activity</h3>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          {recentLogs.length === 0 ? (
            <div className="text-center text-slate-400 font-medium py-4">No logs yet.</div>
          ) : (
            recentLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between border-b border-slate-100 last:border-b-0 pb-3 last:pb-0">
                <div>
                  <div className="font-bold text-slate-800">{TIME_BLOCKS[log.timeBlock]?.label || log.timeBlock}</div>
                  <div className="text-xs text-slate-400 font-medium">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</div>
                </div>
                <div className="text-sm font-bold text-slate-600">
                  {log.dose} {medication.form}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-12 space-y-4">
           {isStopped ? (
             <><button onClick={() => onRestore && onRestore(medication.id)} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors text-lg flex items-center justify-center gap-2"><RotateCcw size={20} />Resume Medication</button><button onClick={() => { if(confirm("This will permanently delete the medication and all its history. This cannot be undone.")) { onPermanentDelete && onPermanentDelete(medication.id); } }} className="w-full bg-slate-100 text-red-400 font-bold py-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm flex items-center justify-center gap-2"><Trash2 size={16} />Delete Permanently</button></>
           ) : (<button onClick={() => { if(confirm("Are you sure you want to stop this medication? It will be moved to your history.")) { onDelete(medication.id); } }} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-sm flex items-center justify-center gap-2"><Archive size={18} />Stop & Archive Medication</button>)}
      </div>

      <Modal isOpen={isEditingDetails} onClose={() => setIsEditingDetails(false)} title="Edit Details"><EditMedicationModal medication={medication} onClose={() => setIsEditingDetails(false)} onSave={onUpdate}/></Modal>
      <Modal isOpen={!!editingBlock} onClose={() => setEditingBlock(null)} title="Edit Schedule">{editingBlock && (<EditScheduleBlockModal block={editingBlock} existingTimeBlocks={medication.schedule.map(s => s.timeBlock)} formType={medication.form || 'Pill'} onClose={() => setEditingBlock(null)} onSave={handleUpdateScheduleBlock} onDelete={handleDeleteScheduleBlock} />)}</Modal>
      <Modal isOpen={isRefilling} onClose={() => setIsRefilling(false)} title={`Refill ${medication.name}`}><RefillModal medication={medication} onClose={() => setIsRefilling(false)} onRefill={onRefill} onOrder={onOrder}/></Modal>
      <Modal isOpen={isAddingTime} onClose={() => setIsAddingTime(false)} title="Add Dose"><div className="space-y-4"><p className="text-slate-500 mb-4">Select a time to add to the schedule:</p><div className="flex flex-wrap gap-2">{availableBlocks.map(block => (<TimeBlockChip key={block.id} blockId={block.id} onClick={() => handleAddScheduleBlock(block.id)}/>))}</div></div></Modal>
    </div>
  );
};
