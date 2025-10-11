import { Activity } from './db';

export interface ActivityWithLead extends Activity {
  lead_name?: string;
  lead_id: string;
}

export interface ActivityCreate {
  lead_id: string;
  type: 'note' | 'task' | 'status';
  message: string;
  due_at?: string;
  created_by: string;
}
