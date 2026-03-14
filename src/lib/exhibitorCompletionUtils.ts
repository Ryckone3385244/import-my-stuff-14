import { supabase } from "@/integrations/supabase/client";

export interface CompletionResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
}

export interface CompletionCheck {
  id: string;
  label: string;
  completed: boolean;
}

/**
 * Single source of truth for completion checks
 * Used by both admin and portal to ensure consistency
 */
function buildCompletionChecks(exhibitor: Record<string, unknown>): CompletionCheck[] {
  // Handle both array and object format for one-to-one relations
  const addressData = Array.isArray(exhibitor?.exhibitor_address)
    ? exhibitor.exhibitor_address[0]
    : exhibitor?.exhibitor_address;
  
  const socialData = Array.isArray(exhibitor?.exhibitor_social_media)
    ? exhibitor.exhibitor_social_media[0]
    : exhibitor?.exhibitor_social_media;

  // Check if data is approved (not pending or rejected)
  const isApproved = (status: string | null | undefined) => {
    return !status || status === 'approved';
  };

  // Type guard for pending changes object
  const isPendingChangesObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };

  // Check address completion (actual fields OR pending_changes)
  // Counts as complete if data exists, even if pending approval (exhibitor has submitted it)
  const pendingAddressChanges = isPendingChangesObject((addressData as Record<string, unknown>)?.pending_changes)
    ? (addressData as Record<string, unknown>).pending_changes as Record<string, unknown>
    : null;

  const hasAddress = !!(
    (addressData as Record<string, unknown>)?.street_line_1 &&
    (addressData as Record<string, unknown>)?.city &&
    (addressData as Record<string, unknown>)?.postcode &&
    (addressData as Record<string, unknown>)?.country
  ) || !!(
    pendingAddressChanges?.street_line_1 &&
    pendingAddressChanges?.city &&
    pendingAddressChanges?.postcode &&
    pendingAddressChanges?.country
  );

  // Check social media completion (actual fields OR pending_changes)
  // Counts as complete if data exists, even if pending approval (exhibitor has submitted it)
  const pendingSocialChanges = isPendingChangesObject((socialData as Record<string, unknown>)?.pending_changes)
    ? (socialData as Record<string, unknown>).pending_changes as Record<string, unknown>
    : null;

  const hasSocial = !!(
    (socialData as Record<string, unknown>)?.facebook ||
    (socialData as Record<string, unknown>)?.instagram ||
    (socialData as Record<string, unknown>)?.linkedin ||
    (socialData as Record<string, unknown>)?.tiktok ||
    (socialData as Record<string, unknown>)?.youtube
  ) || !!(
    pendingSocialChanges?.facebook ||
    pendingSocialChanges?.instagram ||
    pendingSocialChanges?.linkedin ||
    pendingSocialChanges?.tiktok ||
    pendingSocialChanges?.youtube
  );

  // Check if products exist (either approved OR pending - exhibitor has submitted them)
  const products = exhibitor?.exhibitor_products as Array<Record<string, unknown>> | undefined;
  const hasProducts = products?.some((p) => {
    // Product is complete if it has approved data OR has pending changes
    const hasApprovedData = isApproved(p.approval_status as string) && p.product_name;
    const hasPendingData = isPendingChangesObject(p.pending_changes) && 
      (p.pending_changes as Record<string, unknown>).product_name;
    return hasApprovedData || hasPendingData || 
      // Also count products that are pending approval but have the product_name field
      (p.approval_status === 'pending_approval' && p.product_name);
  });

  // Check if contacts exist (either approved OR pending - exhibitor has submitted them)
  const contacts = exhibitor?.exhibitor_contacts as Array<Record<string, unknown>> | undefined;
  const hasContacts = contacts?.some((c) => {
    // Contact is complete if it has approved data OR has pending changes
    const hasApprovedData = isApproved(c.approval_status as string) && (c.first_name || c.email);
    const hasPendingData = isPendingChangesObject(c.pending_changes) && 
      ((c.pending_changes as Record<string, unknown>).first_name || (c.pending_changes as Record<string, unknown>).email);
    return hasApprovedData || hasPendingData ||
      // Also count contacts that are pending approval but have identifying info
      (c.approval_status === 'pending_approval' && (c.first_name || c.email));
  });

  // Get pending changes for main exhibitor record
  const pendingExhibitorChanges = isPendingChangesObject(exhibitor?.pending_changes)
    ? exhibitor.pending_changes as Record<string, unknown>
    : null;

  // Check if a field has a value (either in actual field OR in pending_changes)
  const hasFieldValue = (fieldName: string, validator?: (value: unknown) => boolean): boolean => {
    const actualValue = exhibitor?.[fieldName];
    const pendingValue = pendingExhibitorChanges?.[fieldName];
    
    // Check actual value
    const actualValid = validator ? validator(actualValue) : !!actualValue;
    // Check pending value  
    const pendingValid = validator ? validator(pendingValue) : !!pendingValue;
    
    return actualValid || pendingValid;
  };

  // Field is completed if it has a value (either actual or pending) AND record is approved/not pending
  // For pending records, we still count the field as complete if it has a value submitted
  const isFieldCompleted = (fieldName: string, validator?: (value: unknown) => boolean): boolean => {
    const hasValue = hasFieldValue(fieldName, validator);
    
    // If the field doesn't have a value at all, it's not complete
    if (!hasValue) {
      return false;
    }
    
    // If the field has a value (either actual or in pending_changes), consider it complete
    // This allows the completion percentage to increase when files are uploaded,
    // even if they're still pending approval
    return true;
  };

  return [
    { 
      id: 'logo', 
      label: 'Company Logo', 
      completed: isFieldCompleted('logo_url')
    },
    { 
      id: 'profile', 
      label: 'Company Profile', 
      completed: isFieldCompleted('description', (val) => typeof val === 'string' && val.length > 50)
    },
    { 
      id: 'website', 
      label: 'Website URL', 
      completed: isFieldCompleted('website')
    },
    { id: 'address', label: 'Company Address', completed: hasAddress },
    { id: 'social', label: 'Social Media Links', completed: hasSocial },
    { id: 'contacts', label: 'Contact Information', completed: !!hasContacts },
    { id: 'products', label: 'Products/Services', completed: !!hasProducts },
    { 
      id: 'showguide', 
      label: 'Showguide Listing', 
      completed: isFieldCompleted('short_description', (val) => typeof val === 'string' && val.length > 20)
    },
  ];
}

