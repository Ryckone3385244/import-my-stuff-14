import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to fetch data with error logging
async function fetchTable(supabase: any, tableName: string, options?: { 
  orderBy?: string; 
  ascending?: boolean;
  limit?: number;
}) {
  try {
    let query = supabase.from(tableName).select('*');
    
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      return { data: [], error: error.message };
    }
    
    console.log(`✓ Fetched ${data?.length || 0} rows from ${tableName}`);
    return { data: data || [], error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Exception fetching ${tableName}:`, errorMsg);
    return { data: [], error: errorMsg };
  }
}

// Helper to fetch paginated data for large tables
async function fetchPaginated(supabase: any, tableName: string, pageSize = 1000) {
  const allData: any[] = [];
  let page = 0;
  let hasMore = true;
  
  try {
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, to);
      
      if (error) {
        console.error(`Error fetching ${tableName} page ${page}:`, error.message);
        break;
      }
      
      if (data && data.length > 0) {
        allData.push(...data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✓ Fetched ${allData.length} total rows from ${tableName} (paginated)`);
    return { data: allData, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Exception fetching ${tableName}:`, errorMsg);
    return { data: allData, error: errorMsg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const fetchErrors: string[] = [];

  try {
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== Export Starting ===');
    console.log('SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓ Set' : '✗ Missing');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY - required for full data export' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('User authenticated:', user.email);

    // Check if user has admin privileges
    const { data: isAdminOrCSOrPM, error: adminError } = await supabaseClient.rpc('is_admin_or_cs_or_pm', { _user_id: user.id });
    if (adminError) {
      console.error('Admin check error:', adminError.message);
    }
    if (!isAdminOrCSOrPM) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Admin access verified');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const exportData: Record<string, any> = {
      project: {
        projectId: supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown',
        projectName: 'Event Management System',
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        version: '3.1'
      },
      users: {
        roles: [],
        profiles: []
      },
      mediaLibrary: [],
      tables: {
        speakers: [],
        exhibitors: [],
        suppliers: [],
        supplierFiles: [],
        agendaSessions: [],
        draftSessions: [],
        blogPosts: [],
        galleryPhotos: [],
        marketingTools: [],
        speakerSubmissions: [],
        registrations: [],
        supportTickets: []
      },
      theme: null,
      settings: {
        event: null,
        emailTemplates: [],
        emailDeadlines: [],
        customerManagers: [],
        globalHtmlSnippets: null
      },
      menus: {
        navbar: [],
        footer: [],
        portal: []
      },
      pages: [],
      // RAW TABLE EXPORTS - for fallback import when page matching fails
      rawTables: {
        page_content: [],
        page_section_order: [],
        section_column_order: []
      },
      storage: {
        buckets: [],
        policies: []
      },
      validation: {
        warnings: [],
        fetchErrors: [],
        checksums: {},
        exportedAt: new Date().toISOString(),
        schemaVersion: '3.1'
      },
      metadata: {
        tableCounts: {}
      }
    };

    // 1. Export Users & Roles
    console.log('\n--- Exporting Users ---');
    const { data: userRoles, error: rolesError } = await fetchTable(supabaseAdmin, 'user_roles');
    const { data: userProfiles, error: profilesError } = await fetchTable(supabaseAdmin, 'user_profiles');
    
    if (rolesError) fetchErrors.push(`user_roles: ${rolesError}`);
    if (profilesError) fetchErrors.push(`user_profiles: ${profilesError}`);
    
    exportData.users.roles = userRoles;
    exportData.users.profiles = userProfiles;
    exportData.metadata.tableCounts['user_roles'] = userRoles.length;
    exportData.metadata.tableCounts['user_profiles'] = userProfiles.length;

    // 2. Export Media Library with URL mappings for remapping after import
    console.log('\n--- Exporting Media Library ---');
    const { data: mediaItems, error: mediaError } = await fetchTable(supabaseAdmin, 'media_library', {
      orderBy: 'created_at',
      ascending: false
    });
    if (mediaError) fetchErrors.push(`media_library: ${mediaError}`);
    exportData.mediaLibrary = mediaItems;
    exportData.metadata.tableCounts['media_library'] = mediaItems.length;
    
    // Create URL mapping for media remapping after import
    // Maps file_name -> file_url so new project can remap URLs by filename
    exportData.mediaUrlMappings = mediaItems.map((item: any) => ({
      file_name: item.file_name,
      original_url: item.file_url,
      file_type: item.file_type,
      mime_type: item.mime_type
    }));
    console.log(`Created ${exportData.mediaUrlMappings.length} URL mappings for media remapping`);

    // 3. Export Tables
    console.log('\n--- Exporting Core Tables ---');
    
    // Speakers
    const { data: speakers, error: speakersError } = await fetchTable(supabaseAdmin, 'speakers', { orderBy: 'created_at' });
    if (speakersError) fetchErrors.push(`speakers: ${speakersError}`);
    exportData.tables.speakers = speakers;
    exportData.metadata.tableCounts['speakers'] = speakers.length;

    // Exhibitors with related data
    const { data: exhibitors, error: exhibitorsError } = await fetchTable(supabaseAdmin, 'exhibitors', { orderBy: 'created_at' });
    if (exhibitorsError) fetchErrors.push(`exhibitors: ${exhibitorsError}`);
    
    const { data: exhibitorContacts } = await fetchTable(supabaseAdmin, 'exhibitor_contacts');
    const { data: exhibitorProducts } = await fetchTable(supabaseAdmin, 'exhibitor_products');
    const { data: exhibitorSocial } = await fetchTable(supabaseAdmin, 'exhibitor_social_media');
    const { data: exhibitorAddress } = await fetchTable(supabaseAdmin, 'exhibitor_address');
    const { data: exhibitorSpeakerSubmissions } = await fetchTable(supabaseAdmin, 'exhibitor_speaker_submissions');
    const { data: advertSubmissions } = await fetchTable(supabaseAdmin, 'exhibitor_advert_submissions');
    const { data: headshotSubmissions } = await fetchTable(supabaseAdmin, 'exhibitor_speaker_headshots');
    const { data: exhibitorInquiries } = await fetchTable(supabaseAdmin, 'exhibitor_inquiries');
    
    exportData.tables.exhibitors = exhibitors.map((ex: any) => ({
      ...ex,
      contacts: exhibitorContacts.filter((c: any) => c.exhibitor_id === ex.id),
      products: exhibitorProducts.filter((p: any) => p.exhibitor_id === ex.id),
      socialMedia: exhibitorSocial.find((s: any) => s.exhibitor_id === ex.id) || null,
      address: exhibitorAddress.find((a: any) => a.exhibitor_id === ex.id) || null,
      speakerSubmissions: exhibitorSpeakerSubmissions.filter((s: any) => s.exhibitor_id === ex.id),
      advertSubmissions: advertSubmissions.filter((a: any) => a.exhibitor_id === ex.id),
      headshotSubmissions: headshotSubmissions.filter((h: any) => h.exhibitor_id === ex.id),
      inquiries: exhibitorInquiries.filter((i: any) => i.exhibitor_id === ex.id)
    }));
    exportData.metadata.tableCounts['exhibitors'] = exhibitors.length;

    // Suppliers
    const { data: suppliers } = await fetchTable(supabaseAdmin, 'show_suppliers', { orderBy: 'created_at' });
    const { data: supplierFiles } = await fetchTable(supabaseAdmin, 'supplier_files');
    exportData.tables.suppliers = suppliers;
    exportData.tables.supplierFiles = supplierFiles;
    exportData.metadata.tableCounts['show_suppliers'] = suppliers.length;
    exportData.metadata.tableCounts['supplier_files'] = supplierFiles.length;

    // Agenda Sessions
    const { data: sessions } = await fetchTable(supabaseAdmin, 'agenda_sessions', { orderBy: 'session_date' });
    const { data: sessionSpeakers } = await fetchTable(supabaseAdmin, 'session_speakers');
    
    exportData.tables.agendaSessions = sessions.map((session: any) => ({
      ...session,
      speakers: sessionSpeakers.filter((ss: any) => ss.session_id === session.id)
    }));
    exportData.metadata.tableCounts['agenda_sessions'] = sessions.length;

    // Draft Sessions - strip FKs that may not exist in target DB
    const { data: draftSessions } = await fetchTable(supabaseAdmin, 'draft_sessions');
    exportData.tables.draftSessions = draftSessions.map((ds: any) => ({
      ...ds,
      // Keep speaker_id for reference but mark published_session_id as nullable
      // Target DB may not have matching agenda_sessions
      _original_published_session_id: ds.published_session_id,
      published_session_id: null
    }));
    exportData.metadata.tableCounts['draft_sessions'] = draftSessions.length;

    // Speaker Submissions (standalone - not tied to exhibitors)
    const { data: standaloneSpeakerSubmissions } = await fetchTable(supabaseAdmin, 'speaker_submissions');
    exportData.tables.speakerSubmissions = standaloneSpeakerSubmissions.map((ss: any) => ({
      ...ss,
      reviewed_by: null // Clear user reference
    }));
    exportData.metadata.tableCounts['speaker_submissions'] = standaloneSpeakerSubmissions.length;

    // Blog Posts
    const { data: blogPosts } = await fetchTable(supabaseAdmin, 'blog_posts', { orderBy: 'created_at', ascending: false });
    exportData.tables.blogPosts = blogPosts;
    exportData.metadata.tableCounts['blog_posts'] = blogPosts.length;

    // Gallery Photos
    const { data: galleryPhotos } = await fetchTable(supabaseAdmin, 'gallery_photos', { orderBy: 'photo_order' });
    exportData.tables.galleryPhotos = galleryPhotos;
    exportData.metadata.tableCounts['gallery_photos'] = galleryPhotos.length;

    // Marketing Tools
    const { data: marketingTools } = await fetchTable(supabaseAdmin, 'marketing_tools');
    exportData.tables.marketingTools = marketingTools;
    exportData.metadata.tableCounts['marketing_tools'] = marketingTools.length;

    // Registrations
    console.log('Exporting registrations...');
    const { data: registrations, error: registrationsError } = await fetchTable(supabaseAdmin, 'registrations', { orderBy: 'created_at', ascending: false });
    if (registrationsError) fetchErrors.push(`registrations: ${registrationsError}`);
    exportData.tables.registrations = registrations;
    exportData.metadata.tableCounts['registrations'] = registrations.length;

    // Support Tickets
    console.log('Exporting support tickets...');
    const { data: supportTickets, error: supportTicketsError } = await fetchTable(supabaseAdmin, 'support_tickets');
    if (supportTicketsError) fetchErrors.push(`support_tickets: ${supportTicketsError}`);
    exportData.tables.supportTickets = supportTickets;
    exportData.metadata.tableCounts['support_tickets'] = supportTickets.length;

    // 4. Export Theme
    console.log('\n--- Exporting Theme ---');
    const { data: themeData, error: themeError } = await supabaseAdmin
      .from('website_styles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (themeError) fetchErrors.push(`website_styles: ${themeError.message}`);
    exportData.theme = themeData;
    exportData.metadata.tableCounts['website_styles'] = themeData ? 1 : 0;

    // 5. Export Settings
    console.log('\n--- Exporting Settings ---');
    const { data: eventSettings, error: eventError } = await supabaseAdmin
      .from('event_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eventError) fetchErrors.push(`event_settings: ${eventError.message}`);
    
    const { data: emailTemplates } = await fetchTable(supabaseAdmin, 'email_templates');
    const { data: emailDeadlines } = await fetchTable(supabaseAdmin, 'email_deadlines', { orderBy: 'deadline_order' });
    const { data: customerManagers } = await fetchTable(supabaseAdmin, 'customer_managers');
    
    const { data: htmlSnippets, error: snippetsError } = await supabaseAdmin
      .from('global_html_snippets')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snippetsError) fetchErrors.push(`global_html_snippets: ${snippetsError.message}`);
    
    exportData.settings.event = eventSettings;
    exportData.settings.emailTemplates = emailTemplates;
    exportData.settings.emailDeadlines = emailDeadlines;
    exportData.settings.customerManagers = customerManagers;
    exportData.settings.globalHtmlSnippets = htmlSnippets;
    exportData.metadata.tableCounts['event_settings'] = eventSettings ? 1 : 0;
    exportData.metadata.tableCounts['email_templates'] = emailTemplates.length;
    exportData.metadata.tableCounts['email_deadlines'] = emailDeadlines.length;
    exportData.metadata.tableCounts['customer_managers'] = customerManagers.length;
    exportData.metadata.tableCounts['global_html_snippets'] = htmlSnippets ? 1 : 0;

    // 6. Export Menus
    console.log('\n--- Exporting Menus ---');
    const { data: navbarItems } = await fetchTable(supabaseAdmin, 'navbar_menu_items', { orderBy: 'menu_order' });
    const { data: footerItems } = await fetchTable(supabaseAdmin, 'footer_menu_items', { orderBy: 'menu_order' });
    const { data: portalItems } = await fetchTable(supabaseAdmin, 'portal_menu_items', { orderBy: 'menu_order' });
    
    exportData.menus.navbar = navbarItems;
    exportData.menus.footer = footerItems;
    exportData.menus.portal = portalItems;
    exportData.metadata.tableCounts['navbar_menu_items'] = navbarItems.length;
    exportData.metadata.tableCounts['footer_menu_items'] = footerItems.length;
    exportData.metadata.tableCounts['portal_menu_items'] = portalItems.length;

    // 7. Export Pages with Content (using pagination for large tables)
    console.log('\n--- Exporting Pages & Content ---');
    const { data: websitePages } = await fetchTable(supabaseAdmin, 'website_pages', { orderBy: 'created_at' });
    
    // Use pagination for potentially large tables
    const { data: pageContent, error: contentError } = await fetchPaginated(supabaseAdmin, 'page_content');
    if (contentError) fetchErrors.push(`page_content: ${contentError}`);
    
    const { data: sectionOrder, error: sectionError } = await fetchPaginated(supabaseAdmin, 'page_section_order');
    if (sectionError) fetchErrors.push(`page_section_order: ${sectionError}`);
    
    const { data: columnOrder, error: columnError } = await fetchPaginated(supabaseAdmin, 'section_column_order');
    if (columnError) fetchErrors.push(`section_column_order: ${columnError}`);
    
    console.log(`Page content records: ${pageContent.length}`);
    console.log(`Section order records: ${sectionOrder.length}`);
    console.log(`Column order records: ${columnOrder.length}`);
    
    // Get all unique page names from content tables (these may differ from website_pages)
    const contentPageNames = new Set(pageContent.map((c: any) => c.page_name));
    const sectionPageNames = new Set(sectionOrder.map((s: any) => s.page_name));
    const columnPageNames = new Set(columnOrder.map((c: any) => c.page_name));
    const allPageNames = new Set([
      ...websitePages.map((p: any) => p.page_name),
      ...websitePages.map((p: any) => p.page_url?.replace(/^\//, '')), // Also match by URL slug
      ...contentPageNames,
      ...sectionPageNames,
      ...columnPageNames
    ]);
    
    console.log(`Found ${allPageNames.size} unique page names across all tables`);
    
    // Helper to normalize page name for matching - handles all variations
    const normalizePageName = (name: string) => {
      if (!name) return '';
      return name.toLowerCase().replace(/\s+/g, '-').replace(/^\//, '').replace(/-+/g, '-');
    };
    
    // Helper to check if two page names match (comparing normalized versions)
    const pageNamesMatch = (name1: string, name2: string) => {
      if (!name1 || !name2) return false;
      return normalizePageName(name1) === normalizePageName(name2);
    };
    
    // Build pages array including all pages with content
    const pagesWithContent: any[] = [];
    
    // First, process website_pages entries
    for (const page of websitePages) {
      const pageNameNormalized = normalizePageName(page.page_name);
      const pageUrlSlug = page.page_url?.replace(/^\//, '');
      
      // Match content using normalized comparison - this catches all format variations
      const pageSections = sectionOrder.filter((s: any) => 
        pageNamesMatch(s.page_name, page.page_name) || 
        pageNamesMatch(s.page_name, pageUrlSlug)
      );
      const allPageContent = pageContent.filter((c: any) => 
        pageNamesMatch(c.page_name, page.page_name) || 
        pageNamesMatch(c.page_name, pageUrlSlug)
      );
      const allPageColumns = columnOrder.filter((c: any) => 
        pageNamesMatch(c.page_name, page.page_name) || 
        pageNamesMatch(c.page_name, pageUrlSlug)
      );
      
      // Debug logging for pages with significant content
      if (allPageContent.length > 10 || pageNameNormalized.includes('food')) {
        console.log(`Page "${page.page_name}" (${pageUrlSlug}): ${allPageContent.length} content, ${pageSections.length} sections, ${allPageColumns.length} columns`);
      }
      
      pagesWithContent.push({
        ...page,
        sections: pageSections.map((section: any) => {
          // Remove the database 'id' field - use section_id as identifier
          const { id, ...sectionWithoutId } = section;
          return {
            ...sectionWithoutId,
            columns: allPageColumns.filter((c: any) => c.section_id === section.section_id).map((col: any) => {
              const { id: colId, ...colWithoutId } = col;
              return colWithoutId;
            }),
            // Use exact match for content - section_name should equal section_id
            content: allPageContent.filter((c: any) => c.section_name === section.section_id).map((cont: any) => {
              const { id: contId, ...contWithoutId } = cont;
              return contWithoutId;
            })
          };
        }),
        allContent: allPageContent.map((c: any) => {
          const { id, ...withoutId } = c;
          return withoutId;
        }),
        allColumns: allPageColumns.map((c: any) => {
          const { id, ...withoutId } = c;
          return withoutId;
        })
      });
    }
    
    // Then, add any pages that exist in content tables but not in website_pages
    const processedPageNames = new Set(websitePages.map((p: any) => normalizePageName(p.page_name)));
    const processedUrls = new Set(websitePages.map((p: any) => p.page_url?.replace(/^\//, '')));
    
    for (const pageName of contentPageNames) {
      const normalized = normalizePageName(pageName);
      if (!processedPageNames.has(normalized) && !processedUrls.has(normalized)) {
        // Use normalized matching for orphaned content pages too
        const pageSections = sectionOrder.filter((s: any) => pageNamesMatch(s.page_name, pageName));
        const allPageContent = pageContent.filter((c: any) => pageNamesMatch(c.page_name, pageName));
        const allPageColumns = columnOrder.filter((c: any) => pageNamesMatch(c.page_name, pageName));
        
        pagesWithContent.push({
          page_name: pageName,
          page_url: `/${normalized}`,
          is_active: true,
          status: 'published',
          _source: 'content_tables',
          sections: pageSections.map((section: any) => {
            const { id, ...sectionWithoutId } = section;
            return {
              ...sectionWithoutId,
              columns: allPageColumns.filter((c: any) => c.section_id === section.section_id).map((col: any) => {
                const { id: colId, ...colWithoutId } = col;
                return colWithoutId;
              }),
              content: allPageContent.filter((c: any) => c.section_name === section.section_id).map((cont: any) => {
                const { id: contId, ...contWithoutId } = cont;
                return contWithoutId;
              })
            };
          }),
          allContent: allPageContent.map((c: any) => {
            const { id, ...withoutId } = c;
            return withoutId;
          }),
          allColumns: allPageColumns.map((c: any) => {
            const { id, ...withoutId } = c;
            return withoutId;
          })
        });
        
        processedPageNames.add(normalized);
      }
    }
    
    exportData.pages = pagesWithContent;
    
    // RAW TABLE EXPORTS - complete dumps without page matching for fallback import
    // Strip IDs to avoid PK conflicts in target DB
    exportData.rawTables.page_content = pageContent.map((c: any) => {
      const { id, ...withoutId } = c;
      return withoutId;
    });
    exportData.rawTables.page_section_order = sectionOrder.map((s: any) => {
      const { id, ...withoutId } = s;
      return withoutId;
    });
    exportData.rawTables.section_column_order = columnOrder.map((c: any) => {
      const { id, ...withoutId } = c;
      return withoutId;
    });
    console.log(`Raw tables exported: ${pageContent.length} content, ${sectionOrder.length} sections, ${columnOrder.length} columns`);
    
    // Summary of content matched
    const totalContentMatched = pagesWithContent.reduce((sum: number, p: any) => sum + (p.allContent?.length || 0), 0);
    const totalColumnsMatched = pagesWithContent.reduce((sum: number, p: any) => sum + (p.allColumns?.length || 0), 0);
    const totalSectionsMatched = pagesWithContent.reduce((sum: number, p: any) => sum + (p.sections?.length || 0), 0);
    
    console.log(`Exported ${pagesWithContent.length} pages total`);
    console.log(`Content summary: ${totalContentMatched}/${pageContent.length} content, ${totalSectionsMatched}/${sectionOrder.length} sections, ${totalColumnsMatched}/${columnOrder.length} columns matched`);
    
    exportData.metadata.tableCounts['website_pages'] = websitePages.length;
    exportData.metadata.tableCounts['page_content'] = pageContent.length;
    exportData.metadata.tableCounts['page_section_order'] = sectionOrder.length;
    exportData.metadata.tableCounts['section_column_order'] = columnOrder.length;
    exportData.metadata.contentMatchSummary = {
      contentMatched: totalContentMatched,
      contentTotal: pageContent.length,
      sectionsMatched: totalSectionsMatched,
      sectionsTotal: sectionOrder.length,
      columnsMatched: totalColumnsMatched,
      columnsTotal: columnOrder.length
    };

    // 8. Export Storage Info (skip direct bucket query - use RPC instead)
    console.log('\n--- Exporting Storage Info ---');
    try {
      const { data: storagePolicies, error: policiesError } = await supabaseAdmin.rpc('get_storage_policies');
      if (policiesError) {
        console.error('Storage policies error:', policiesError.message);
        fetchErrors.push(`storage_policies: ${policiesError.message}`);
      } else {
        exportData.storage.policies = storagePolicies || [];
        exportData.metadata.tableCounts['storage_policies'] = storagePolicies?.length || 0;
      }
    } catch (err) {
      console.error('Storage policies exception:', err);
    }

    // 9. Validation & Warnings
    console.log('\n--- Running Validation ---');
    const warnings: string[] = [];
    
    const allUserIds = new Set([
      ...userRoles.map((r: any) => r.user_id),
      ...userProfiles.map((p: any) => p.user_id)
    ]);

    exhibitors.forEach((e: any) => {
      if (e.user_id && !allUserIds.has(e.user_id)) {
        warnings.push(`Exhibitor "${e.name}" references missing user ${e.user_id}`);
      }
    });
    
    speakers.forEach((s: any) => {
      if (s.user_id && !allUserIds.has(s.user_id)) {
        warnings.push(`Speaker "${s.name}" references missing user ${s.user_id}`);
      }
    });

    const totalRecords = Object.values(exportData.metadata.tableCounts).reduce((a: any, b: any) => a + b, 0);
    
    exportData.validation.warnings = warnings;
    exportData.validation.fetchErrors = fetchErrors;
    exportData.validation.checksums = {
      mediaCount: mediaItems.length,
      userRolesCount: userRoles.length,
      userProfilesCount: userProfiles.length,
      speakersCount: speakers.length,
      exhibitorsCount: exhibitors.length,
      pageContentCount: pageContent.length,
      totalRecords,
      totalWarnings: warnings.length,
      totalFetchErrors: fetchErrors.length
    };

    console.log('\n=== Export Complete ===');
    console.log('Table counts:', JSON.stringify(exportData.metadata.tableCounts, null, 2));
    console.log(`Validation: ${warnings.length} warnings, ${fetchErrors.length} fetch errors`);

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== Export Failed ===');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      fetchErrors 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
