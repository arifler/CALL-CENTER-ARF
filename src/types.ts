export type LeadStatus = 'pending' | 'negative' | 'undecided' | 'positive';

export interface Lead {
  id?: string;
  name: string;
  year?: string;
  sacrificeType?: string;
  phone: string;
  assignedTo: string; // User name
  status: LeadStatus;
  mulahaza?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface User {
  id?: string;
  name: string;
  role: 'admin' | 'agent';
}
