/*
  Warnings:

  - You are about to drop the `Queries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Queries";

-- CreateTable
CREATE TABLE "Query" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "asin" TEXT,
    "priceAlert" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Query_keyword_key" ON "Query"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Query_asin_key" ON "Query"("asin");
