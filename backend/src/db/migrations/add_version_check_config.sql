-- One-time migration for the in-app update-available prompt. Run against
-- the live database once, then it's done — schema.sql has already been
-- updated to match for any future fresh DB.
--
-- latestBuild starts at 1 (below any real build number EAS will produce)
-- so this doesn't start nagging every user immediately after the migration
-- runs. Raise ios_latest_build / android_latest_build (and set
-- ios_update_url to your TestFlight link) via the admin Config page once
-- you're ready to start prompting people to update.

INSERT INTO config (key, value) VALUES
  ('ios_latest_build', '1'),
  ('ios_update_url', ''),
  ('android_latest_build', '1'),
  ('android_update_url', 'https://play.google.com/store/apps/details?id=com.campuschauffeur.app')
ON CONFLICT (key) DO NOTHING;