/**
 * Calculate exhibitor profile completion percentage from exhibitor object
 * This synchronous version is for display purposes in lists and admin
 * Now includes conditional checks for speaker/advert submissions to match portal logic
 */
export function calculateExhibitorCompletionSync(exhibitor: Record<string, unknown>): CompletionResult {
  const checks = buildCompletionChecks(exhibitor);
  
  // Add conditional checks based on exhibitor's selections (matching portal logic)
  const conditionalChecks: boolean[] = [];
  
  // Check if speaker submission is required and completed (only when a submission exists AND it has been approved)
  if (exhibitor?.speaking_session) {
    const speakerSubmissions = exhibitor?.exhibitor_speaker_submissions as unknown[] | undefined;
    const hasSpeakerSubmission = (
      speakerSubmissions &&
      speakerSubmissions.length > 0 &&
      exhibitor?.speaker_submission_approved === true
    );
    
    const speakerHeadshots = exhibitor?.exhibitor_speaker_headshots as unknown[] | undefined;
    const hasHeadshotSubmission = (
      speakerHeadshots &&
      speakerHeadshots.length > 0 &&
      exhibitor?.headshot_submission_approved === true
    );
    
    conditionalChecks.push(hasSpeakerSubmission);
    conditionalChecks.push(hasHeadshotSubmission);
  }
  
  // Check if advertisement submission is required and completed (only when a submission exists AND it has been approved)
  if (exhibitor?.advertisement) {
    const advertSubmissions = exhibitor?.exhibitor_advert_submissions as unknown[] | undefined;
    const hasAdvertSubmission = (
      advertSubmissions &&
      advertSubmissions.length > 0 &&
      exhibitor?.advert_submission_approved === true
    );
    
    conditionalChecks.push(hasAdvertSubmission);
  }
  
  const baseCompletedCount = checks.filter((check) => check.completed).length;
  const conditionalCompletedCount = conditionalChecks.filter((check) => check).length;
  const completedCount = baseCompletedCount + conditionalCompletedCount;
  const totalCount = checks.length + conditionalChecks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return { percentage, completedCount, totalCount };
}

/**
 * Get detailed completion checks for an exhibitor
 * Used by the portal to show individual field statuses
 */
export function getExhibitorCompletionChecks(exhibitor: Record<string, unknown>): CompletionCheck[] {
  return buildCompletionChecks(exhibitor);
}

/**
 * Calculate exhibitor profile completion percentage (async - fetches submission data)
 * This is for when you need to include optional submissions in the calculation
 */
