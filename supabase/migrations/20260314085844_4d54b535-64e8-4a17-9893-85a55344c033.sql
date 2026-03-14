DELETE FROM section_column_order WHERE page_name = 'template-1' AND section_id = 'new-section-1-col-1773005890752' AND column_id IN ('card-0-copy-1773006608860', 'card-0-copy-1773006608860-copy-1773006677408');

DELETE FROM page_content WHERE page_name = 'template-1' AND section_name IN ('new-section-1-col-1773005890752-card-0-copy-1773006608860', 'new-section-1-col-1773005890752-card-0-copy-1773006608860-copy-1773006677408');

-- Also clean up orphan columns from sections that no longer exist in page_section_order
DELETE FROM section_column_order WHERE page_name = 'template-1' AND section_id NOT IN (SELECT section_id FROM page_section_order WHERE page_name = 'template-1');