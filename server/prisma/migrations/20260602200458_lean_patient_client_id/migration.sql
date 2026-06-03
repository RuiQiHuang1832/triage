-- Lean Patient: replace name/dateOfBirth (PII) with a frontend-generated clientId.
-- Add the column nullable first, backfill existing rows with random ids, then
-- enforce NOT NULL + UNIQUE so the migration succeeds on a table with data.
ALTER TABLE "Patient" ADD COLUMN "clientId" TEXT;
UPDATE "Patient" SET "clientId" = gen_random_uuid()::text WHERE "clientId" IS NULL;
ALTER TABLE "Patient" ALTER COLUMN "clientId" SET NOT NULL;

ALTER TABLE "Patient" DROP COLUMN "name";
ALTER TABLE "Patient" DROP COLUMN "dateOfBirth";

CREATE UNIQUE INDEX "Patient_clientId_key" ON "Patient"("clientId");
