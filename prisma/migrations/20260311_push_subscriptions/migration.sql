CREATE TABLE "PushSubscription" (
  "id"        TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userEmail_idx" ON "PushSubscription"("userEmail");

ALTER TABLE "PushSubscription"
  ADD CONSTRAINT "PushSubscription_userEmail_fkey"
  FOREIGN KEY ("userEmail") REFERENCES "User"("email")
  ON DELETE CASCADE ON UPDATE CASCADE;
