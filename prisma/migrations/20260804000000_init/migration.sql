-- CreateEnum
CREATE TYPE "gender_enum" AS ENUM ('M', 'F');

-- CreateTable
CREATE TABLE "tm_permi" (
    "per_codi" VARCHAR(10) NOT NULL,
    "per_nomb" VARCHAR(40) NOT NULL,
    "per_priv" TEXT,

    CONSTRAINT "tm_permi_pkey" PRIMARY KEY ("per_codi")
);

-- CreateTable
CREATE TABLE "tm_roles" (
    "rol_codi" VARCHAR(10) NOT NULL,
    "rol_nomb" VARCHAR(20) NOT NULL,
    "per_codi" VARCHAR(10) NOT NULL,
    "rol_desc" TEXT,

    CONSTRAINT "tm_roles_pkey" PRIMARY KEY ("rol_codi")
);

-- CreateTable
CREATE TABLE "tm_usuar" (
    "usu_codi" VARCHAR(10) NOT NULL,
    "rol_codi" VARCHAR(10) NOT NULL,
    "usu_crro" VARCHAR(50) NOT NULL,
    "usu_clve" VARCHAR(60) NOT NULL,
    "usu_crea" TIMESTAMP NOT NULL,
    "usu_logi" TIMESTAMP,
    "usu_estd" BOOLEAN NOT NULL,
    "usu_rtok" VARCHAR(100),
    "usu_rexp" TIMESTAMP,

    CONSTRAINT "tm_usuar_pkey" PRIMARY KEY ("usu_codi")
);

-- CreateTable
CREATE TABLE "tm_insti" (
    "ins_codi" VARCHAR(11) NOT NULL,
    "ins_nomb" VARCHAR(100) NOT NULL,
    "ins_dire" TEXT NOT NULL,
    "ins_telf" VARCHAR(15) NOT NULL,
    "ins_pers" VARCHAR(50),
    "ins_estd" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tm_insti_pkey" PRIMARY KEY ("ins_codi")
);

-- CreateTable
CREATE TABLE "tm_especi" (
    "esc_codi" VARCHAR(10) NOT NULL,
    "esc_nomb" VARCHAR(50) NOT NULL,
    "esc_desc" TEXT,
    "esc_estd" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tm_especi_pkey" PRIMARY KEY ("esc_codi")
);

-- CreateTable
CREATE TABLE "tm_espec" (
    "esp_codi" VARCHAR(11) NOT NULL,
    "usu_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(11) NOT NULL,
    "esp_nomb" VARCHAR(50) NOT NULL,
    "esp_apel" VARCHAR(50) NOT NULL,
    "esc_codi" VARCHAR(10) NOT NULL,
    "esp_gner" "gender_enum" NOT NULL DEFAULT 'F',
    "esp_licencia" VARCHAR(50),
    "esp_telf" VARCHAR(15),

    CONSTRAINT "tm_espec_pkey" PRIMARY KEY ("esp_codi")
);

-- CreateTable
CREATE TABLE "tm_ninos" (
    "nin_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(11) NOT NULL,
    "nin_nomb" VARCHAR(50) NOT NULL,
    "nin_apel" VARCHAR(50) NOT NULL,
    "nin_fnac" DATE NOT NULL,
    "nin_gner" "gender_enum" NOT NULL,
    "nin_nivd" VARCHAR(20) NOT NULL,
    "sen_codi" VARCHAR(10),
    "nin_ingr" TIMESTAMP NOT NULL,

    CONSTRAINT "tm_ninos_pkey" PRIMARY KEY ("nin_codi")
);

-- CreateTable
CREATE TABLE "tm_repre" (
    "rep_cod" VARCHAR(10) NOT NULL,
    "usu_codi" VARCHAR(10) NOT NULL,
    "rep_nomb" VARCHAR(50) NOT NULL,
    "rep_apel" VARCHAR(50) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "rep_rela" VARCHAR(20) NOT NULL,
    "rep_telf" VARCHAR(15) NOT NULL,

    CONSTRAINT "tm_repre_pkey" PRIMARY KEY ("rep_cod")
);

