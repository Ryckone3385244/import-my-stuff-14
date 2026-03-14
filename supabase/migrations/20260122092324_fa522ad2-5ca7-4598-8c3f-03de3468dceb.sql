-- Bi-directional sync between event_settings social media fields and marketing_tools table
-- Safe to run multiple times on any remix

-- Step 1: Migrate existing data from event_settings to marketing_tools
INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'facebook', facebook_url, 'Facebook'
FROM event_settings WHERE facebook_url IS NOT NULL AND facebook_url != ''
ON CONFLICT DO NOTHING;

INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'instagram', instagram_url, 'Instagram'
FROM event_settings WHERE instagram_url IS NOT NULL AND instagram_url != ''
ON CONFLICT DO NOTHING;

INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'linkedin', linkedin_url, 'LinkedIn'
FROM event_settings WHERE linkedin_url IS NOT NULL AND linkedin_url != ''
ON CONFLICT DO NOTHING;

INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'twitter', twitter_url, 'Twitter/X'
FROM event_settings WHERE twitter_url IS NOT NULL AND twitter_url != ''
ON CONFLICT DO NOTHING;

INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'youtube', youtube_url, 'YouTube'
FROM event_settings WHERE youtube_url IS NOT NULL AND youtube_url != ''
ON CONFLICT DO NOTHING;

INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
SELECT 'social', 'tiktok', tiktok_url, 'TikTok'
FROM event_settings WHERE tiktok_url IS NOT NULL AND tiktok_url != ''
ON CONFLICT DO NOTHING;

-- Step 2: Helper function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_syncing_social_media()
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(current_setting('app.syncing_social_media', true), 'false') = 'true';
END;
$$;

-- Step 3: Function to sync FROM event_settings TO marketing_tools
CREATE OR REPLACE FUNCTION public.sync_event_settings_to_marketing_tools()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_syncing_social_media() THEN RETURN NEW; END IF;
  PERFORM set_config('app.syncing_social_media', 'true', true);
  
  IF NEW.facebook_url IS DISTINCT FROM OLD.facebook_url THEN
    IF NEW.facebook_url IS NOT NULL AND NEW.facebook_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'facebook', NEW.facebook_url, 'Facebook')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.facebook_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'facebook';
    END IF;
  END IF;
  
  IF NEW.instagram_url IS DISTINCT FROM OLD.instagram_url THEN
    IF NEW.instagram_url IS NOT NULL AND NEW.instagram_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'instagram', NEW.instagram_url, 'Instagram')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.instagram_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'instagram';
    END IF;
  END IF;
  
  IF NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url THEN
    IF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'linkedin', NEW.linkedin_url, 'LinkedIn')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.linkedin_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'linkedin';
    END IF;
  END IF;
  
  IF NEW.twitter_url IS DISTINCT FROM OLD.twitter_url THEN
    IF NEW.twitter_url IS NOT NULL AND NEW.twitter_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'twitter', NEW.twitter_url, 'Twitter/X')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.twitter_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'twitter';
    END IF;
  END IF;
  
  IF NEW.youtube_url IS DISTINCT FROM OLD.youtube_url THEN
    IF NEW.youtube_url IS NOT NULL AND NEW.youtube_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'youtube', NEW.youtube_url, 'YouTube')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.youtube_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'youtube';
    END IF;
  END IF;
  
  IF NEW.tiktok_url IS DISTINCT FROM OLD.tiktok_url THEN
    IF NEW.tiktok_url IS NOT NULL AND NEW.tiktok_url != '' THEN
      INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
      VALUES ('social', 'tiktok', NEW.tiktok_url, 'TikTok')
      ON CONFLICT (id) DO NOTHING;
      UPDATE marketing_tools SET social_url = NEW.tiktok_url, updated_at = now()
      WHERE tool_type = 'social' AND LOWER(social_platform) = 'tiktok';
    END IF;
  END IF;
  
  PERFORM set_config('app.syncing_social_media', 'false', true);
  RETURN NEW;
END;
$$;

-- Step 4: Function to sync FROM marketing_tools TO event_settings
CREATE OR REPLACE FUNCTION public.sync_marketing_tools_to_event_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tool_type != 'social' THEN RETURN NEW; END IF;
  IF is_syncing_social_media() THEN RETURN NEW; END IF;
  PERFORM set_config('app.syncing_social_media', 'true', true);
  
  IF LOWER(NEW.social_platform) = 'facebook' THEN
    UPDATE event_settings SET facebook_url = NEW.social_url, updated_at = now();
  ELSIF LOWER(NEW.social_platform) = 'instagram' THEN
    UPDATE event_settings SET instagram_url = NEW.social_url, updated_at = now();
  ELSIF LOWER(NEW.social_platform) = 'linkedin' THEN
    UPDATE event_settings SET linkedin_url = NEW.social_url, updated_at = now();
  ELSIF LOWER(NEW.social_platform) = 'twitter' THEN
    UPDATE event_settings SET twitter_url = NEW.social_url, updated_at = now();
  ELSIF LOWER(NEW.social_platform) = 'youtube' THEN
    UPDATE event_settings SET youtube_url = NEW.social_url, updated_at = now();
  ELSIF LOWER(NEW.social_platform) = 'tiktok' THEN
    UPDATE event_settings SET tiktok_url = NEW.social_url, updated_at = now();
  END IF;
  
  PERFORM set_config('app.syncing_social_media', 'false', true);
  RETURN NEW;
END;
$$;

-- Step 5: Create triggers
DROP TRIGGER IF EXISTS sync_social_to_marketing_tools ON event_settings;
CREATE TRIGGER sync_social_to_marketing_tools
  AFTER UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION sync_event_settings_to_marketing_tools();

DROP TRIGGER IF EXISTS sync_social_to_event_settings ON marketing_tools;
CREATE TRIGGER sync_social_to_event_settings
  AFTER UPDATE ON marketing_tools
  FOR EACH ROW EXECUTE FUNCTION sync_marketing_tools_to_event_settings();

DROP TRIGGER IF EXISTS sync_social_insert_to_event_settings ON marketing_tools;
CREATE TRIGGER sync_social_insert_to_event_settings
  AFTER INSERT ON marketing_tools
  FOR EACH ROW EXECUTE FUNCTION sync_marketing_tools_to_event_settings();