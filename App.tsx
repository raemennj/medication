
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, LayoutGrid } from 'lucide-react';
import { Medication, MedLog, TimeBlockId, AppSettings } from './types';
import { CalendarView } from './components/CalendarView';
import { CabinetView } from './components/CabinetView';
import { MedicationDetail } from './components/MedicationDetail';
import { SettingsView } from './components/SettingsView';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const MOCK_MEDS: Medication[] = [
  {
    id: '1',
    name: 'Atorvastatin',
    strength: '20mg',
    form: 'Tablet',
    frequency: 'daily',
    anchorType: 'time',
    schedule: [{ id: 's1', timeBlock: 'bedtime', dose: 1, notificationEnabled: false }],
    currentInventory: 5,
    refillThreshold: 10,
    inventoryUnit: 'tablets',
    status: 'active',
    dateAdded: Date.now(),
    pharmacyName: "CVS Pharmacy",
    pharmacyPhone: "555-0123",
    rxNumber: "RX-998877",
    doctorName: "Dr. Smith",
    color: '#8B5CF6',
    refillsRemaining: 2
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  dailySummaryEnabled: false,
  dailySummaryTime: "07:00"
};

const App: React.FC = () => {
  const [view, setView] = useState<'calendar' | 'cabinet' | 'settings'>('calendar');
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('momsMeds_medications');
    return saved ? JSON.parse(saved) : MOCK_MEDS;
  });

  const [logs, setLogs] = useState<MedLog[]>(() => {
    const saved = localStorage.getItem('momsMeds_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('momsMeds_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const remainingDosesToday = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let count = 0;
    medications.filter(m => m.status === 'active').forEach(med => {
      med.schedule.forEach(block => {
        const isTaken = logs.some(l => 
          l.medicationId === med.id && 
          l.scheduledDate === todayStr && 
          l.timeBlock === block.timeBlock && 
          l.taken
        );
        if (!isTaken) count++;
      });
    });
    return count;
  }, [medications, logs]);

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (remainingDosesToday > 0) {
        (navigator as any).setAppBadge(remainingDosesToday).catch(console.error);
      } else {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [remainingDosesToday]);

  useEffect(() => {
    localStorage.setItem('momsMeds_medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('momsMeds_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('momsMeds_settings', JSON.stringify(settings));
  }, [settings]);

  const handleAddMedication = (med: Medication) => {
    setMedications(prev => [...prev, med]);
  };

  const handleUpdateMedication = (updatedMed: Medication) => {
    setMedications(prev => prev.map(m => m.id === updatedMed.id ? updatedMed : m));
    if (selectedMed?.id === updatedMed.id) setSelectedMed(updatedMed);
  };

  const handleRefill = (id: string, amount: number, newRefillsRemaining?: number) => {
    setMedications(prev => prev.map(m => {
      if (m.id === id) {
        const updatedMed: Medication = {
          ...m,
          currentInventory: m.currentInventory + amount,
          refillsRemaining: newRefillsRemaining !== undefined ? newRefillsRemaining : m.refillsRemaining,
          lastRefilled: Date.now(),
          refillExpectedDate: undefined,
          refillAlertEnabled: false, // Reset alert when picked up
          refillHistory: [...(m.refillHistory || []), { id: uuidv4(), date: Date.now(), amount }]
        };
        if (selectedMed?.id === id) setSelectedMed(updatedMed);
        return updatedMed;
      }
      return m;
    }));
  };

  const handleRefillOrder = (id: string, expectedDate: number, alertEnabled?: boolean, alertTime?: string) => {
    setMedications(prev => prev.map(m => {
      if (m.id === id) {
        const updatedMed = { 
            ...m, 
            refillExpectedDate: expectedDate,
            refillAlertEnabled: alertEnabled,
            refillAlertTime: alertTime
        };
        if (selectedMed?.id === id) setSelectedMed(updatedMed);
        return updatedMed;
      }
      return m;
    }));
  };

  const handleDeleteMedication = (id: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, status: 'stopped', dateStopped: Date.now() } : m));
    setSelectedMed(null);
  };

  const handleRestoreMedication = (id: string) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, status: 'active', dateStopped: undefined } : m));
    if (selectedMed?.id === id) setSelectedMed(prev => prev ? ({ ...prev, status: 'active', dateStopped: undefined }) : null);
  };

  const handlePermanentDelete = (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    setSelectedMed(null);
  };

  const handleToggleLog = useCallback((medId: string, blockId: TimeBlockId, dateStr: string) => {
    setLogs(prev => {
      const existingIndex = prev.findIndex(l => l.medicationId === medId && l.timeBlock === blockId && l.scheduledDate === dateStr);
      if (existingIndex === -1) {
         setMedications(currentMeds => currentMeds.map(m => {
             if (m.id === medId) {
                 const block = m.schedule.find(s => s.timeBlock === blockId);
                 const dose = block ? block.dose : 0;
                 return { ...m, currentInventory: Math.max(0, m.currentInventory - dose) };
             }
             return m;
         }));
         return [...prev, { id: uuidv4(), medicationId: medId, timeBlock: blockId, scheduledDate: dateStr, timestamp: Date.now(), taken: true }];
      } else {
        setMedications(currentMeds => currentMeds.map(m => {
             if (m.id === medId) {
                 const block = m.schedule.find(s => s.timeBlock === blockId);
                 const dose = block ? block.dose : 0;
                 return { ...m, currentInventory: m.currentInventory + dose };
             }
             return m;
         }));
        return prev.filter((_, i) => i !== existingIndex);
      }
    });
  }, []);

  const handleNavClick = (targetView: 'calendar' | 'cabinet') => {
    if (view === targetView && selectedMed) setSelectedMed(null);
    else { setView(targetView); setSelectedMed(null); }
  };

  const renderContent = () => {
    if (view === 'settings') {
      return <SettingsView settings={settings} onUpdate={setSettings} onBack={() => setView('cabinet')} />;
    }

    if (selectedMed) {
      return (
        <MedicationDetail medication={selectedMed} logs={logs} onBack={() => setSelectedMed(null)} onUpdate={handleUpdateMedication} onDelete={handleDeleteMedication} onRestore={handleRestoreMedication} onPermanentDelete={handlePermanentDelete} onRefill={handleRefill} onOrder={handleRefillOrder} />
      );
    }

    switch (view) {
      case 'calendar': return <CalendarView medications={medications} logs={logs} onToggleLog={handleToggleLog} onUpdateMedication={handleUpdateMedication} onRefill={handleRefill} onOrder={handleRefillOrder} />;
      case 'cabinet': return <CabinetView medications={medications} onAddMedication={handleAddMedication} onSelectMedication={setSelectedMed} onOpenSettings={() => setView('settings')} />;
      default: return <CalendarView medications={medications} logs={logs} onToggleLog={handleToggleLog} onUpdateMedication={handleUpdateMedication} onRefill={handleRefill} onOrder={handleRefillOrder} />;
    }
  };

  return (
    <div className="bg-fuchsia-50/50 min-h-screen text-slate-800 font-sans selection:bg-pink-200 relative">
      <main className="max-w-lg mx-auto min-h-screen bg-white/60 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="h-full overflow-y-auto pt-6 px-4 pb-32 scroll-smooth">
          {renderContent()}
        </div>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
            <div className="bg-white/90 backdrop-blur-md border border-white shadow-2xl shadow-indigo-200 rounded-full px-8 py-3 flex items-center gap-12 ring-1 ring-black/5">
              <button onClick={() => handleNavClick('calendar')} className="relative group flex flex-col items-center justify-center w-12">
                <div className={`transition-all duration-300 ease-out flex items-center justify-center ${view === 'calendar' ? 'scale-110 -translate-y-2 text-fuchsia-600' : 'text-slate-400 hover:text-slate-600'}`}><Calendar size={28} strokeWidth={view === 'calendar' ? 2.5 : 2} className={view === 'calendar' ? 'drop-shadow-sm filter' : ''} /></div>
                {remainingDosesToday > 0 && view !== 'calendar' && (
                  <div className="absolute top-0 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
                    {remainingDosesToday}
                  </div>
                )}
                <div className={`absolute -bottom-2 w-8 h-1 bg-gradient-to-r from-orange-400 to-pink-500 rounded-t-full transition-all duration-300 ${view === 'calendar' ? 'opacity-100 scale-100' : 'opacity-0 scale-0 translate-y-2'}`} />
              </button>
              <button onClick={() => handleNavClick('cabinet')} className="relative group flex flex-col items-center justify-center w-12">
                <div className={`transition-all duration-300 ease-out flex items-center justify-center ${view === 'cabinet' ? 'scale-110 -translate-y-2 text-fuchsia-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={28} strokeWidth={view === 'cabinet' ? 2.5 : 2} className={view === 'cabinet' ? 'drop-shadow-sm filter' : ''} /></div>
                <div className={`absolute -bottom-2 w-8 h-1 bg-gradient-to-r from-orange-400 to-pink-500 rounded-t-full transition-all duration-300 ${view === 'cabinet' ? 'opacity-100 scale-100' : 'opacity-0 scale-0 translate-y-2'}`} />
              </button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
