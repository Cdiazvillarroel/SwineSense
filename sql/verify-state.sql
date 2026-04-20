-- SwineSense — state verification
-- Run before and after the legacy reprocessing pass.
-- Organization id from STATUS.md §2.2.

-- 1. Summary: how many alerts are awaiting AI analysis
SELECT
  COUNT(*) FILTER (WHERE a.ai_processed = false AND a.severity IN ('High','Critical'))
    AS unprocessed_high_critical,
  COUNT(*) FILTER (WHERE a.ai_processed = false)  AS unprocessed_total,
  COUNT(*) FILTER (WHERE a.ai_processed = true)   AS processed_total,
  COUNT(*)                                        AS all_alerts
FROM alerts a
JOIN sites s ON s.id = a.site_id
WHERE s.organization_id = 'af3e2255-a6e0-44d4-8077-b066dd5215c7';

-- 2. Candidates the script will pick up
SELECT a.id, a.timestamp, a.alert_type, a.severity, s.name AS site_name
FROM alerts a
JOIN sites s ON s.id = a.site_id
WHERE s.organization_id = 'af3e2255-a6e0-44d4-8077-b066dd5215c7'
  AND a.severity IN ('High','Critical')
  AND a.ai_processed = false
ORDER BY a.timestamp ASC;

-- 3. Most recent AI responses (sanity-check language and content)
SELECT
  a.id,
  a.alert_type,
  a.severity,
  a.ai_response_status,
  a.ai_timestamp,
  LEFT(a.ai_insight, 160) AS ai_insight_preview
FROM alerts a
WHERE a.ai_processed = true
ORDER BY a.ai_timestamp DESC NULLS LAST
LIMIT 10;

-- 4. Failed AI dispatches (if any)
SELECT
  a.id,
  a.alert_type,
  a.severity,
  a.ai_triggered_at,
  a.ai_response_status
FROM alerts a
WHERE a.ai_response_status = 'failed'
ORDER BY a.ai_triggered_at DESC NULLS LAST;
