-- CreateTable
CREATE TABLE "tm_passkeys" (
    "pk_id" VARCHAR(200) NOT NULL,
    "usu_codi" VARCHAR(10) NOT NULL,
    "pk_nomb" VARCHAR(60) NOT NULL,
    "pk_public_key" TEXT NOT NULL,
    "pk_transports" TEXT,
    "pk_counter" INTEGER NOT NULL DEFAULT 0,
    "pk_created" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pk_last_used" TIMESTAMP,

    CONSTRAINT "tm_passkeys_pkey" PRIMARY KEY ("pk_id")
);

-- AddForeignKey
ALTER TABLE "tm_passkeys" ADD CONSTRAINT "tm_passkeys_usu_codi_fkey" FOREIGN KEY ("usu_codi") REFERENCES "tm_usuar"("usu_codi") ON DELETE RESTRICT ON UPDATE CASCADE;