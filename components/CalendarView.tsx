
import React, { useState, useMemo } from 'react';
import { Medication, MedLog, TimeBlockId } from '../types';
import { TIME_BLOCKS, getIcon } from '../constants';
import { BigButton, Modal } from './Components';
import { RefillModal } from './RefillModal';
import { Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Phone, Plus, AlertCircle, ShoppingBag, CheckCircle2, XCircle, HelpCircle, Package, Star } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, isToday, differenceInCalendarDays } from 'date-fns';

interface CalendarViewProps {
  medications: Medication[];
  logs: MedLog[];
  onToggleLog: (medId: string, blockId: TimeBlockId, dateStr: string) => void;
  onUpdateMedication: (med: Medication) => void;
  onRefill: (id: string, amount: number, refillsRemaining?: number) => void;
  onOrder: (id: string, expectedDate: number) => void;
}

type ViewMode = 'day' | 'week' | 'month';

export const CalendarView: React.FC<CalendarViewProps> = ({ medications, logs, onToggleLog, onRefill, onOrder }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // State for modals
  const [confirmTask, setConfirmTask] = useState<{
    medId: string;
    blockId: TimeBlockId;
    dateStr: string;
    medName: string;
  } | null>(null);

  const [refillingMed, setRefillingMed] = useState<Medication | null>(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // --- Logic for Low Stock (Only show if refills remaining > 0) ---
  const lowStockMeds = medications.filter(m => 
    m.status === 'active' && 
    m.currentInventory <= m.refillThreshold &&
    m.refillsRemaining !== 0 // SUPPRESS alert if NO refills left
  );

  // --- Logic for Expected Refills ---
  const expectedRefills = medications.filter(m => 
    m.status === 'active' && 
    m.refillExpectedDate && 
    isSameDay(new Date(m.refillExpectedDate), selectedDate)
  );
  
  // --- Helpers ---

  // Check if we have enough inventory projected for this date
  const hasInventoryForFuture = (med: Medication, date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(date);
    target.setHours(0,0,0,0);

    // Past dates always show schedule (history)
    if (target < today) return true;

    const dailyDose = med.schedule.reduce((sum, block) => sum + block.dose, 0);
    if (dailyDose === 0) return true; 

    // Projection: How many full days of doses do we have left?
    const daysSupplied = Math.floor(med.currentInventory / dailyDose);
    const diff = differenceInCalendarDays(target, today);
    
    return diff < daysSupplied;
  };
  
  const getDailyStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let totalScheduled = 0;
    let totalTaken = 0;

    medications.forEach(med => {
      // Only count active meds, OR meds that were active on that specific past date
      if (med.status === 'stopped' && med.dateStopped && date.getTime() > med.dateStopped) return;
      if (med.dateAdded && date.getTime() < new Date(med.dateAdded).setHours(0,0,0,0)) return;

      // Check Inventory Projection
      const isLoggedAny = logs.some(l => l.medicationId === med.id && l.scheduledDate === dateStr && l.taken);
      if (!isLoggedAny && !hasInventoryForFuture(med, date)) return;

      med.schedule.forEach(block => {
        const taken = logs.some(l => 
          l.medicationId === med.id && 
          l.scheduledDate === dateStr && 
          l.timeBlock === block.timeBlock &&
          l.taken
        );

        if (taken || hasInventoryForFuture(med, date)) {
            totalScheduled++;
            if (taken) totalTaken++;
        }
      });
    });

    if (totalScheduled === 0) return 'none';
    if (totalTaken === totalScheduled) return 'complete';
    if (totalTaken > 0) return 'partial';
    return 'empty';
  };

  const getMedicationDayStatus = (med: Medication, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // History Check
    if (med.status === 'stopped' && med.dateStopped && date.getTime() > med.dateStopped) return 'none';
    if (med.dateAdded && date.getTime() < new Date(med.dateAdded).setHours(0,0,0,0)) return 'none';

    // Inventory Check
    const hasInventory = hasInventoryForFuture(med, date);

    let scheduled = med.schedule.length;
    let taken = 0;
    
    med.schedule.forEach(block => {
      const isTaken = logs.some(l => 
        l.medicationId === med.id && 
        l.scheduledDate === dateStr && 
        l.timeBlock === block.timeBlock &&
        l.taken
      );
      if (isTaken) taken++;
    });

    // If no inventory and not taken, don't show as a missed/empty slot
    if (!hasInventory && taken === 0) return 'none';

    if (scheduled === 0) return 'none';
    if (taken === scheduled) return 'complete';
    if (taken > 0) return 'partial';
    return 'missed';
  };

  // --- Day View Data ---
  
  const dayTasks = useMemo(() => {
    const tasks: { 
      id: string; 
      medication: Medication; 
      timeBlockId: TimeBlockId; 
      completed: boolean; 
      order: number;
    }[] = [];

    medications.forEach(med => {
      // Historical Check
      if (med.status === 'stopped' && med.dateStopped && selectedDate.getTime() > med.dateStopped) return;
      if (med.dateAdded && selectedDate.getTime() < new Date(med.dateAdded).setHours(0,0,0,0)) return;

      med.schedule.forEach(block => {
        const isLogged = logs.some(l => 
          l.medicationId === med.id && 
          l.scheduledDate === selectedDateStr && 
          l.timeBlock === block.timeBlock &&
          l.taken
        );

        // Show task if it's already logged (taken) OR if we have enough inventory to take it
        if (isLogged || hasInventoryForFuture(med, selectedDate)) {
            const def = TIME_BLOCKS[block.timeBlock];
            tasks.push({
            id: `${med.id}-${block.timeBlock}`,
            medication: med,
            timeBlockId: block.timeBlock,
            completed: isLogged,
            order: def.sortOrder
            });
        }
      });
    });

    return tasks.sort((a, b) => a.order - b.order);
  }, [medications, logs, selectedDateStr, selectedDate]);

  const activeDayBlocks = useMemo(() => {
    const groups: Record<string, typeof dayTasks> = {};
    dayTasks.forEach(task => {
      if (!groups[task.timeBlockId]) groups[task.timeBlockId] = [];
      groups[task.timeBlockId].push(task);
    });
    return Object.keys(groups).sort((a, b) => {
      return TIME_BLOCKS[a as TimeBlockId].sortOrder - TIME_BLOCKS[b as TimeBlockId].sortOrder;
    }).map(id => ({ id: id as TimeBlockId, tasks: groups[id] }));
  }, [dayTasks]);

  // Handle task click with safety check
  const handleTaskClick = (task: { id: string; medication: Medication; timeBlockId: TimeBlockId; completed: boolean }) => {
    if (task.completed) {
      setConfirmTask({
        medId: task.medication.id,
        blockId: task.timeBlockId,
        dateStr: selectedDateStr,
        medName: task.medication.name
      });
    } else {
      onToggleLog(task.medication.id, task.timeBlockId, selectedDateStr);
    }
  };

  const renderViewToggle = () => (
    <div className="flex p-1 bg-violet-100 rounded-xl mb-4">
      {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
            viewMode === mode ? 'bg-white text-violet-700 shadow-sm' : 'text-violet-400 hover:text-violet-600'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );

  const renderRefillAlerts = () => {
    if (lowStockMeds.length === 0) return null;

    return (
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 px-1">
           <AlertCircle className="text-red-500" size={20} />
           <h3 className="font-bold text-slate-700">Refills Needed</h3>
        </div>
        {lowStockMeds.map(med => {
            if (med.refillExpectedDate) return null;

            return (
                <div key={med.id} className="bg-white border-2 border-red-100 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                        <div className="font-bold text-red-900 text-lg">{med.name}</div>
                        <div className="text-red-600 font-medium">
                            Only <span className="font-bold">{med.currentInventory}</span> {med.inventoryUnit} left
                        </div>
                        {med.pharmacyName && (
                            <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <ShoppingBag size={12}/> {med.pharmacyName}
                            </div>
                        )}
                        </div>
                    </div>
                    
                    <div className="flex gap-2 w-full">
                    {med.pharmacyPhone ? (
                        <a 
                        href={`tel:${med.pharmacyPhone}`}
                        className="flex-1 bg-white text-red-600 border border-red-200 font-bold py-2 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                        <Phone size={18} /> Call
                        </a>
                    ) : (
                        <div className="flex-1 bg-red-100 text-red-400 text-xs font-bold py-2 rounded-xl flex items-center justify-center border border-red-200">
                            No Phone
                        </div>
                    )}
                    <button 
                        onClick={() => setRefillingMed(med)}
                        className="flex-1 bg-red-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-200 active:scale-95 transition-transform"
                    >
                        <Plus size={18} /> Refill
                    </button>
                    </div>
                </div>
            )
        })}
      </div>
    );
  };

  const renderDayView = () => (
    <div className="space-y-6">
       <div className="flex items-center justify-between px-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
         <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-3 hover:bg-slate-50 rounded-full text-indigo-400 transition-colors">
           <ChevronLeft size={28} strokeWidth={2.5} />
         </button>
         <div className="text-center">
            <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
            </h2>
            <p className="text-fuchsia-600 font-bold text-lg">{format(selectedDate, 'MMM do, yyyy')}</p>
         </div>
         <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-3 hover:bg-slate-50 rounded-full text-indigo-400 transition-colors">
           <ChevronRight size={28} strokeWidth={2.5} />
         </button>
       </div>

       {renderRefillAlerts()}

       {expectedRefills.length > 0 && (
           <div className="mb-6 space-y-3">
               <div className="flex items-center gap-2 px-1">
                   <Package className="text-blue-500" size={20} />
                   <h3 className="font-bold text-slate-700">Refill Pickup Due</h3>
               </div>
               {expectedRefills.map(med => (
                   <div key={med.id} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                       <div>
                           <div className="font-bold text-blue-900 text-lg">{med.name}</div>
                           <div className="text-blue-600 font-medium text-sm">Scheduled Pickup</div>
                       </div>
                       <button 
                           onClick={() => setRefillingMed(med)}
                           className="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl shadow-md shadow-blue-200 active:scale-95 transition-transform"
                       >
                           Complete
                       </button>
                   </div>
               ))}
           </div>
       )}

       <div className="bg-white p-6 rounded-3xl border border-white shadow-lg shadow-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-5">
             <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                     <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                     </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="28" className="text-slate-100" strokeWidth="6" fill="none" stroke="currentColor" />
                  <circle 
                    cx="32" cy="32" r="28" 
                    className="transition-all duration-500" 
                    strokeWidth="6" fill="none" stroke="url(#rainbow)" 
                    strokeDasharray={176}
                    strokeDashoffset={176 - (176 * (dayTasks.filter(t => t.completed).length / (dayTasks.length || 1)))}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-sm font-black text-indigo-900">
                  {Math.round((dayTasks.filter(t => t.completed).length / (dayTasks.length || 1)) * 100)}%
                </span>
             </div>
             <div>
               <div className="text-xl font-bold text-indigo-900">Daily Progress</div>
               <div className="text-slate-400 text-sm font-medium">{dayTasks.filter(t => t.completed).length} of {dayTasks.length} doses taken</div>
             </div>
          </div>
          {dayTasks.length > 0 && dayTasks.every(t => t.completed) && (
             <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg shadow-green-200">
               <Star size={16} fill="currentColor" /> Great Job!
             </div>
          )}
       </div>

       {activeDayBlocks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarIcon className="w-16 h-16 mx-auto mb-3 opacity-20 text-fuchsia-300" />
            <p className="text-lg font-medium text-slate-400">No medications for today.</p>
          </div>
       ) : (
          <div className="space-y-6">
            {activeDayBlocks.map(({ id, tasks }) => {
                const def = TIME_BLOCKS[id];
                return (
                  <div key={id} className="bg-white/80 backdrop-blur mx-2 p-5 rounded-3xl shadow-sm border border-white">
                    <div className={`flex items-center gap-2 mb-4 font-bold text-xl ${def.color.split(' ')[1]}`}>
                        {getIcon(def.icon)}
                        <span>{def.label}</span>
                    </div>
                    <div className="space-y-3">
                        {tasks.map(task => (
                          <button
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 group
                              ${task.completed 
                                ? 'bg-green-50 border-green-200 opacity-60 grayscale-[0.3]' 
                                : 'bg-white border-slate-100 hover:border-fuchsia-200 hover:bg-fuchsia-50/50 hover:shadow-md'
                              }`}
                          >
                            <div className="flex items-center gap-4 text-left">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                                    ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-transparent group-hover:border-fuchsia-300'}
                                `}>
                                    <Check size={18} strokeWidth={4} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className={`text-lg font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-indigo-900'}`}>
                                        {task.medication.name}
                                    </div>
                                    {task.medication.color && (
                                        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: task.medication.color }}></div>
                                    )}
                                  </div>
                                  <div className="text-sm text-slate-500 font-medium">
                                    {task.medication.strength} • {task.medication.schedule.find(s => s.timeBlock === task.timeBlockId)?.dose} {task.medication.form}
                                  </div>
                                </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                );
            })}
          </div>
       )}
    </div>
  );

  const renderWeekView = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });

    return (
      <div className="space-y-4">
        {renderRefillAlerts()}
        <div className="flex items-center justify-between mb-2 px-2">
            <button onClick={() => setSelectedDate(d => subDays(d, 7))} className="p-2 hover:bg-slate-100 rounded-full text-indigo-400">
              <ChevronLeft size={24} strokeWidth={2.5}/>
            </button>
            <span className="font-bold text-lg text-indigo-900">
              {format(days[0], 'MMM d')} - {format(days[6], 'MMM d')}
            </span>
            <button onClick={() => setSelectedDate(d => addDays(d, 7))} className="p-2 hover:bg-slate-100 rounded-full text-indigo-400">
              <ChevronRight size={24} strokeWidth={2.5}/>
            </button>
        </div>

        <div className="space-y-4">
          {medications.filter(m => m.status === 'active').map(med => (
             <div key={med.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                   {med.image ? (
                     <img src={med.image} className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
                   ) : (
                     <div className="w-10 h-10 bg-fuchsia-50 rounded-xl flex items-center justify-center text-fuchsia-500 font-bold text-xs">IMG</div>
                   )}
                   <div>
                     <div className="font-bold text-slate-800 flex items-center gap-1">
                        {med.name}
                        {med.color && <div className="w-2 h-2 rounded-full ml-1" style={{ backgroundColor: med.color }}></div>}
                     </div>
                     <div className="text-xs text-slate-500">{med.strength}</div>
                   </div>
                </div>

                <div className="flex justify-between items-center">
                   {days.map(day => {
                     const status = getMedicationDayStatus(med, day);
                     const isFuture = day > new Date();
                     const medColor = med.color || '#3B82F6';

                     return (
                       <button 
                          key={day.toISOString()} 
                          className="flex flex-col items-center gap-1 group"
                          onClick={() => {
                            setSelectedDate(day);
                            setViewMode('day');
                          }}
                        >
                          <span className={`text-[10px] font-bold ${isSameDay(day, new Date()) ? 'text-fuchsia-600' : 'text-slate-400'} group-hover:text-blue-500`}>{format(day, 'EEE')[0]}</span>
                          <div 
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2
                                group-hover:ring-2 group-hover:ring-blue-100
                                ${status === 'complete' ? 'bg-green-500 border-green-500 text-white shadow-sm' : ''}
                                ${status === 'partial' ? 'bg-orange-400 border-orange-400 text-white' : ''}
                                ${status === 'missed' && !isFuture ? 'bg-red-50 border-red-100 text-red-400' : ''}
                                ${status === 'missed' && isFuture ? 'bg-white text-slate-400' : ''}
                                ${status === 'none' ? 'bg-slate-50 border-transparent text-transparent opacity-20' : ''}
                              `}
                              style={status === 'missed' && isFuture ? { borderColor: medColor } : {}}
                          >
                            {status === 'complete' && <Check size={14} strokeWidth={4} />}
                            {status === 'partial' && <span className="w-2 h-2 bg-white rounded-full" />}
                            {status === 'missed' && !isFuture && <span className="w-2 h-2 bg-red-400 rounded-full" />}
                            {status === 'missed' && isFuture && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: medColor }} />}
                          </div>
                       </button>
                     );
                   })}
                </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = start.getDay();
    const emptyStart = Array(startDayOfWeek).fill(null);

    return (
      <div>
         {renderRefillAlerts()}
         <div className="flex items-center justify-between mb-6 px-2">
            <button onClick={() => setSelectedDate(d => subDays(d, 30))} className="p-2 hover:bg-slate-100 rounded-full text-indigo-400">
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <h2 className="text-2xl font-black text-indigo-900">{format(selectedDate, 'MMMM yyyy')}</h2>
            <button onClick={() => setSelectedDate(d => addDays(d, 30))} className="p-2 hover:bg-slate-100 rounded-full text-indigo-400">
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>
         </div>

         <div className="grid grid-cols-7 gap-2 text-center mb-2">
           {['S','M','T','W','T','F','S'].map(d => (
             <div key={d} className="text-xs font-bold text-slate-400">{d}</div>
           ))}
         </div>

         <div className="grid grid-cols-7 gap-2">
            {emptyStart.map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const status = getDailyStatus(day);
              const isSelected = isSameDay(day, selectedDate);
              const isFuture = day > new Date();

              const hasRefill = medications.some(m => m.refillExpectedDate && isSameDay(new Date(m.refillExpectedDate), day));
              
              const scheduledMeds = medications.filter(m => {
                  if (m.status !== 'active') return false;
                  if (m.dateAdded && day.getTime() < new Date(m.dateAdded).setHours(0,0,0,0)) return false;
                  
                  const isLoggedAny = logs.some(l => l.medicationId === m.id && l.scheduledDate === format(day, 'yyyy-MM-dd') && l.taken);
                  if (!isLoggedAny && !hasInventoryForFuture(m, day)) return false;

                  return m.schedule.length > 0;
              });

              return (
                <button 
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-start py-2 relative border-2 transition-all
                    ${isSelected ? 'border-fuchsia-500 bg-fuchsia-600 text-white shadow-md transform scale-105 z-10' : 'border-transparent bg-white hover:border-violet-200'}
                    ${!isFuture && status === 'complete' && !isSelected ? 'bg-green-50' : ''}
                    ${hasRefill ? 'ring-2 ring-blue-300' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : (isSameDay(day, new Date()) ? 'text-fuchsia-600' : 'text-slate-700')}`}>
                    {format(day, 'd')}
                  </span>

                  {hasRefill && (
                     <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full ring-1 ring-white"></div>
                  )}
                  
                  <div className="flex gap-0.5 justify-center mt-1 flex-wrap px-1 w-full max-w-full overflow-hidden">
                    {scheduledMeds.slice(0, 4).map(m => (
                        <div 
                            key={m.id} 
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'ring-1 ring-white' : ''}`} 
                            style={{ backgroundColor: m.color || '#3B82F6' }} 
                        />
                    ))}
                    {scheduledMeds.length > 4 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 text-[6px] flex items-center justify-center">+</div>}
                  </div>
                  
                  {!isFuture && (
                    <div className="absolute bottom-1 w-full flex justify-center gap-0.5">
                      {status === 'complete' && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />}
                      {status === 'partial' && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`} />}
                      {status === 'empty' && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-200'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
         </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      {renderViewToggle()}
      
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      <Modal 
        isOpen={!!confirmTask} 
        onClose={() => setConfirmTask(null)} 
        title="Double Check"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
             <HelpCircle className="w-12 h-12 text-blue-500 mb-3" />
             <p className="text-lg font-medium text-slate-600">
               Verify status for <br/><span className="text-xl font-bold text-slate-800">{confirmTask?.medName}</span>
             </p>
          </div>
          
          <div className="space-y-3">
             <BigButton 
               label="I have taken this medication" 
               primary 
               icon={<CheckCircle2 />}
               onClick={() => setConfirmTask(null)}
             />
             <BigButton 
               label="I haven't taken this medication" 
               icon={<XCircle />}
               onClick={() => {
                 if (confirmTask) {
                    onToggleLog(confirmTask.medId, confirmTask.blockId, confirmTask.dateStr);
                    setConfirmTask(null);
                 }
               }}
             />
          </div>
        </div>
      </Modal>

      {refillingMed && (
        <Modal 
            isOpen={!!refillingMed} 
            onClose={() => setRefillingMed(null)} 
            title={`Refill ${refillingMed.name}`}
        >
            <RefillModal 
                medication={refillingMed}
                onClose={() => setRefillingMed(null)}
                onRefill={onRefill}
                onOrder={onOrder}
            />
        </Modal>
      )}
    </div>
  );
};
