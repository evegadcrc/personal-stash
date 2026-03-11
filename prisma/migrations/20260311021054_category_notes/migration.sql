-- CreateTable
CREATE TABLE "CategoryNote" (
    "ownerEmail" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryNote_pkey" PRIMARY KEY ("ownerEmail","categoryName")
);

-- AddForeignKey
ALTER TABLE "CategoryNote" ADD CONSTRAINT "CategoryNote_ownerEmail_fkey" FOREIGN KEY ("ownerEmail") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;
