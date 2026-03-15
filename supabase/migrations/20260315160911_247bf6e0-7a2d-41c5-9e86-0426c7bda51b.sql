
-- PART 5B: Remaining RLS policies

-- exhibitor_speaker_submissions
CREATE POLICY "Admins, CS, and PM can view all speaker submissions" ON public.exhibitor_speaker_submissions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert exhibitor speaker submissions" ON public.exhibitor_speaker_submissions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete speaker submissions" ON public.exhibitor_speaker_submissions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY admin_cs_pm_update_exhibitor_speaker_submissions ON public.exhibitor_speaker_submissions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can view their own speaker submissions" ON public.exhibitor_speaker_submissions FOR SELECT TO authenticated USING (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));
CREATE POLICY "Exhibitors can insert their own speaker submissions" ON public.exhibitor_speaker_submissions FOR INSERT TO authenticated WITH CHECK (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));

-- exhibitor_speaker_headshots
CREATE POLICY "Admins can view all speaker headshots" ON public.exhibitor_speaker_headshots FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins can insert exhibitor speaker headshots" ON public.exhibitor_speaker_headshots FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins can delete speaker headshots" ON public.exhibitor_speaker_headshots FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY admin_update_exhibitor_speaker_headshots ON public.exhibitor_speaker_headshots FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can view their own speaker headshots" ON public.exhibitor_speaker_headshots FOR SELECT USING (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));
CREATE POLICY "Exhibitors can insert their own speaker headshots" ON public.exhibitor_speaker_headshots FOR INSERT WITH CHECK (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));

-- exhibitor_advert_submissions
CREATE POLICY "Admins, CS, and PM can view all advert submissions" ON public.exhibitor_advert_submissions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert exhibitor advert submissions" ON public.exhibitor_advert_submissions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete advert submissions" ON public.exhibitor_advert_submissions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY admin_cs_pm_update_exhibitor_advert_submissions ON public.exhibitor_advert_submissions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can view their own advert submissions" ON public.exhibitor_advert_submissions FOR SELECT TO authenticated USING (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));
CREATE POLICY "Exhibitors can insert their own advert submissions" ON public.exhibitor_advert_submissions FOR INSERT TO authenticated WITH CHECK (exhibitor_id IN (SELECT id FROM exhibitors WHERE user_id = auth.uid()));

-- speakers
CREATE POLICY "Staff can view all speakers" ON public.speakers FOR SELECT TO authenticated USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Speakers can view own data" ON public.speakers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert speakers" ON public.speakers FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Staff can update speakers" ON public.speakers FOR UPDATE TO authenticated USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Speakers can update own profile" ON public.speakers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can delete speakers" ON public.speakers FOR DELETE TO authenticated USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- speaker_submissions
CREATE POLICY "Admins and CS can manage speaker submissions" ON public.speaker_submissions USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Speakers can view their own submissions" ON public.speaker_submissions FOR SELECT USING (speaker_id IN (SELECT id FROM speakers WHERE user_id = auth.uid()));
CREATE POLICY "Speakers can insert their own submissions" ON public.speaker_submissions FOR INSERT WITH CHECK (speaker_id IN (SELECT id FROM speakers WHERE user_id = auth.uid()));

-- draft_sessions
CREATE POLICY "Admins, CS, and PM can manage all draft sessions" ON public.draft_sessions USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Speakers can view their own draft sessions" ON public.draft_sessions FOR SELECT USING (speaker_id IN (SELECT id FROM speakers WHERE user_id = auth.uid()));
CREATE POLICY "Speakers can update their own draft sessions" ON public.draft_sessions FOR UPDATE USING (speaker_id IN (SELECT id FROM speakers WHERE user_id = auth.uid()));
CREATE POLICY "System can insert draft sessions" ON public.draft_sessions FOR INSERT WITH CHECK (true);

-- session_speakers
CREATE POLICY "Anyone can view session speakers" ON public.session_speakers FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can manage session speakers" ON public.session_speakers USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));

