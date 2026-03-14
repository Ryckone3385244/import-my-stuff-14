-- Multi-role support: Allow users to have multiple roles (e.g., both exhibitor AND speaker)
-- Drop old unique constraint on user_id alone (if exists)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Add composite unique constraint to allow same user with different roles
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);