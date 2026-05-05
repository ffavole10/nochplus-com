UPDATE public.qbr_sections
SET content = content || '{"chargepoint_q1_work_orders": 423}'::jsonb
WHERE section_key = 'operational_metrics'
  AND qbr_id = 'd717459b-065a-4a9c-8edb-aebfe1a73a6d';