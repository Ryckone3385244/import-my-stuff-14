import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Authorization header is present
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[AUTH] No Authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - No authorization header', 
        details: 'Please ensure you are logged in before importing' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[AUTH] Authorization header present, validating token...');

    // Use service role key to validate the token - bypasses client-side auth issues
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify user using the admin client to get user from JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      console.error('[AUTH] Token validation error:', userError.message);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Invalid token', 
        details: userError.message 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('[AUTH] No user found for token');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Session expired', 
        details: 'Please log in again' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[AUTH] User authenticated:', user.email);
    
    // Create a client with the user's auth for RLS-respecting queries
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if user has admin privileges
    const { data: isAdminOrCSOrPM } = await supabaseClient.rpc('is_admin_or_cs_or_pm', { _user_id: user.id });
    if (!isAdminOrCSOrPM) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { importData } = await req.json();

    if (!importData) {
      return new Response(JSON.stringify({ error: 'Invalid import data format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // supabaseAdmin already declared above for auth validation

    console.log('=== IMPORT FUNCTION v2.2 STARTING ===');
    
    // Validate import data structure immediately
    console.log('[VALIDATE] Import data keys:', Object.keys(importData));
    console.log('[VALIDATE] Has project:', !!importData.project);
    console.log('[VALIDATE] Has tables:', !!importData.tables);
    console.log('[VALIDATE] Has tables.speakers:', !!importData.tables?.speakers);
    console.log('[VALIDATE] Speakers count:', importData.tables?.speakers?.length || 0);
    console.log('[VALIDATE] Exhibitors count:', importData.tables?.exhibitors?.length || 0);
    console.log('[VALIDATE] Pages count:', importData.pages?.length || 0);

    const results: Record<string, any> = {
      imported: {},
      errors: {},
      skipped: [],
      warnings: [],
      orphanedReferences: [],
      dataValidation: {
        speakersInFile: importData.tables?.speakers?.length || 0,
        exhibitorsInFile: importData.tables?.exhibitors?.length || 0,
        pagesInFile: importData.pages?.length || 0,
        hasTheme: !!importData.theme,
        hasSettings: !!importData.settings
      },
      summary: {
        totalRecords: 0,
        successfulImports: 0,
        failedImports: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null
      }
    };

    // Helper function to sanitize user references - SET TO NULL to avoid FK violations
    const sanitizeUserReferences = (record: any, userIdFields: string[], tableName: string = 'unknown') => {
      const sanitized = { ...record };
      for (const field of userIdFields) {
        if (sanitized[field]) {
          console.log(`[SANITIZE] Setting ${tableName}.${field} to null (was: ${sanitized[field]})`);
          // Track as orphaned and SET TO NULL to avoid FK violations
          results.orphanedReferences.push({
            table: tableName,
            record_id: sanitized.id,
            original_user_id: sanitized[field],
            field
          });
          // CRITICAL: Set to null to avoid foreign key constraint errors
          sanitized[field] = null;
        }
      }
      return sanitized;
    };

    // Helper function to import table with error handling
    const importTable = async (tableName: string, data: any[]) => {
      if (!data || data.length === 0) {
        results.skipped.push(tableName);
        results.imported[tableName] = 0;
        return;
      }
      
      console.log(`Importing ${data.length} rows to ${tableName}...`);
      
      try {
        const { error } = await supabaseAdmin
          .from(tableName)
          .upsert(data, { onConflict: 'id', ignoreDuplicates: false });
        
        if (error) {
          console.error(`Error importing ${tableName}:`, error);
          results.errors[tableName] = error.message;
          results.imported[tableName] = 0;
          results.summary.failedImports++;
        } else {
          results.imported[tableName] = data.length;
          results.summary.successfulImports += data.length;
          console.log(`✓ Imported ${data.length} rows to ${tableName}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors[tableName] = errorMsg;
        results.imported[tableName] = 0;
        results.summary.failedImports++;
        console.error(`Exception importing ${tableName}:`, errorMsg);
      }
    };

    // Detect format (old flat format vs new structured format)
    const isNewFormat = importData.project && importData.mediaLibrary !== undefined;

    if (isNewFormat) {
      console.log('Detected new structured format (v3.0)');
      
      // Display export validation warnings
      if (importData.validation?.warnings?.length > 0) {
        results.warnings = importData.validation.warnings;
        console.warn(`Export contained ${importData.validation.warnings.length} validation warnings`);
      }

      // Import in correct dependency order
      
      // 1. Foundation - Theme & Settings (no dependencies)
      const upsertSingleton = async (tableName: string, record: any) => {
        if (!record) return;

        // Reuse the destination's latest row id when present to avoid creating duplicates on remix/import.
        const { data: existing, error } = await supabaseAdmin
          .from(tableName)
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn(`[SINGLETON] Could not read existing ${tableName} row:`, error.message);
        }

        const payload = { ...record, id: existing?.id ?? record.id };
        await importTable(tableName, [payload]);
      };

      await upsertSingleton('website_styles', importData.theme);
      await upsertSingleton('event_settings', importData.settings?.event);
      await upsertSingleton('global_html_snippets', importData.settings?.globalHtmlSnippets);

      // 2. SKIP User Roles - they reference auth.users which doesn't exist in target DB
      if (importData.users?.roles?.length) {
        console.log(`[SKIP] Skipping ${importData.users.roles.length} user_roles (FK to auth.users)`);
        results.warnings.push(`Skipped ${importData.users.roles.length} user_roles - users must be recreated in target database`);
        results.imported['user_roles'] = 0;
        // DO NOT import - just skip entirely
      }

      // SKIP user_profiles COMPLETELY - they have FK to auth.users which doesn't exist in target DB
      if (importData.users?.profiles?.length) {
        console.log(`[SKIP] Skipping ${importData.users.profiles.length} user_profiles (FK to auth.users)`);
        results.warnings.push(`Skipped ${importData.users.profiles.length} user_profiles - users must be recreated in target database`);
        results.imported['user_profiles'] = 0;
        // DO NOT import - just skip entirely
      }

      // 3. Media Library (set user references to NULL)
      if (importData.mediaLibrary?.length) {
        console.log(`[IMPORT] Sanitizing ${importData.mediaLibrary.length} media_library records`);
        const sanitizedMedia = importData.mediaLibrary.map((m: any) => 
          sanitizeUserReferences(m, ['uploaded_by'], 'media_library')
        );
        console.log(`[IMPORT] Importing sanitized media_library`);
        await importTable('media_library', sanitizedMedia);
      }

      // 4. Core Tables
      if (importData.tables?.speakers?.length) {
        console.log(`[IMPORT] Processing ${importData.tables.speakers.length} speakers`);
        const sanitizedSpeakers = importData.tables.speakers.map((s: any) => {
          const sanitized = sanitizeUserReferences(s, ['user_id'], 'speakers');
          console.log(`[SPEAKER] ${sanitized.name} (id: ${sanitized.id}, user_id set to: ${sanitized.user_id})`);
          return sanitized;
        });
        
        // Import speakers one by one to catch individual errors
        let speakerSuccessCount = 0;
        let speakerErrorCount = 0;
        for (const speaker of sanitizedSpeakers) {
          try {
            const { error } = await supabaseAdmin
              .from('speakers')
              .upsert([speaker], { onConflict: 'id', ignoreDuplicates: false });
            
            if (error) {
              console.error(`[SPEAKER ERROR] Failed to import ${speaker.name}:`, error.message);
              results.errors[`speaker_${speaker.id}`] = error.message;
              speakerErrorCount++;
            } else {
              console.log(`[SPEAKER SUCCESS] Imported ${speaker.name}`);
              speakerSuccessCount++;
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[SPEAKER EXCEPTION] ${speaker.name}:`, errorMsg);
            results.errors[`speaker_${speaker.id}`] = errorMsg;
            speakerErrorCount++;
          }
        }
        
        results.imported['speakers'] = speakerSuccessCount;
        if (speakerErrorCount > 0) {
          results.warnings.push(`${speakerErrorCount} speakers failed to import - check errors`);
        }
        console.log(`[IMPORT] Speakers complete: ${speakerSuccessCount} success, ${speakerErrorCount} failed`);
      } else {
        console.log('[IMPORT] No speakers found in import data');
        results.warnings.push('No speakers found in import data - check tables.speakers path');
      }

      if (importData.tables?.exhibitors?.length) {
        for (const exhibitor of importData.tables.exhibitors) {
          try {
            const { 
              contacts, products, socialMedia, address,
              speakerSubmissions, advertSubmissions, headshotSubmissions, inquiries,
              ...mainExhibitor 
            } = exhibitor;
            
            // Sanitize and import main exhibitor (set user_id to NULL)
            const sanitized = sanitizeUserReferences(mainExhibitor, ['user_id'], 'exhibitors');
            const { error: exError } = await supabaseAdmin
              .from('exhibitors')
              .upsert([sanitized], { onConflict: 'id', ignoreDuplicates: false });
            
            if (exError) {
              console.error('Error importing exhibitor:', exError);
              results.errors[`exhibitor_${exhibitor.id}`] = exError.message;
              continue;
            }

            // Import nested data
            if (contacts?.length) await supabaseAdmin.from('exhibitor_contacts').upsert(contacts, { onConflict: 'id' });
            if (products?.length) await supabaseAdmin.from('exhibitor_products').upsert(products, { onConflict: 'id' });
            if (socialMedia) await supabaseAdmin.from('exhibitor_social_media').upsert([socialMedia], { onConflict: 'id' });
            if (address) await supabaseAdmin.from('exhibitor_address').upsert([address], { onConflict: 'id' });
            if (speakerSubmissions?.length) await supabaseAdmin.from('exhibitor_speaker_submissions').upsert(speakerSubmissions, { onConflict: 'id' });
            if (advertSubmissions?.length) await supabaseAdmin.from('exhibitor_advert_submissions').upsert(advertSubmissions, { onConflict: 'id' });
            if (headshotSubmissions?.length) await supabaseAdmin.from('exhibitor_speaker_headshots').upsert(headshotSubmissions, { onConflict: 'id' });
            if (inquiries?.length) await supabaseAdmin.from('exhibitor_inquiries').upsert(inquiries, { onConflict: 'id' });
          } catch (error) {
            console.error('Error importing exhibitor data:', error);
          }
        }
        results.imported['exhibitors'] = importData.tables.exhibitors.length;
      }

      if (importData.tables?.suppliers?.length) {
        await importTable('show_suppliers', importData.tables.suppliers);
      }

      if (importData.tables?.supplierFiles?.length) {
        await importTable('supplier_files', importData.tables.supplierFiles);
      }

      // 5. Sessions (depends on speakers)
      if (importData.tables?.agendaSessions?.length) {
        for (const session of importData.tables.agendaSessions) {
          try {
            const { speakers, ...mainSession } = session;
            await supabaseAdmin.from('agenda_sessions').upsert([mainSession], { onConflict: 'id' });
            if (speakers?.length) await supabaseAdmin.from('session_speakers').upsert(speakers, { onConflict: 'id' });
          } catch (error) {
            console.error('Error importing session:', error);
          }
        }
        results.imported['agenda_sessions'] = importData.tables.agendaSessions.length;
      }

      // Draft Sessions - handle FK to speakers and agenda_sessions carefully
      if (importData.tables?.draftSessions?.length) {
        console.log(`[IMPORT] Processing ${importData.tables.draftSessions.length} draft_sessions`);
        // published_session_id should already be null from export, speaker_id may fail if speaker not imported
        const sanitizedDraftSessions = importData.tables.draftSessions.map((ds: any) => ({
          ...ds,
          published_session_id: null // Always null to avoid FK violation
        }));
        await importTable('draft_sessions', sanitizedDraftSessions);
      }

      // Speaker Submissions (standalone - not tied to exhibitors)
      if (importData.tables?.speakerSubmissions?.length) {
        console.log(`[IMPORT] Processing ${importData.tables.speakerSubmissions.length} speaker_submissions`);
        const sanitizedSubmissions = importData.tables.speakerSubmissions.map((ss: any) => 
          sanitizeUserReferences(ss, ['reviewed_by'], 'speaker_submissions')
        );
        await importTable('speaker_submissions', sanitizedSubmissions);
      }

      // 6. Other Settings
      if (importData.settings?.emailTemplates?.length) {
        await importTable('email_templates', importData.settings.emailTemplates);
      }

      if (importData.settings?.emailDeadlines?.length) {
        await importTable('email_deadlines', importData.settings.emailDeadlines);
      }

      if (importData.settings?.customerManagers?.length) {
        await importTable('customer_managers', importData.settings.customerManagers);
      }

      // 7. Content
      if (importData.tables?.blogPosts?.length) {
        const sanitizedPosts = importData.tables.blogPosts.map((p: any) => 
          sanitizeUserReferences(p, ['author_id'], 'blog_posts')
        );
        await importTable('blog_posts', sanitizedPosts);
      }

      if (importData.tables?.galleryPhotos?.length) {
        await importTable('gallery_photos', importData.tables.galleryPhotos);
      }

      if (importData.tables?.marketingTools?.length) {
        await importTable('marketing_tools', importData.tables.marketingTools);
      }

      // Registrations
      if (importData.tables?.registrations?.length) {
        console.log(`[IMPORT] Processing ${importData.tables.registrations.length} registrations`);
        await importTable('registrations', importData.tables.registrations);
      }

      // Support Tickets (depends on exhibitors)
      if (importData.tables?.supportTickets?.length) {
        console.log(`[IMPORT] Processing ${importData.tables.supportTickets.length} support_tickets`);
        await importTable('support_tickets', importData.tables.supportTickets);
      }

      // 8. Import Pages with Content
      if (importData.pages?.length) {
        console.log(`[IMPORT] Importing ${importData.pages.length} pages with content...`);
        
        for (const page of importData.pages) {
          try {
            const { sections, allContent, allColumns, ...mainPage } = page;
            
            // Import main page
            const { error: pageError } = await supabaseAdmin
              .from('website_pages')
              .upsert([mainPage], { onConflict: 'id', ignoreDuplicates: false });
            
            if (pageError) {
              console.error('Error importing page:', pageError);
              results.errors[`page_${page.page_name}`] = pageError.message;
              continue;
            }

            // Import ALL content for this page (from allContent if available, fallback to sections)
            if (allContent?.length) {
              console.log(`[IMPORT] Importing ${allContent.length} content items for ${page.page_name}`);
              // Strip 'id' from content records to avoid PK conflicts - use unique constraint instead
              const contentWithoutIds = allContent.map((c: any) => {
                const { id, ...rest } = c;
                return rest;
              });
              const { error: contentError } = await supabaseAdmin
                .from('page_content')
                .upsert(contentWithoutIds, { onConflict: 'page_name,section_name,content_key', ignoreDuplicates: false });
              if (contentError) {
                console.error(`Error importing content for ${page.page_name}:`, contentError);
                results.errors[`page_content_${page.page_name}`] = contentError.message;
              }
            }

            // Import ALL columns for this page (from allColumns if available)
            if (allColumns?.length) {
              console.log(`[IMPORT] Importing ${allColumns.length} columns for ${page.page_name}`);
              // Strip 'id' from column records to avoid PK conflicts - use unique constraint instead
              const columnsWithoutIds = allColumns.map((c: any) => {
                const { id, ...rest } = c;
                return rest;
              });
              const { error: columnError } = await supabaseAdmin
                .from('section_column_order')
                .upsert(columnsWithoutIds, { onConflict: 'page_name,section_id,column_id', ignoreDuplicates: false });
              if (columnError) {
                console.error(`Error importing columns for ${page.page_name}:`, columnError);
                results.errors[`columns_${page.page_name}`] = columnError.message;
              }
            }

            // Import sections
            if (sections?.length) {
              console.log(`[IMPORT] Processing ${sections.length} sections for ${page.page_name}`);
              for (const section of sections) {
                // Destructure to remove database id and nested data
                const { columns, content, id: dbId, ...mainSection } = section;
                
                // Ensure mainSection doesn't have id field
                if ('id' in mainSection) {
                  delete (mainSection as any).id;
                }
                
                // Import section order - use unique constraint
                const { error: sectionError } = await supabaseAdmin
                  .from('page_section_order')
                  .upsert([mainSection], { onConflict: 'page_name,section_id', ignoreDuplicates: false });
                
                if (sectionError) {
                  console.error(`[SECTION ERROR] ${page.page_name}/${section.section_id}:`, sectionError.message);
                }
                
                // Import columns from section (only if allColumns not already imported)
                if (!allColumns && columns?.length) {
                  const colsWithoutIds = columns.map((c: any) => {
                    const { id, ...rest } = c;
                    return rest;
                  });
                  await supabaseAdmin
                    .from('section_column_order')
                    .upsert(colsWithoutIds, { onConflict: 'page_name,section_id,column_id', ignoreDuplicates: false });
                }
                
                // Import content from section (only if allContent not already imported)
                if (!allContent && content?.length) {
                  const contWithoutIds = content.map((c: any) => {
                    const { id, ...rest } = c;
                    return rest;
                  });
                  await supabaseAdmin
                    .from('page_content')
                    .upsert(contWithoutIds, { onConflict: 'page_name,section_name,content_key', ignoreDuplicates: false });
                }
              }
            }
          } catch (error) {
            console.error('Error importing page structure:', error);
          }
        }
        results.imported['website_pages'] = importData.pages.length;
      }

      // 9. Import Menus - TWO-PHASE import to preserve parent-child hierarchy
      if (importData.menus) {
        for (const [menuType, items] of Object.entries(importData.menus)) {
          const tableName = `${menuType}_menu_items`;
          if (Array.isArray(items) && items.length > 0) {
            console.log(`[IMPORT] Two-phase menu import for ${tableName} (${items.length} items)`);
            
            // Build mapping of old_id -> item data for hierarchy restoration
            const oldIdToItem: Record<string, any> = {};
            for (const item of items) {
              oldIdToItem[item.id] = item;
            }
            
            // PHASE 1: Insert all items with parent_id = null, track old_id -> new_id mapping
            const oldIdToNewId: Record<string, string> = {};
            
            for (const item of items) {
              const { id: oldId, parent_id, ...rest } = item;
              // Insert with parent_id = null initially
              const insertData = { ...rest, parent_id: null };
              
              const { data: insertedRow, error } = await supabaseAdmin
                .from(tableName)
                .insert([insertData])
                .select('id')
                .single();
              
              if (error) {
                console.error(`[MENU PHASE 1] Error inserting ${tableName} item "${item.label}":`, error.message);
              } else if (insertedRow) {
                oldIdToNewId[oldId] = insertedRow.id;
                console.log(`[MENU PHASE 1] Inserted "${item.label}" -> new_id: ${insertedRow.id}`);
              }
            }
            
            // PHASE 2: Update parent_id to restore hierarchy
            let hierarchyUpdates = 0;
            for (const item of items) {
              if (item.parent_id && oldIdToNewId[item.id]) {
                const newParentId = oldIdToNewId[item.parent_id];
                if (newParentId) {
                  const { error: updateError } = await supabaseAdmin
                    .from(tableName)
                    .update({ parent_id: newParentId })
                    .eq('id', oldIdToNewId[item.id]);
                  
                  if (updateError) {
                    console.error(`[MENU PHASE 2] Error updating parent for "${item.label}":`, updateError.message);
                  } else {
                    hierarchyUpdates++;
                    console.log(`[MENU PHASE 2] Restored hierarchy: "${item.label}" -> parent: ${newParentId}`);
                  }
                } else {
                  console.warn(`[MENU PHASE 2] Parent not found for "${item.label}" (old parent_id: ${item.parent_id})`);
                }
              }
            }
            
            console.log(`[IMPORT] ${tableName}: ${Object.keys(oldIdToNewId).length} inserted, ${hierarchyUpdates} parent relationships restored`);
            results.imported[tableName] = Object.keys(oldIdToNewId).length;
          }
        }
      }

      // 10. Fallback: Import raw content tables if page-based import missed content
      if (importData.rawTables) {
        console.log('[IMPORT] Checking for raw table fallback import...');
        
        // Check if page-based import got all content
        const importedContentCount = Object.entries(results.imported)
          .filter(([k]) => k.startsWith('page_content'))
          .reduce((sum, [, v]) => sum + (v as number), 0);
        
        if (importData.rawTables.page_content?.length && importedContentCount < importData.rawTables.page_content.length / 2) {
          console.log(`[IMPORT] Using raw table fallback for page_content (${importData.rawTables.page_content.length} records)`);
          const { error } = await supabaseAdmin
            .from('page_content')
            .upsert(importData.rawTables.page_content, { onConflict: 'page_name,section_name,content_key', ignoreDuplicates: false });
          if (error) {
            console.error('Raw page_content import error:', error.message);
          } else {
            results.imported['page_content_raw'] = importData.rawTables.page_content.length;
          }
        }
        
        if (importData.rawTables.page_section_order?.length) {
          console.log(`[IMPORT] Using raw table fallback for page_section_order (${importData.rawTables.page_section_order.length} records)`);
          const { error } = await supabaseAdmin
            .from('page_section_order')
            .upsert(importData.rawTables.page_section_order, { onConflict: 'page_name,section_id', ignoreDuplicates: false });
          if (error) {
            console.error('Raw page_section_order import error:', error.message);
          } else {
            results.imported['page_section_order_raw'] = importData.rawTables.page_section_order.length;
          }
        }
        
        if (importData.rawTables.section_column_order?.length) {
          console.log(`[IMPORT] Using raw table fallback for section_column_order (${importData.rawTables.section_column_order.length} records)`);
          const { error } = await supabaseAdmin
            .from('section_column_order')
            .upsert(importData.rawTables.section_column_order, { onConflict: 'page_name,section_id,column_id', ignoreDuplicates: false });
          if (error) {
            console.error('Raw section_column_order import error:', error.message);
          } else {
            results.imported['section_column_order_raw'] = importData.rawTables.section_column_order.length;
          }
        }
      }

      // 11. Storage Policies - SKIPPED for security reasons
      // Dynamic SQL execution (exec_sql) has been removed to prevent SQL injection attacks
      // Storage buckets and policies must be configured manually in the target project
      if (importData.storage?.policies?.length) {
        console.log(`[IMPORT] Skipping ${importData.storage.policies.length} storage policies (security restriction)`);
        results.warnings.push('Storage policies cannot be automatically imported for security reasons. Storage buckets and their policies must be configured manually in the target project.');
        results.skipped.push('storage_policies');
      }

    } else {
      // Old format - backward compatibility
      console.log('Detected old flat format, using legacy import...');
      
      const importOrder = [
        'event_settings',
        'website_styles',
        'website_pages',
        'email_templates',
        'email_deadlines',
        'customer_managers',
        'exhibitors',
        'exhibitor_contacts',
        'exhibitor_products',
        'exhibitor_social_media',
        'exhibitor_address',
        'speakers',
        'agenda_sessions',
        'session_speakers',
        'blog_posts',
        'show_suppliers',
        'gallery_photos',
        'page_content',
        'page_section_order',
        'section_column_order',
        'navbar_menu_items',
        'footer_menu_items',
        'portal_menu_items',
        'media_library'
      ];

      for (const table of importOrder) {
        const tableData = importData.data?.[table];
        
        if (!tableData || tableData.length === 0) {
          console.log(`Skipping ${table} (no data)`);
          results.imported[table] = 0;
          results.skipped.push(table);
          continue;
        }

        console.log(`Importing ${tableData.length} rows to ${table}...`);

        try {
          const { error } = await supabaseAdmin
            .from(table)
            .upsert(tableData, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Error importing ${table}:`, error.message, error.details, error.hint);
            results.errors[table] = `${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` - ${error.hint}` : ''}`;
            results.imported[table] = 0;
          } else {
            results.imported[table] = tableData.length;
            console.log(`Successfully imported ${tableData.length} rows to ${table}`);
          }
        } catch (error) {
          console.error(`Exception importing ${table}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          results.errors[table] = errorMessage;
          results.imported[table] = 0;
        }
      }
    }

    // Finalize summary
    results.summary.endTime = new Date().toISOString();
    const start = new Date(results.summary.startTime);
    const end = new Date(results.summary.endTime);
    results.summary.duration = `${((end.getTime() - start.getTime()) / 1000).toFixed(2)}s`;
    results.summary.totalRecords = Object.values(results.imported).reduce((a: any, b: any) => a + b, 0);

    console.log('Import completed');
    console.log('Summary:', results.summary);
    console.log('Imported:', results.imported);
    console.log('Errors:', Object.keys(results.errors).length);
    console.log('Warnings:', results.warnings.length);
    console.log('Orphaned references:', results.orphanedReferences.length);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
