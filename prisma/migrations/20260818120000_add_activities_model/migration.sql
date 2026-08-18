-- AlterTable: agregar estado al catálogo de categorías
ALTER TABLE "tm_categ" ADD COLUMN "cat_estd" BOOLEAN NOT NULL DEFAULT true;

-- RenameColumn: rep_codi -> cat_codi (semántica correcta de la FK hacia tm_categ)
ALTER TABLE "tm_activ" RENAME COLUMN "rep_codi" TO "cat_codi";

-- RenameIndex: alinear nombre del constraint con la nueva columna
ALTER TABLE "tm_activ" RENAME CONSTRAINT "tm_activ_rep_codi_fkey" TO "tm_activ_cat_codi_fkey";

-- AlterTable: enriquecer el modelo de actividades
ALTER TABLE "tm_activ"
    ADD COLUMN "act_desc" TEXT,
    ADD COLUMN "act_difi" VARCHAR(10) NOT NULL DEFAULT 'Baja',
    ADD COLUMN "act_estd" VARCHAR(20) NOT NULL DEFAULT 'Activa',
    ADD COLUMN "act_crea" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: asignación explícita de actividades a niños
CREATE TABLE "tc_activ_ninos" (
    "acn_codi" VARCHAR(10) NOT NULL,
    "act_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "acn_estd" VARCHAR(20) NOT NULL DEFAULT 'Activa',
    "acn_asig" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acn_nota" TEXT,

    CONSTRAINT "tc_activ_ninos_pkey" PRIMARY KEY ("acn_codi")
);

-- CreateIndex
CREATE INDEX "tc_activ_ninos_nin_codi_idx" ON "tc_activ_ninos"("nin_codi");

-- CreateIndex
CREATE INDEX "tc_activ_ninos_act_codi_idx" ON "tc_activ_ninos"("act_codi");

-- AddForeignKey
ALTER TABLE "tc_activ_ninos" ADD CONSTRAINT "tc_activ_ninos_act_codi_fkey" FOREIGN KEY ("act_codi") REFERENCES "tm_activ"("act_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_activ_ninos" ADD CONSTRAINT "tc_activ_ninos_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;