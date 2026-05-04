-- Tabella staff della discoteca con permessi granulari
CREATE TABLE IF NOT EXISTS club_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users(id),
  -- Permessi on/off
  can_manage_events boolean NOT NULL DEFAULT false,
  can_manage_tables boolean NOT NULL DEFAULT false,
  can_view_analytics boolean NOT NULL DEFAULT false,
  can_view_participants boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- RLS
ALTER TABLE club_staff ENABLE ROW LEVEL SECURITY;

-- Il club admin vede e gestisce il proprio staff
CREATE POLICY "club_admin_manage_staff" ON club_staff
  FOR ALL
  USING (
    club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid() AND role = 'club_admin'
    )
  );

-- Lo staff vede il proprio record
CREATE POLICY "staff_read_own" ON club_staff
  FOR SELECT
  USING (user_id = auth.uid());
