/*
  Warnings:

  - You are about to drop the column `addedBy` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `shareId` on the `Item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_addedBy_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_shareId_fkey";

-- DropIndex
DROP INDEX "Item_shareId_idx";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "addedBy",
DROP COLUMN "shareId";

-- CreateTable
CREATE TABLE "SharedMembership" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedMembership_shareId_idx" ON "SharedMembership"("shareId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedMembership_itemId_shareId_key" ON "SharedMembership"("itemId", "shareId");

-- AddForeignKey
ALTER TABLE "SharedMembership" ADD CONSTRAINT "SharedMembership_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMembership" ADD CONSTRAINT "SharedMembership_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedMembership" ADD CONSTRAINT "SharedMembership_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
