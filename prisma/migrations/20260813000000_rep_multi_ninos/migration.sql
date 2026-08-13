-- CreateTable
CREATE TABLE "tm_repre_ninos" (
    "rep_cod" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,

    CONSTRAINT "tm_repre_ninos_pkey" PRIMARY KEY ("rep_cod","nin_codi")
);

-- Migrate existing 1:1 data into the pivot table
INSERT INTO "tm_repre_ninos" ("rep_cod", "nin_codi")
SELECT "rep_cod", "nin_codi" FROM "tm_repre";

-- Drop the old single-child column and its foreign key
ALTER TABLE "tm_repre" DROP CONSTRAINT "tm_repre_nin_codi_fkey";
ALTER TABLE "tm_repre" DROP COLUMN "nin_codi";

-- CreateIndex
CREATE INDEX "tm_repre_ninos_nin_codi_idx" ON "tm_repre_ninos"("nin_codi");

-- AddForeignKey
ALTER TABLE "tm_repre_ninos" ADD CONSTRAINT "tm_repre_ninos_rep_cod_fkey" FOREIGN KEY ("rep_cod") REFERENCES "tm_repre"("rep_cod") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_repre_ninos" ADD CONSTRAINT "tm_repre_ninos_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;
