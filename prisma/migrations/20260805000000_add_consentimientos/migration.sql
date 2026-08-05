CREATE TABLE "tm_conse" (
  "con_codi"  VARCHAR(10) PRIMARY KEY,
  "nin_codi"  VARCHAR(10) NOT NULL REFERENCES "tm_ninos"("nin_codi"),
  "rep_cod"   VARCHAR(10) NOT NULL REFERENCES "tm_repre"("rep_cod"),
  "con_vers"  VARCHAR(10) NOT NULL,
  "con_fech"  TIMESTAMP   NOT NULL DEFAULT NOW(),
  "con_ip"    VARCHAR(45),
  "con_acep"  BOOLEAN     NOT NULL DEFAULT false,
  "con_text"  TEXT        NOT NULL
);
