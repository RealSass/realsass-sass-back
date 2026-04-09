-- CreateTable
CREATE TABLE "project_themes" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_themes_projectKey_key" ON "project_themes"("projectKey");

-- CreateIndex
CREATE INDEX "project_themes_projectKey_idx" ON "project_themes"("projectKey");

-- CreateIndex
CREATE INDEX "project_themes_organizationId_idx" ON "project_themes"("organizationId");

-- AddForeignKey
ALTER TABLE "project_themes" ADD CONSTRAINT "project_themes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
