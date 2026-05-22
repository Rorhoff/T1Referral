import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  company: string;
  role: string;
  location: string;
  linkedin_url: string;
  years_experience: number;
  skills: string[];
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  company: string;
  role_title: string;
  description: string;
  referral_bonus: string;
  has_bonus: boolean;
  job_url: string;
  location: string;
  is_remote: boolean;
  tags: string[];
  required_skills: string[];
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
};

export type Conversation = {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  last_message?: Message;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
};

export type SeekerPost = {
  id: string;
  author_id: string;
  headline: string;
  about: string;
  desired_role: string;
  desired_location: string;
  open_to_remote: boolean;
  field_of_work: string;
  skills: string[];
  experience_years: number;
  resume_url: string;
  portfolio_url: string;
  availability: 'immediately' | '2weeks' | '1month' | '3months';
  is_premium: boolean;
  premium_expires_at: string | null;
  premium_order: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type PremiumPurchase = {
  id: string;
  user_id: string;
  seeker_post_id: string | null;
  amount_cents: number;
  purchase_number: number;
  created_at: string;
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  immediately: 'Available Now',
  '2weeks': '2 Weeks Notice',
  '1month': '1 Month Notice',
  '3months': '3+ Months',
};

export const BASE_PREMIUM_PRICE_CENTS = 999;
export const PREMIUM_PRICE_INCREMENT_CENTS = 500;
export const PREMIUM_PRICE_MAX_CENTS = 9999;
export const PREMIUM_DURATION_DAYS = 30;

export async function getCurrentPremiumPriceCents(): Promise<number> {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const { count } = await supabase
    .from('premium_purchases')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthAgo.toISOString());
  const totalThisMonth = count ?? 0;
  const price = BASE_PREMIUM_PRICE_CENTS + PREMIUM_PRICE_INCREMENT_CENTS * totalThisMonth;
  return Math.min(price, PREMIUM_PRICE_MAX_CENTS);
}
