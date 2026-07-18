-- Activa ecommerce en todas las organizaciones existentes sin ese flag.
-- Ejecutar UNA VEZ: psql $DATABASE_URL -f migrate-existing-orgs-ecommerce.sql

UPDATE organizations
SET
  "enabledProducts" = jsonb_set(
    COALESCE("enabledProducts", '{}'),
    '{ecommerce}',
    'true'
  ),
  slug = CASE
    WHEN slug IS NULL OR slug = ''
    THEN 'org-' || LEFT(id::text, 8)
    ELSE slug
  END
WHERE
  "enabledProducts" IS NULL
  OR "enabledProducts"->>'ecommerce' IS NULL
  OR "enabledProducts"->>'ecommerce' = 'false';

SELECT id, slug, "enabledProducts" FROM organizations;
