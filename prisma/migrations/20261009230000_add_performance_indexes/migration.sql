-- CreateIndex
CREATE INDEX IF NOT EXISTS "tc_asign_nin_codi_idx" ON "tc_asign"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tc_asign_esp_codi_idx" ON "tc_asign"("esp_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tm_repre_ninos_nin_codi_idx" ON "tm_repre_ninos"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tm_conse_nin_codi_idx" ON "tm_conse"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tm_conse_rep_cod_idx" ON "tm_conse"("rep_cod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tm_ninos_ins_codi_idx" ON "tm_ninos"("ins_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_alert_ses_codi_idx" ON "tr_alert"("ses_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_alert_ale_time_idx" ON "tr_alert"("ale_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_audito_usu_codi_idx" ON "tr_audito"("usu_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_audito_aud_time_idx" ON "tr_audito"("aud_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_bitac_nin_codi_idx" ON "tr_bitac"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_bitac_bit_fech_idx" ON "tr_bitac"("bit_fech");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_estad_ses_codi_idx" ON "tr_estad"("ses_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_incid_nin_codi_idx" ON "tr_incid"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_incid_esp_codi_idx" ON "tr_incid"("esp_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_incid_inc_time_idx" ON "tr_incid"("inc_time");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_indic_nin_codi_idx" ON "tr_indic"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_indic_esp_codi_idx" ON "tr_indic"("esp_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_indic_ind_leid_idx" ON "tr_indic"("ind_leid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_metaspei_nin_codi_idx" ON "tr_metaspei"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_metaspei_esp_codi_idx" ON "tr_metaspei"("esp_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_repor_rpt_nin_idx" ON "tr_repor"("rpt_nin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_repor_rpt_esp_idx" ON "tr_repor"("rpt_esp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_sesio_nin_codi_idx" ON "tr_sesio"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_sesio_act_codi_idx" ON "tr_sesio"("act_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_sesio_ses_inic_idx" ON "tr_sesio"("ses_inic");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_soap_nin_codi_idx" ON "tr_soap"("nin_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_soap_esp_codi_idx" ON "tr_soap"("esp_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_telem_ses_codi_idx" ON "tr_telem"("ses_codi");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tr_telem_ses_codi_tel_marc_idx" ON "tr_telem"("ses_codi", "tel_marc");
