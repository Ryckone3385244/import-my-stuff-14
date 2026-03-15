
-- PART 5A: RLS Policies - user_roles and user_profiles

-- user_roles policies
CREATE POLICY "Admins and CS can assign roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can remove roles" ON public.user_roles FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can view all user roles" ON public.user_roles FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view customer service roles" ON public.user_roles FOR SELECT TO authenticated USING (role = 'customer_service'::app_role);
CREATE POLICY "Authenticated users can view project manager roles" ON public.user_roles FOR SELECT TO authenticated USING (role = 'project_manager'::app_role);

-- user_profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins, CS, and PM can view all profiles" ON public.user_profiles FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update all profiles" ON public.user_profiles FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Anyone can view customer service profiles" ON public.user_profiles FOR SELECT TO authenticated USING (user_id IN (SELECT user_roles.user_id FROM user_roles WHERE role = 'customer_service'));
CREATE POLICY "Authenticated users can view CS profiles" ON public.user_profiles FOR SELECT USING ((auth.uid() IS NOT NULL) AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = user_profiles.user_id AND user_roles.role = 'customer_service'));
CREATE POLICY "Authenticated users can view project manager profiles" ON public.user_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = user_profiles.user_id AND user_roles.role = 'project_manager'));

-- exhibitors policies
CREATE POLICY "Anyone can view approved active exhibitors" ON public.exhibitors FOR SELECT USING (((is_active = true) AND (approval_status = 'approved' OR approval_status IS NULL)) OR public.is_admin_or_cs_or_pm(auth.uid()) OR (auth.uid() = user_id));
CREATE POLICY "Admins and CS can insert exhibitors" ON public.exhibitors FOR INSERT WITH CHECK (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can update exhibitors" ON public.exhibitors FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins and CS can delete exhibitors" ON public.exhibitors FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can submit changes for approval" ON public.exhibitors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exhibitor_contacts policies
CREATE POLICY "Anyone can view approved active contacts" ON public.exhibitor_contacts FOR SELECT USING (((is_active = true) AND (approval_status = 'approved' OR approval_status IS NULL)) OR public.is_admin_or_cs_or_pm(auth.uid()) OR EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_contacts.exhibitor_id AND exhibitors.user_id = auth.uid()));
CREATE POLICY "Admins, CS, and PM can manage all contacts" ON public.exhibitor_contacts USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can submit contact changes" ON public.exhibitor_contacts TO authenticated USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_contacts.exhibitor_id AND exhibitors.user_id = auth.uid()));

-- exhibitor_address policies
CREATE POLICY "Anyone can view approved addresses" ON public.exhibitor_address FOR SELECT USING ((approval_status = 'approved' OR approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_address.exhibitor_id AND exhibitors.user_id = auth.uid()));
CREATE POLICY "Admins, CS, and PM can manage all addresses" ON public.exhibitor_address USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can submit address changes" ON public.exhibitor_address TO authenticated USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_address.exhibitor_id AND exhibitors.user_id = auth.uid()));

-- exhibitor_products policies
CREATE POLICY "Anyone can view approved products" ON public.exhibitor_products FOR SELECT USING ((approval_status = 'approved' OR approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_products.exhibitor_id AND exhibitors.user_id = auth.uid()));
CREATE POLICY "Admins, CS, and PM can manage all products" ON public.exhibitor_products USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can submit product changes" ON public.exhibitor_products TO authenticated USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_products.exhibitor_id AND exhibitors.user_id = auth.uid()));

-- exhibitor_social_media policies
CREATE POLICY "Anyone can view approved social media" ON public.exhibitor_social_media FOR SELECT USING ((approval_status = 'approved' OR approval_status IS NULL) OR public.is_admin_or_cs_or_pm(auth.uid()) OR EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_social_media.exhibitor_id AND exhibitors.user_id = auth.uid()));
CREATE POLICY "Admins, CS, and PM can manage all social media" ON public.exhibitor_social_media USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can submit social media changes" ON public.exhibitor_social_media TO authenticated USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_social_media.exhibitor_id AND exhibitors.user_id = auth.uid()));

-- exhibitor_inquiries policies
CREATE POLICY "Anyone can submit inquiries" ON public.exhibitor_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins, CS, and PM can view all inquiries" ON public.exhibitor_inquiries FOR SELECT USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can update all inquiries" ON public.exhibitor_inquiries FOR UPDATE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Admins, CS, and PM can delete inquiries" ON public.exhibitor_inquiries FOR DELETE USING (public.is_admin_or_cs_or_pm(auth.uid()));
CREATE POLICY "Exhibitors can view their own inquiries" ON public.exhibitor_inquiries FOR SELECT USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id AND exhibitors.user_id = auth.uid()) AND status NOT IN ('pending','rejected'));
CREATE POLICY "Exhibitors can update their own inquiry status" ON public.exhibitor_inquiries FOR UPDATE USING (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id AND exhibitors.user_id = auth.uid()) AND status NOT IN ('pending','rejected')) WITH CHECK (EXISTS (SELECT 1 FROM exhibitors WHERE exhibitors.id = exhibitor_inquiries.exhibitor_id AND exhibitors.user_id = auth.uid()) AND status NOT IN ('pending','rejected'));
