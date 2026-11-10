-- Migration: Forms persistence columns & representative birth date + widen ins_codi to VARCHAR(15)

-- 1. Representative birth date (nullable for backward compatibility)
ALTER TABLE "tm_repre" ADD COLUMN IF NOT EXISTS "rep_fnac" DATE;

-- 2. Administrator identification & phone fields
ALTER TABLE "tm_admin" ADD COLUMN IF NOT EXISTS "adm_tdoc" VARCHAR(2) NOT NULL DEFAULT 'V';
ALTER TABLE "tm_admin" ADD COLUMN IF NOT EXISTS "adm_cedu" VARCHAR(20);
ALTER TABLE "tm_admin" ADD COLUMN IF NOT EXISTS "adm_telf" VARCHAR(15);

-- 3. Institutional logo & operational configuration JSON
ALTER TABLE "tm_insti" ADD COLUMN IF NOT EXISTS "ins_logo" TEXT;
ALTER TABLE "tm_insti" ADD COLUMN IF NOT EXISTS "ins_conf" JSONB;

-- 4. Widen ins_codi PK and FK columns from VARCHAR(11) to VARCHAR(15) so full RIF strings (e.g. J-50493821-0) fit cleanly
ALTER TABLE "tm_espec" DROP CONSTRAINT IF EXISTS "tm_espec_ins_codi_fkey";
ALTER TABLE "tm_ninos" DROP CONSTRAINT IF EXISTS "tm_ninos_ins_codi_fkey";
ALTER TABLE "tm_dispo" DROP CONSTRAINT IF EXISTS "tm_dispo_ins_codi_fkey";
ALTER TABLE "tm_admin" DROP CONSTRAINT IF EXISTS "tm_admin_ins_codi_fkey";

ALTER TABLE "tm_insti" ALTER COLUMN "ins_codi" TYPE VARCHAR(15);
ALTER TABLE "tm_espec" ALTER COLUMN "ins_codi" TYPE VARCHAR(15);
ALTER TABLE "tm_ninos" ALTER COLUMN "ins_codi" TYPE VARCHAR(15);
ALTER TABLE "tm_dispo" ALTER COLUMN "ins_codi" TYPE VARCHAR(15);
ALTER TABLE "tm_admin" ALTER COLUMN "ins_codi" TYPE VARCHAR(15);

ALTER TABLE "tm_espec" ADD CONSTRAINT "tm_espec_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tm_ninos" ADD CONSTRAINT "tm_ninos_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tm_dispo" ADD CONSTRAINT "tm_dispo_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tm_admin" ADD CONSTRAINT "tm_admin_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

