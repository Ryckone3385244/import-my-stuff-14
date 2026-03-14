-- Restore the missing "TESTING" text block in the left column
INSERT INTO public.page_content (page_name, section_name, content_key, content_type, content_value)
VALUES (
  'template-1',
  'new-section-2-col-1772998811516-card-0',
  'block_1773015796174',
  'text',
  '{"type":"text","content":"<h3 class=\"font-bold mb-2 mt-4\">TESTING </h3><p></p>","order":0,"version":2}'
);

-- Clean up orphan content from deleted column copy-1773006851131
DELETE FROM public.page_content
WHERE page_name = 'template-1'
  AND section_name = 'new-section-2-col-1772998811516-copy-1773006851131-card-0';

-- Clean up orphan element_styles for deleted columns
DELETE FROM public.element_styles
WHERE page_name = 'template-1'
  AND element_id LIKE '%copy-1773006608860%';

DELETE FROM public.element_styles
WHERE page_name = 'template-1'
  AND element_id LIKE '%copy-1773006677408%';