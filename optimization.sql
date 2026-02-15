-- Optimization: Add indexes to foreign keys for faster joins and lookups

-- Index for vitals table
CREATE INDEX IF NOT EXISTS idx_vitals_user_id ON vitals(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_created_at ON vitals(created_at DESC);

-- Index for reminders table
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

-- Index for emergency_contacts table
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Index for profiles (already text unique but good to ensure role lookups are fast if frequent)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
