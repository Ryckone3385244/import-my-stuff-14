/**
 * Type definitions for Admin component
 */

import { Tables } from "@/integrations/supabase/types";

// Base table types from Supabase
export type Exhibitor = Tables<"exhibitors">;
export type Speaker = Tables<"speakers">;
export type ExhibitorProduct = Tables<"exhibitor_products">;
export type ExhibitorSocialMedia = Tables<"exhibitor_social_media">;
export type ExhibitorAddress = Tables<"exhibitor_address">;
export type ExhibitorSpeakerSubmission = Tables<"exhibitor_speaker_submissions">;
export type SpeakerSubmission = Tables<"speaker_submissions">;
export type ExhibitorSpeakerHeadshot = Tables<"exhibitor_speaker_headshots">;
export type ExhibitorAdvertSubmission = Tables<"exhibitor_advert_submissions">;

// Extended types with relations
export interface ExhibitorWithRelations extends Exhibitor {
  exhibitor?: { name: string };
}

export interface ProductWithRelations extends ExhibitorProduct {
  exhibitor?: { name: string; booth_number?: string | null };
}

export interface SocialMediaWithRelations extends ExhibitorSocialMedia {
  exhibitor?: { name: string };
}

export interface AddressWithRelations extends ExhibitorAddress {
  exhibitor?: { name: string };
}

export interface SpeakerSubmissionWithRelations extends ExhibitorSpeakerSubmission {
  exhibitor?: { id: string; name: string; booth_number?: string | null };
}

export interface SpeakerPortalSubmissionWithRelations extends SpeakerSubmission {
  speaker?: { id: string; name: string };
}

export interface HeadshotSubmissionWithRelations extends ExhibitorSpeakerHeadshot {
  exhibitor?: { id: string; name: string; booth_number?: string | null };
}

export interface AdvertSubmissionWithRelations extends ExhibitorAdvertSubmission {
  exhibitor?: { id: string; name: string; booth_number?: string | null };
}

// Change item types for approval management
export type ChangeItemType = "Company" | "Products" | "Social Media" | "Address" | "Speaker Form" | "Speaker Portal Form" | "Speaker Headshot" | "Advertisement";

export type ApprovalTableName = 
  | "exhibitors" 
  | "exhibitor_products" 
  | "exhibitor_social_media" 
  | "exhibitor_address" 
  | "exhibitor_speaker_submissions" 
  | "speaker_submissions" 
  | "exhibitor_speaker_headshots" 
  | "exhibitor_advert_submissions";

// Use intersection types to combine base properties with table types
export type ExhibitorChangeItem = Exhibitor & {
  type: "Company";
  table: "exhibitors";
  submitted_for_approval_at: string | null;
  pending_changes?: unknown;
};

export type ProductChangeItem = ProductWithRelations & {
  type: "Products";
  table: "exhibitor_products";
  submitted_for_approval_at: string | null;
  pending_changes?: unknown;
};

export type SocialMediaChangeItem = SocialMediaWithRelations & {
  type: "Social Media";
  table: "exhibitor_social_media";
  submitted_for_approval_at: string | null;
  pending_changes?: unknown;
};

export type AddressChangeItem = AddressWithRelations & {
  type: "Address";
  table: "exhibitor_address";
  submitted_for_approval_at: string | null;
  pending_changes?: unknown;
};

export type SpeakerFormChangeItem = SpeakerSubmissionWithRelations & {
  type: "Speaker Form";
  table: "exhibitor_speaker_submissions";
  submitted_for_approval_at: string | null;
};

export type SpeakerPortalFormChangeItem = SpeakerPortalSubmissionWithRelations & {
  type: "Speaker Portal Form";
  table: "speaker_submissions";
  submitted_for_approval_at: string | null;
};

export type HeadshotChangeItem = HeadshotSubmissionWithRelations & {
  type: "Speaker Headshot";
  table: "exhibitor_speaker_headshots";
  submitted_for_approval_at: string | null;
};

export type AdvertChangeItem = AdvertSubmissionWithRelations & {
  type: "Advertisement";
  table: "exhibitor_advert_submissions";
  submitted_for_approval_at: string | null;
};

export type ChangeItem = 
  | ExhibitorChangeItem 
  | ProductChangeItem 
  | SocialMediaChangeItem 
  | AddressChangeItem 
  | SpeakerFormChangeItem 
  | SpeakerPortalFormChangeItem 
  | HeadshotChangeItem 
  | AdvertChangeItem;

// Speaker extracted data from PDF parsing
export interface SpeakerExtractedData {
  name?: string;
  speaker_name?: string;
  bio?: string;
  speaker_bio?: string;
  title?: string;
  job_title?: string;
  company?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  contact_number?: string;
  linkedin_url?: string;
  seminar_title?: string;
  session_title?: string;
  seminar_description?: string;
  session_description?: string;
}

// Speaker with submissions for form tracking
export interface SpeakerWithSubmissions extends Speaker {
  speaker_submissions?: Array<{
    id: string;
    approval_status: string;
    created_at: string;
  }>;
}

// Exhibitor completion details
export interface ExhibitorCompletionData extends Exhibitor {
  exhibitor_contacts?: Array<{ id: string }>;
  exhibitor_products?: Array<{ id: string }>;
  exhibitor_social_media?: { id: string } | null;
  exhibitor_address?: { id: string } | null;
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
}

// CSV Import types
export interface ExhibitorCSVRow {
  "Company Name"?: string;
  "Booth Number"?: string;
  "Account Number"?: string;
  "Contact Name"?: string;
  "Contact Mobile"?: string;
  "Contact Email"?: string;
  "Address Street"?: string;
  "Address City"?: string;
  "Address Postcode"?: string;
  "Address Country"?: string;
  "Description"?: string;
  "Website"?: string;
  "Speaking Session"?: string;
  "Speaking Session Details"?: string;
  "Event Status"?: string;
  "Advertisement"?: string;
  "Advertisement Details"?: string;
  "Booth Length"?: string;
  "Booth Width"?: string;
  "Open Sides"?: string;
  "Stand Type"?: string;
}

export interface SpeakerCSVRow {
  "Name"?: string;
  "Bio"?: string;
  "Title"?: string;
  "Company"?: string;
  "Email"?: string;
  "Phone"?: string;
  "LinkedIn URL"?: string;
  "Seminar Title"?: string;
  "Seminar Description"?: string;
}

// User profile update data
export interface UserProfileUpdateData {
  display_name?: string;
  email?: string;
  phone?: string;
  meeting_url?: string;
  role_title?: string;
}
