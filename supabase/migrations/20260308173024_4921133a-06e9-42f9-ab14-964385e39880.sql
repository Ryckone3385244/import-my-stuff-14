INSERT INTO public.user_roles (user_id, role)
VALUES ('5f962f25-395f-4aa1-a79a-06388ff2447f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;