-- CreateTable
CREATE TABLE "tm_pref_notif" (
    "pnf_usuario" VARCHAR(10) NOT NULL,
    "ale_corr" BOOLEAN NOT NULL DEFAULT true,
    "ale_push" BOOLEAN NOT NULL DEFAULT true,
    "res_diar" BOOLEAN NOT NULL DEFAULT true,
    "rec_sesi" BOOLEAN NOT NULL DEFAULT true,
    "noved" BOOLEAN NOT NULL DEFAULT false,
    "pnf_creac" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pnf_actua" TIMESTAMP(3),

    CONSTRAINT "tm_pref_notif_pkey" PRIMARY KEY ("pnf_usuario")
);

-- AddForeignKey
ALTER TABLE "tm_pref_notif" ADD CONSTRAINT "tm_pref_notif_pnf_usuario_fkey" FOREIGN KEY ("pnf_usuario") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;