-- agenda_sessions
CREATE POLICY "Anyone can view sessions" ON public.agenda_sessions FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can insert sessions" ON public.agenda_sessions FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update sessions" ON public.agenda_sessions FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete sessions" ON public.agenda_sessions FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- blog_posts
CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING (status = 'published' OR public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can manage blog posts" ON public.blog_posts USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));

-- customer_managers
CREATE POLICY "Anyone can view active managers" ON public.customer_managers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and CS can manage customer managers" ON public.customer_managers USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- email_deadlines
CREATE POLICY "Anyone can view active deadlines" ON public.email_deadlines FOR SELECT USING (is_active = true);
CREATE POLICY "Admins, CS, and PM can manage deadlines" ON public.email_deadlines USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- email_templates
CREATE POLICY "Anyone can view active templates" ON public.email_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins, CS, and PM can manage email templates" ON public.email_templates USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- event_settings
CREATE POLICY "Anyone can view event settings" ON public.event_settings FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can manage event settings" ON public.event_settings USING (public.is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));

-- navbar_menu_items
CREATE POLICY "Anyone can view active navbar menu items" ON public.navbar_menu_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and CS can view all navbar menu items" ON public.navbar_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can insert navbar menu items" ON public.navbar_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update navbar menu items" ON public.navbar_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete navbar menu items" ON public.navbar_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- footer_menu_items
CREATE POLICY "Anyone can view active footer menu items" ON public.footer_menu_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins, CS, and PM can view all footer menu items" ON public.footer_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert footer menu items" ON public.footer_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update footer menu items" ON public.footer_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete footer menu items" ON public.footer_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- portal_menu_items
CREATE POLICY "Authenticated users can view active portal menu items" ON public.portal_menu_items FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins, CS, and PM can view all portal menu items" ON public.portal_menu_items FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert portal menu items" ON public.portal_menu_items FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update portal menu items" ON public.portal_menu_items FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete portal menu items" ON public.portal_menu_items FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- page_content
CREATE POLICY "Allow public read access to page_content" ON public.page_content FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can insert page_content" ON public.page_content FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update page_content" ON public.page_content FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete page_content" ON public.page_content FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- page_section_order
CREATE POLICY "Anyone can view section orders" ON public.page_section_order FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can insert section_order" ON public.page_section_order FOR INSERT WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update section_order" ON public.page_section_order FOR UPDATE USING (is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete section_order" ON public.page_section_order FOR DELETE USING (is_admin_or_cs_or_pm(auth.uid()));

-- section_column_order
CREATE POLICY "Allow public read access to section_column_order" ON public.section_column_order FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can insert section_column_order" ON public.section_column_order FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update section_column_order" ON public.section_column_order FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete section_column_order" ON public.section_column_order FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- page_views
CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins and CS can view page views" ON public.page_views FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- visitor_sessions
CREATE POLICY "Anyone can insert visitor sessions" ON public.visitor_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their own session" ON public.visitor_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can read own session for upsert" ON public.visitor_sessions FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can view visitor sessions" ON public.visitor_sessions FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- registrations
CREATE POLICY "Anyone can register" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins, CS, and PM can view registrations" ON public.registrations FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update registrations" ON public.registrations FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete registrations" ON public.registrations FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- website_pages
CREATE POLICY "Anyone can view published pages" ON public.website_pages FOR SELECT USING (status = 'published');
CREATE POLICY "Admins and CS can view all pages including drafts" ON public.website_pages FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can insert pages" ON public.website_pages FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update pages" ON public.website_pages FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete pages" ON public.website_pages FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- website_styles
CREATE POLICY "Anyone can view website styles" ON public.website_styles FOR SELECT USING (true);
CREATE POLICY "Admins, CS, and PM can insert website styles" ON public.website_styles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update website styles" ON public.website_styles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete website styles" ON public.website_styles FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- gallery_photos
CREATE POLICY "Anyone can view gallery photos" ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert gallery photos" ON public.gallery_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update gallery photos" ON public.gallery_photos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete gallery photos" ON public.gallery_photos FOR DELETE USING (auth.uid() IS NOT NULL);

-- global_html_snippets
CREATE POLICY "Anyone can view global HTML snippets" ON public.global_html_snippets FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view global HTML snippets" ON public.global_html_snippets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins, CS, and PM can insert global HTML snippets" ON public.global_html_snippets FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update global HTML snippets" ON public.global_html_snippets FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete global HTML snippets" ON public.global_html_snippets FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- marketing_tools
CREATE POLICY "Anyone can view marketing tools" ON public.marketing_tools FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view marketing tools" ON public.marketing_tools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and CS can insert marketing tools" ON public.marketing_tools FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update marketing tools" ON public.marketing_tools FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete marketing tools" ON public.marketing_tools FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- media_library
CREATE POLICY "Anyone can view media library" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload to media library" ON public.media_library FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins, CS, and PM can update media library" ON public.media_library FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete from media library" ON public.media_library FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- show_suppliers
CREATE POLICY "Anyone can view suppliers" ON public.show_suppliers FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view suppliers" ON public.show_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins, CS, and PM can view all supplier details" ON public.show_suppliers FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert show suppliers" ON public.show_suppliers FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update show suppliers" ON public.show_suppliers FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete show suppliers" ON public.show_suppliers FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- supplier_files
CREATE POLICY "Anyone can view supplier files" ON public.supplier_files FOR SELECT USING (true);
CREATE POLICY "Admins and CS can insert supplier files" ON public.supplier_files FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update supplier files" ON public.supplier_files FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete supplier files" ON public.supplier_files FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- support_tickets
CREATE POLICY "Admins, CS, and PM can view all tickets" ON public.support_tickets FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update tickets" ON public.support_tickets FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = support_tickets.exhibitor_id AND exhibitors.user_id = auth.uid()));
CREATE POLICY "Exhibitors can view their own tickets" ON public.support_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = support_tickets.exhibitor_id AND exhibitors.user_id = auth.uid()));

