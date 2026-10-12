-- CreateTable
CREATE TABLE IF NOT EXISTS "tm_reporte_prog" (
    "rpr_id" VARCHAR(20) NOT NULL DEFAULT 'DEFAULT',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'weekly',
    "day" VARCHAR(20) NOT NULL DEFAULT 'lunes',
    "time" VARCHAR(10) NOT NULL DEFAULT '08:00',
    "email" VARCHAR(100) NOT NULL DEFAULT '',
    "additionalEmails" TEXT,
    "subject" VARCHAR(200) NOT NULL DEFAULT 'Reporte Ejecutivo de Gestión Clínica — SIAT',
    "modules" JSONB,
    "last_sent" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tm_reporte_prog_pkey" PRIMARY KEY ("rpr_id")
);
