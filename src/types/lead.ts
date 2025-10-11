import { Lead, Activity } from './db';

export interface LeadFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  intentLevel?: string[];
  stage?: string[];
  searchQuery?: string;
}

export interface LeadWithActivities extends Lead {
  activities: Activity[];
  conversationCount: number;
}

export interface LeadSummary {
  summary: string;
  keyInsights: string[];
  nextSteps: string[];
}