-- CreateTable
CREATE TABLE "tc_sensi" (
    "sen_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "sen_tipo" VARCHAR(30) NOT NULL,
    "sen_nvli" VARCHAR(20) NOT NULL,
    "sen_nota" VARCHAR(255),

    CONSTRAINT "tc_sensi_pkey" PRIMARY KEY ("sen_codi")
);

-- CreateTable
CREATE TABLE "th_perfi" (
    "per_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "per_modi" TIMESTAMP NOT NULL,
    "per_desp" VARCHAR(50) NOT NULL,
    "per_desa" VARCHAR(50) NOT NULL,
    "per_nota" TEXT,

    CONSTRAINT "th_perfi_pkey" PRIMARY KEY ("per_codi")
);

-- CreateTable
CREATE TABLE "tm_dispo" (
    "dis_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(11) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "dis_sral" VARCHAR(50) NOT NULL,
    "dis_vers" VARCHAR(20) NOT NULL,
    "dis_iplo" VARCHAR(15) NOT NULL,
    "dis_stdo" VARCHAR(20) NOT NULL,

    CONSTRAINT "tm_dispo_pkey" PRIMARY KEY ("dis_codi")
);

-- CreateTable
CREATE TABLE "tm_senso" (
    "sen_codi" VARCHAR(10) NOT NULL,
    "sen_nomb" VARCHAR(50) NOT NULL,
    "sen_tmed" VARCHAR(50) NOT NULL,
    "sen_unit" VARCHAR(10) NOT NULL,

    CONSTRAINT "tm_senso_pkey" PRIMARY KEY ("sen_codi")
);

-- CreateTable
CREATE TABLE "tc_confi" (
    "con_codi" VARCHAR(10) NOT NULL,
    "dis_codi" VARCHAR(10) NOT NULL,
    "sen_codi" VARCHAR(10) NOT NULL,
    "con_stdo" BOOLEAN NOT NULL,

    CONSTRAINT "tc_confi_pkey" PRIMARY KEY ("con_codi")
);

-- CreateTable
CREATE TABLE "tc_umbra" (
    "umb_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "sen_codi" VARCHAR(10) NOT NULL,
    "umb_limi" DOUBLE PRECISION NOT NULL,
    "umb_lims" DOUBLE PRECISION NOT NULL,
    "umb_ajus" TIMESTAMP NOT NULL,

    CONSTRAINT "tc_umbra_pkey" PRIMARY KEY ("umb_codi")
);

-- CreateTable
CREATE TABLE "tm_categ" (
    "cat_codi" VARCHAR(10) NOT NULL,
    "cat_nomb" VARCHAR(50) NOT NULL,
    "cat_deta" TEXT,

    CONSTRAINT "tm_categ_pkey" PRIMARY KEY ("cat_codi")
);

-- CreateTable
CREATE TABLE "tm_activ" (
    "act_codi" VARCHAR(10) NOT NULL,
    "rep_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10),
    "act_trea" VARCHAR(60) NOT NULL,
    "act_meta" TEXT,
    "act_guia" TEXT,
    "act_time" INTEGER,

    CONSTRAINT "tm_activ_pkey" PRIMARY KEY ("act_codi")
);

-- CreateTable
CREATE TABLE "tm_instr" (
    "ins_codi" VARCHAR(10) NOT NULL,
    "ins_cont" VARCHAR(255) NOT NULL,
    "ins_audi" VARCHAR(255),

    CONSTRAINT "tm_instr_pkey" PRIMARY KEY ("ins_codi")
);

-- CreateTable
CREATE TABLE "tc_guias" (
    "gui_codi" VARCHAR(10) NOT NULL,
    "act_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(10) NOT NULL,
    "gui_caus" VARCHAR(20) NOT NULL,
    "gui_nvlu" INTEGER NOT NULL,

    CONSTRAINT "tc_guias_pkey" PRIMARY KEY ("gui_codi")
);

