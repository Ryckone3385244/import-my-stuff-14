-- Disable the validation trigger
ALTER TABLE exhibitors DISABLE TRIGGER check_exhibitor_update;

-- Update event statuses
UPDATE exhibitors SET event_status = 'CCE 2026' WHERE event_status = 'CCG 2026';
UPDATE exhibitors SET event_status = 'CCE 2025' WHERE event_status = '2025';

-- Re-enable the trigger
ALTER TABLE exhibitors ENABLE TRIGGER check_exhibitor_update;