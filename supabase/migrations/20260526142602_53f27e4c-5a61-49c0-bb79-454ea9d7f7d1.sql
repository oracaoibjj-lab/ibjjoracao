INSERT INTO public.user_roles (user_id, role)
VALUES ('4515a111-1e42-489e-b5fd-1d100153ce3a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;