export async function calculateExhibitorCompletion(
  exhibitorId: string
): Promise<CompletionResult> {
  try {
    // Fetch exhibitor data with related tables
    const { data: exhibitor, error: exhibitorError } = await supabase
      .from("exhibitors")
      .select(`
        *,
        exhibitor_address(*),
        exhibitor_social_media(*),
        exhibitor_contacts(*),
        exhibitor_products(*)
      `)
      .eq("id", exhibitorId)
      .maybeSingle();

    if (exhibitorError || !exhibitor) {
      console.error("Error fetching exhibitor:", exhibitorError);
      return { percentage: 0, completedCount: 0, totalCount: 0 };
    }

    // Fetch event settings to check conditional requirements
    const { data: eventSettings, error: eventError } = await supabase
      .from("event_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (eventError) {
      console.error("Error fetching event settings:", eventError);
    }

    // Fetch submissions
    const { data: speakerSubmission } = await supabase
      .from("exhibitor_speaker_submissions")
      .select("*")
      .eq("exhibitor_id", exhibitorId)
      .maybeSingle();

    const { data: headshotSubmission } = await supabase
      .from("exhibitor_speaker_headshots")
      .select("*")
      .eq("exhibitor_id", exhibitorId)
      .maybeSingle();

    const { data: advertSubmission } = await supabase
      .from("exhibitor_advert_submissions")
      .select("*")
      .eq("exhibitor_id", exhibitorId)
      .maybeSingle();

    // Build completion checks array
    // Handle both array and object format for one-to-one relations
    const addressData = Array.isArray(exhibitor.exhibitor_address)
      ? exhibitor.exhibitor_address[0]
      : exhibitor.exhibitor_address;
    const socialData = Array.isArray(exhibitor.exhibitor_social_media)
      ? exhibitor.exhibitor_social_media[0]
      : exhibitor.exhibitor_social_media;

    const checks: boolean[] = [
      !!exhibitor.logo_url,
      !!(exhibitor.description && exhibitor.description.length > 50),
      !!exhibitor.website,
      !!(
        addressData?.street_line_1 &&
        addressData?.city &&
        addressData?.postcode &&
        addressData?.country
      ),
      !!(
        socialData?.facebook ||
        socialData?.instagram ||
        socialData?.linkedin ||
        socialData?.tiktok ||
        socialData?.youtube
      ),
      !!(exhibitor.exhibitor_contacts && exhibitor.exhibitor_contacts.length > 0),
      !!(exhibitor.exhibitor_products && exhibitor.exhibitor_products.length > 0),
      !!(exhibitor.showguide_entry && exhibitor.showguide_entry.length > 20),
    ];

    // Add conditional checks based on exhibitor's selections (check both submission existence AND approval flags)
    if (exhibitor.speaking_session) {
      checks.push(!!speakerSubmission || exhibitor.speaker_submission_approved === true);
      checks.push(!!headshotSubmission || exhibitor.headshot_submission_approved === true);
    }

    if (exhibitor.advertisement) {
      checks.push(!!advertSubmission || exhibitor.advert_submission_approved === true);
    }

    const completedCount = checks.filter((check) => check).length;
    const totalCount = checks.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return { percentage, completedCount, totalCount };
  } catch (error) {
    console.error("Error calculating exhibitor completion:", error);
    return { percentage: 0, completedCount: 0, totalCount: 0 };
  }
}

/**
 * Calculate speaker profile completion percentage
 * Speakers created via bulk upload are considered to have their form completed
 */
export function calculateSpeakerCompletion(speaker: Record<string, unknown>): CompletionResult {
  // Align completion with the status dots in the Admin speakers table
  const checks = [
    !!(speaker?.photo_url as string), // Photo
    !!(speaker?.bio as string && (speaker.bio as string).length > 50), // Bio (same threshold as UI)
    !!(speaker?.title as string), // Title
    !!(speaker?.company as string), // Company
    !!(speaker?.company_logo_url as string), // Company logo
    !!(speaker?.linkedin_url as string), // LinkedIn
    !!(speaker?.seminar_title as string), // Seminar title
    !!(speaker?.seminar_description as string), // Seminar description
  ];

  // Add speaker form submission check if speaker_submissions data is included
  const speakerSubmissions = speaker?.speaker_submissions as Array<Record<string, unknown>> | undefined;
  
  // Form is considered complete if:
  // 1. There's an approved submission, OR
  // 2. The speaker was created via bulk upload (has essential fields filled = bio + seminar_title)
  const hasApprovedSubmission = speakerSubmissions?.some(
    (sub) => sub.approval_status === 'approved'
  );
  
  // Consider form complete if speaker has both bio and seminar_title (likely from bulk upload)
  const wasBulkUploaded = !!(speaker?.bio as string) && !!(speaker?.seminar_title as string);
  
  // Only add form check if we have submission data OR if they were bulk uploaded
  if (speakerSubmissions && Array.isArray(speakerSubmissions)) {
    checks.push(hasApprovedSubmission || wasBulkUploaded);
  } else if (wasBulkUploaded) {
    // If no submission data but has bulk upload indicators, consider form complete
    checks.push(true);
  }

  const completedCount = checks.filter((check) => check).length;
  const totalCount = checks.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return { percentage, completedCount, totalCount };
}
