-- Add esp_cedu column to tm_espec for specialist legal identification (separate from internal PK esp_codi)
ALTER TABLE "tm_espec" ADD COLUMN IF NOT EXISTS "esp_cedu" VARCHAR(20);

-- Safely backfill numeric legacy cedula values stored in esp_codi without duplicating or copying internal E* codes
UPDATE "tm_espec" e
SET "esp_cedu" = e."esp_codi"
WHERE e."esp_cedu" IS NULL
  AND e."esp_codi" ~ '^[0-9]{6,8}$'
  AND NOT EXISTS (
    SELECT 1 FROM "tm_espec" o
    WHERE o."esp_codi" <> e."esp_codi"
      AND o."esp_cedu" = e."esp_codi"
  );

-- Unique index for esp_cedu
CREATE UNIQUE INDEX IF NOT EXISTS "tm_espec_esp_cedu_key" ON "tm_espec"("esp_cedu");
