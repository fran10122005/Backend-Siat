-- Add unique national ID (cédula) for representatives
ALTER TABLE "tm_repre" ADD COLUMN "rep_cedu" VARCHAR(11);

-- Unique index (Postgres permite múltiples NULLs, por eso los registros antiguos no chocan)
CREATE UNIQUE INDEX "tm_repre_rep_cedu_key" ON "tm_repre"("rep_cedu");
