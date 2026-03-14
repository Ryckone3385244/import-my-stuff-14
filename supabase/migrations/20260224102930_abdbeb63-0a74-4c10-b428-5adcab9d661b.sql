
CREATE OR REPLACE FUNCTION public.sync_event_settings_to_marketing_tools()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF is_syncing_social_media() THEN RETURN NEW; END IF;
  PERFORM set_config('app.syncing_social_media', 'true', true);
  
  IF NEW.facebook_url IS DISTINCT FROM OLD.facebook_url THEN
    IF NEW.facebook_url IS NOT NULL AND NEW.facebook_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'facebook') THEN
        UPDATE marketing_tools SET social_url = NEW.facebook_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'facebook';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'facebook', NEW.facebook_url, 'Facebook');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'facebook';
    END IF;
  END IF;
  
  IF NEW.instagram_url IS DISTINCT FROM OLD.instagram_url THEN
    IF NEW.instagram_url IS NOT NULL AND NEW.instagram_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'instagram') THEN
        UPDATE marketing_tools SET social_url = NEW.instagram_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'instagram';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'instagram', NEW.instagram_url, 'Instagram');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'instagram';
    END IF;
  END IF;
  
  IF NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url THEN
    IF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'linkedin') THEN
        UPDATE marketing_tools SET social_url = NEW.linkedin_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'linkedin';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'linkedin', NEW.linkedin_url, 'LinkedIn');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'linkedin';
    END IF;
  END IF;
  
  IF NEW.twitter_url IS DISTINCT FROM OLD.twitter_url THEN
    IF NEW.twitter_url IS NOT NULL AND NEW.twitter_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'twitter') THEN
        UPDATE marketing_tools SET social_url = NEW.twitter_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'twitter';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'twitter', NEW.twitter_url, 'Twitter/X');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'twitter';
    END IF;
  END IF;
  
  IF NEW.youtube_url IS DISTINCT FROM OLD.youtube_url THEN
    IF NEW.youtube_url IS NOT NULL AND NEW.youtube_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'youtube') THEN
        UPDATE marketing_tools SET social_url = NEW.youtube_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'youtube';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'youtube', NEW.youtube_url, 'YouTube');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'youtube';
    END IF;
  END IF;
  
  IF NEW.tiktok_url IS DISTINCT FROM OLD.tiktok_url THEN
    IF NEW.tiktok_url IS NOT NULL AND NEW.tiktok_url != '' THEN
      IF EXISTS (SELECT 1 FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'tiktok') THEN
        UPDATE marketing_tools SET social_url = NEW.tiktok_url, updated_at = now()
        WHERE tool_type = 'social' AND LOWER(social_platform) = 'tiktok';
      ELSE
        INSERT INTO marketing_tools (tool_type, social_platform, social_url, title)
        VALUES ('social', 'tiktok', NEW.tiktok_url, 'TikTok');
      END IF;
    ELSE
      DELETE FROM marketing_tools WHERE tool_type = 'social' AND LOWER(social_platform) = 'tiktok';
    END IF;
  END IF;
  
  PERFORM set_config('app.syncing_social_media', 'false', true);
  RETURN NEW;
END;
$function$;
