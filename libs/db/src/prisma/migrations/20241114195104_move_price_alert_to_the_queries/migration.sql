/*
  Warnings:

  - You are about to drop the column `priceAlert` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "priceAlert";

-- AlterTable
ALTER TABLE "Queries" ADD COLUMN     "priceAlert" INTEGER;