-- seo_redirects
CREATE POLICY "Anyone can read redirects" ON public.seo_redirects FOR SELECT USING (true);
CREATE POLICY "Admins can manage redirects" ON public.seo_redirects FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','customer_service','project_manager')));

-- password_setup_tokens
CREATE POLICY "Admins, CS, and PM can manage password setup tokens" ON public.password_setup_tokens FOR ALL USING (is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Anyone can read valid tokens for validation" ON public.password_setup_tokens FOR SELECT USING (used_at IS NULL AND expires_at > now());

-- credentials_log
CREATE POLICY "Admins, CS, and PM can view credentials log" ON public.credentials_log FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert credentials log" ON public.credentials_log FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins can delete credentials log" ON public.credentials_log FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));

-- blocked_inquiry_emails
CREATE POLICY "Admins, CS, and PM can manage blocked emails" ON public.blocked_inquiry_emails FOR ALL USING (is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- page_versions
CREATE POLICY "Admins can create page versions" ON public.page_versions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','customer_service','project_manager')));
CREATE POLICY "Admins can view page versions" ON public.page_versions FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','customer_service','project_manager')));
CREATE POLICY "Admins can delete page versions" ON public.page_versions FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','customer_service','project_manager')));

-- element_styles
CREATE POLICY "Anyone can view element styles" ON public.element_styles FOR SELECT USING (true);
CREATE POLICY "Admins can manage element styles" ON public.element_styles FOR ALL TO authenticated USING (is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));

-- element_motion
CREATE POLICY "Anyone can view element motion" ON public.element_motion FOR SELECT USING (true);
CREATE POLICY "Admins can manage element motion" ON public.element_motion FOR ALL TO authenticated USING (is_admin_or_cs_or_pm(auth.uid())) WITH CHECK (is_admin_or_cs_or_pm(auth.uid()));
