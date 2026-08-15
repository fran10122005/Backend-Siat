-- AlterTable
ALTER TABLE "tr_metaspei" ADD COLUMN     "met_categ" VARCHAR(50),
ADD COLUMN     "met_crit" TEXT,
ADD COLUMN     "met_ffin" DATE,
ADD COLUMN     "met_fini" DATE,
ADD COLUMN     "met_line" DOUBLE PRECISION,
ADD COLUMN     "met_obse" TEXT;

-- CreateTable
CREATE TABLE "tr_soap" (
    "soap_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "soap_subj" TEXT NOT NULL,
    "soap_obje" TEXT NOT NULL,
    "soap_anal" TEXT NOT NULL,
    "soap_plan" TEXT NOT NULL,
    "soap_fech" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_soap_pkey" PRIMARY KEY ("soap_codi")
);

-- CreateTable
CREATE TABLE "tr_indic" (
    "ind_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "ind_tipo" VARCHAR(30) NOT NULL,
    "ind_area" VARCHAR(50) NOT NULL,
    "ind_frec" VARCHAR(30) NOT NULL,
    "ind_dura" VARCHAR(30),
    "ind_prio" VARCHAR(15) NOT NULL,
    "ind_vige" DATE,
    "ind_desc" TEXT NOT NULL,
    "ind_crea" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_indic_pkey" PRIMARY KEY ("ind_codi")
);

-- CreateTable
CREATE TABLE "tr_incid" (
    "inc_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "inc_tipo" VARCHAR(50) NOT NULL,
    "inc_dura" VARCHAR(20) NOT NULL,
    "inc_deto" VARCHAR(100) NOT NULL,
    "inc_ruti" TEXT,
    "inc_seve" VARCHAR(20) NOT NULL,
    "inc_conse" TEXT,
    "inc_inter" TEXT,
    "inc_resu" TEXT,
    "inc_obse" TEXT,
    "inc_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_incid_pkey" PRIMARY KEY ("inc_codi")
);

-- AddForeignKey
ALTER TABLE "tr_soap" ADD CONSTRAINT "tr_soap_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_soap" ADD CONSTRAINT "tr_soap_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_indic" ADD CONSTRAINT "tr_indic_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_indic" ADD CONSTRAINT "tr_indic_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_incid" ADD CONSTRAINT "tr_incid_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_incid" ADD CONSTRAINT "tr_incid_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

