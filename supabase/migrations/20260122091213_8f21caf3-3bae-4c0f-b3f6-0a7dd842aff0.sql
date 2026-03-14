-- Migrate email_deadlines data to fixed event_settings deadline fields
-- Safe to run on any remix - uses COALESCE to only update if target is NULL

UPDATE event_settings es
SET 
  showguide_listing_deadline = COALESCE(es.showguide_listing_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%profile%' OR LOWER(label) LIKE '%listing%' OR LOWER(label) LIKE '%showguide%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  space_only_deadline = COALESCE(es.space_only_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%stand%' OR LOWER(label) LIKE '%space%' OR LOWER(label) LIKE '%booth%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  speaker_form_deadline = COALESCE(es.speaker_form_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%speaker%' OR LOWER(label) LIKE '%session%'
    ORDER BY deadline_date ASC LIMIT 1
  )),
  advert_submission_deadline = COALESCE(es.advert_submission_deadline, (
    SELECT deadline_date FROM email_deadlines 
    WHERE LOWER(label) LIKE '%marketing%' OR LOWER(label) LIKE '%advert%' OR LOWER(label) LIKE '%material%'
    ORDER BY deadline_date ASC LIMIT 1
  ))
WHERE es.id = (SELECT id FROM event_settings LIMIT 1);