-- CreateTable
CREATE TABLE "tc_asign" (
    "asi_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "asi_inic" DATE NOT NULL,
    "asi_stdo" VARCHAR(20) NOT NULL,

    CONSTRAINT "tc_asign_pkey" PRIMARY KEY ("asi_codi")
);

-- CreateTable
CREATE TABLE "tr_sesio" (
    "ses_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "act_codi" VARCHAR(10) NOT NULL,
    "dis_codi" VARCHAR(10) NOT NULL,
    "ses_inic" TIMESTAMP NOT NULL,
    "ses_cerr" TIMESTAMP,
    "ses_nota" TEXT,

    CONSTRAINT "tr_sesio_pkey" PRIMARY KEY ("ses_codi")
);

-- CreateTable
CREATE TABLE "tr_telem" (
    "tel_codi" VARCHAR(10) NOT NULL,
    "ses_codi" VARCHAR(10) NOT NULL,
    "con_codi" VARCHAR(10) NOT NULL,
    "tel_regi" DOUBLE PRECISION NOT NULL,
    "tel_marc" INTEGER NOT NULL,
    "tel_calid" DOUBLE PRECISION,

    CONSTRAINT "tr_telem_pkey" PRIMARY KEY ("tel_codi")
);

-- CreateTable
CREATE TABLE "tr_estad" (
    "est_codi" VARCHAR(10) NOT NULL,
    "ses_codi" VARCHAR(10) NOT NULL,
    "est_dete" VARCHAR(50) NOT NULL,
    "est_time" TIMESTAMP NOT NULL,

    CONSTRAINT "tr_estad_pkey" PRIMARY KEY ("est_codi")
);

-- CreateTable
CREATE TABLE "tr_citas" (
    "cit_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "cit_fech" DATE NOT NULL,
    "cit_hora" VARCHAR(10) NOT NULL,
    "cit_tipo" VARCHAR(50) NOT NULL,
    "cit_estd" VARCHAR(20) NOT NULL,
    "cit_nota" TEXT,

    CONSTRAINT "tr_citas_pkey" PRIMARY KEY ("cit_codi")
);

-- CreateTable
CREATE TABLE "tr_alert" (
    "ale_codi" VARCHAR(10) NOT NULL,
    "ses_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(10) NOT NULL,
    "ale_time" TIMESTAMP NOT NULL,
    "ale_meto" VARCHAR(50) NOT NULL,

    CONSTRAINT "tr_alert_pkey" PRIMARY KEY ("ale_codi")
);

-- CreateTable
CREATE TABLE "tr_metaspei" (
    "met_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "esp_codi" VARCHAR(11) NOT NULL,
    "met_desc" TEXT NOT NULL,
    "met_trial" INTEGER NOT NULL DEFAULT 0,
    "met_ttria" INTEGER NOT NULL DEFAULT 20,
    "met_prog" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "met_estd" VARCHAR(20) NOT NULL,
    "met_crea" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_metaspei_pkey" PRIMARY KEY ("met_codi")
);

-- CreateTable
CREATE TABLE "tr_feedb" (
    "fed_codi" VARCHAR(10) NOT NULL,
    "ale_codi" VARCHAR(10) NOT NULL,
    "fed_efec" BOOLEAN,
    "fed_resp" TEXT,
    "com_padr" TEXT,

    CONSTRAINT "tr_feedb_pkey" PRIMARY KEY ("fed_codi")
);

-- CreateTable
CREATE TABLE "tr_repor" (
    "rpt_cod" VARCHAR(10) NOT NULL,
    "rpt_nin" VARCHAR(10) NOT NULL,
    "rpt_esp" VARCHAR(11) NOT NULL,
    "rpt_inpe" DATE NOT NULL,
    "rpt_finp" DATE NOT NULL,
    "rpt_sesi" INTEGER NOT NULL,
    "rpt_meta" DOUBLE PRECISION NOT NULL,
    "rpt_nota" TEXT,
    "rpt_graf" VARCHAR(255),
    "rpt_nube" BOOLEAN NOT NULL,

    CONSTRAINT "tr_repor_pkey" PRIMARY KEY ("rpt_cod")
);

