
export type Frequency = 'daily' | 'twice_daily' | '3x_daily' | 'weekly' | 'prn';

export type TimeBlockId = 
  | 'waking' 
  | 'morning' 
  | 'afternoon' 
  | 'evening' 
  | 'bedtime' 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner';

export type AnchorType = 'time' | 'meal';

export interface ScheduleBlock {
  id: string;
  timeBlock: TimeBlockId;
  dose: number;
  notificationEnabled?: boolean;
  notificationTime?: string; // e.g., "08:30"
}

export interface AppSettings {
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
}

export interface RefillEvent {
  id: string;
  date: number;
  amount: number;
}

export interface Medication {
  id: string;
  name: string;
  nickname?: string;
  strength?: string;
  form?: string;
  instructions?: string;
  color?: string;
  image?: string;
  frequency: Frequency;
  anchorType: AnchorType;
  schedule: ScheduleBlock[];
  currentInventory: number;
  refillThreshold: number;
  inventoryUnit: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
  rxNumber?: string;
  refillsRemaining?: number;
  notes?: string;
  lastRefilled?: number;
  refillHistory?: RefillEvent[];
  refillExpectedDate?: number;
  refillAlertEnabled?: boolean;
  refillAlertTime?: string;
  doctorName?: string;
  doctorPhone?: string;
  status: 'active' | 'paused' | 'stopped';
  dateAdded: number;
  dateStopped?: number;
}

export interface MedLog {
  id: string;
  medicationId: string;
  timestamp: number;
  scheduledDate: string;
  timeBlock: TimeBlockId;
  taken: boolean;
}

export interface TimeBlockDef {
  id: TimeBlockId;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  isMeal: boolean;
}
