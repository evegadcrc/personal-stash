-- CreateTable
CREATE TABLE "CategoryIcon" (
    "ownerEmail" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "CategoryIcon_pkey" PRIMARY KEY ("ownerEmail","categoryName")
);

-- AddForeignKey
ALTER TABLE "CategoryIcon" ADD CONSTRAINT "CategoryIcon_ownerEmail_fkey" FOREIGN KEY ("ownerEmail") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;