-- CreateTable
CREATE TABLE "tm_admin" (
    "adm_codi" VARCHAR(11) NOT NULL,
    "usu_codi" VARCHAR(10) NOT NULL,
    "ins_codi" VARCHAR(11) NOT NULL,
    "adm_nomb" VARCHAR(50) NOT NULL,
    "adm_apel" VARCHAR(50) NOT NULL,

    CONSTRAINT "tm_admin_pkey" PRIMARY KEY ("adm_codi")
);

-- CreateTable
CREATE TABLE "tr_bitac" (
    "bit_codi" VARCHAR(10) NOT NULL,
    "nin_codi" VARCHAR(10) NOT NULL,
    "bit_fech" DATE NOT NULL,
    "bit_suen" DOUBLE PRECISION NOT NULL,
    "bit_cali" VARCHAR(30) NOT NULL,
    "bit_anim" VARCHAR(30) NOT NULL,
    "bit_apet" VARCHAR(30) NOT NULL,
    "bit_bpm" INTEGER,
    "bit_obse" TEXT,
    "bit_crea" TIMESTAMP NOT NULL,
    "bit_crisi" INTEGER,
    "bit_dese" TEXT,
    "bit_senso" VARCHAR(50),
    "bit_medi" BOOLEAN,
    "bit_diges" VARCHAR(50),

    CONSTRAINT "tr_bitac_pkey" PRIMARY KEY ("bit_codi")
);

-- CreateTable
CREATE TABLE "tr_audito" (
    "aud_codi" VARCHAR(10) NOT NULL,
    "usu_codi" VARCHAR(10) NOT NULL,
    "aud_tipo" VARCHAR(20) NOT NULL,
    "aud_desc" TEXT NOT NULL,
    "aud_ip" VARCHAR(45),
    "aud_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tr_audito_pkey" PRIMARY KEY ("aud_codi")
);

-- CreateIndex
CREATE UNIQUE INDEX "tm_espec_usu_codi_key" ON "tm_espec"("usu_codi");

-- CreateIndex
CREATE UNIQUE INDEX "tm_repre_usu_codi_key" ON "tm_repre"("usu_codi");

-- CreateIndex
CREATE UNIQUE INDEX "tm_dispo_dis_sral_key" ON "tm_dispo"("dis_sral");

-- CreateIndex
CREATE UNIQUE INDEX "tm_admin_usu_codi_key" ON "tm_admin"("usu_codi");

