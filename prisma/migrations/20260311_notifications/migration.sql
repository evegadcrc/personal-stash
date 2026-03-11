CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "fromName" TEXT,
  "type" TEXT NOT NULL,
  "itemId" TEXT,
  "itemTitle" TEXT,
  "shareId" TEXT,
  "categoryName" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_toEmail_read_idx" ON "Notification"("toEmail", "read");
CREATE INDEX "Notification_toEmail_createdAt_idx" ON "Notification"("toEmail", "createdAt");