-- AddForeignKey
ALTER TABLE "tm_roles" ADD CONSTRAINT "tm_roles_per_codi_fkey" FOREIGN KEY ("per_codi") REFERENCES "tm_permi"("per_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_usuar" ADD CONSTRAINT "tm_usuar_rol_codi_fkey" FOREIGN KEY ("rol_codi") REFERENCES "tm_roles"("rol_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_espec" ADD CONSTRAINT "tm_espec_usu_codi_fkey" FOREIGN KEY ("usu_codi") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_espec" ADD CONSTRAINT "tm_espec_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_espec" ADD CONSTRAINT "tm_espec_esc_codi_fkey" FOREIGN KEY ("esc_codi") REFERENCES "tm_especi"("esc_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_ninos" ADD CONSTRAINT "tm_ninos_sen_codi_fkey" FOREIGN KEY ("sen_codi") REFERENCES "tc_sensi"("sen_codi") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_ninos" ADD CONSTRAINT "tm_ninos_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_repre" ADD CONSTRAINT "tm_repre_usu_codi_fkey" FOREIGN KEY ("usu_codi") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_repre" ADD CONSTRAINT "tm_repre_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_sensi" ADD CONSTRAINT "tc_sensi_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "th_perfi" ADD CONSTRAINT "th_perfi_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_dispo" ADD CONSTRAINT "tm_dispo_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_dispo" ADD CONSTRAINT "tm_dispo_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_confi" ADD CONSTRAINT "tc_confi_dis_codi_fkey" FOREIGN KEY ("dis_codi") REFERENCES "tm_dispo"("dis_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_confi" ADD CONSTRAINT "tc_confi_sen_codi_fkey" FOREIGN KEY ("sen_codi") REFERENCES "tm_senso"("sen_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_umbra" ADD CONSTRAINT "tc_umbra_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_umbra" ADD CONSTRAINT "tc_umbra_sen_codi_fkey" FOREIGN KEY ("sen_codi") REFERENCES "tm_senso"("sen_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_activ" ADD CONSTRAINT "tm_activ_rep_codi_fkey" FOREIGN KEY ("rep_codi") REFERENCES "tm_categ"("cat_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_activ" ADD CONSTRAINT "tm_activ_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_guias" ADD CONSTRAINT "tc_guias_act_codi_fkey" FOREIGN KEY ("act_codi") REFERENCES "tm_activ"("act_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_guias" ADD CONSTRAINT "tc_guias_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_instr"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_asign" ADD CONSTRAINT "tc_asign_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tc_asign" ADD CONSTRAINT "tc_asign_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_sesio" ADD CONSTRAINT "tr_sesio_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_sesio" ADD CONSTRAINT "tr_sesio_act_codi_fkey" FOREIGN KEY ("act_codi") REFERENCES "tm_activ"("act_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_sesio" ADD CONSTRAINT "tr_sesio_dis_codi_fkey" FOREIGN KEY ("dis_codi") REFERENCES "tm_dispo"("dis_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_telem" ADD CONSTRAINT "tr_telem_ses_codi_fkey" FOREIGN KEY ("ses_codi") REFERENCES "tr_sesio"("ses_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_telem" ADD CONSTRAINT "tr_telem_con_codi_fkey" FOREIGN KEY ("con_codi") REFERENCES "tc_confi"("con_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_estad" ADD CONSTRAINT "tr_estad_ses_codi_fkey" FOREIGN KEY ("ses_codi") REFERENCES "tr_sesio"("ses_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_citas" ADD CONSTRAINT "tr_citas_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_citas" ADD CONSTRAINT "tr_citas_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_alert" ADD CONSTRAINT "tr_alert_ses_codi_fkey" FOREIGN KEY ("ses_codi") REFERENCES "tr_sesio"("ses_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_alert" ADD CONSTRAINT "tr_alert_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_instr"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_metaspei" ADD CONSTRAINT "tr_metaspei_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_metaspei" ADD CONSTRAINT "tr_metaspei_esp_codi_fkey" FOREIGN KEY ("esp_codi") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_feedb" ADD CONSTRAINT "tr_feedb_ale_codi_fkey" FOREIGN KEY ("ale_codi") REFERENCES "tr_alert"("ale_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_repor" ADD CONSTRAINT "tr_repor_rpt_nin_fkey" FOREIGN KEY ("rpt_nin") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_repor" ADD CONSTRAINT "tr_repor_rpt_esp_fkey" FOREIGN KEY ("rpt_esp") REFERENCES "tm_espec"("esp_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_admin" ADD CONSTRAINT "tm_admin_usu_codi_fkey" FOREIGN KEY ("usu_codi") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tm_admin" ADD CONSTRAINT "tm_admin_ins_codi_fkey" FOREIGN KEY ("ins_codi") REFERENCES "tm_insti"("ins_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_bitac" ADD CONSTRAINT "tr_bitac_nin_codi_fkey" FOREIGN KEY ("nin_codi") REFERENCES "tm_ninos"("nin_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tr_audito" ADD CONSTRAINT "tr_audito_usu_codi_fkey" FOREIGN KEY ("usu_codi") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;

