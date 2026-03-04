-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "subscribers" BIGINT,
    "totalViews" BIGINT,
    "videoCount" INTEGER,
    "description" TEXT,
    "joinedDate" DATETIME,
    "country" TEXT,
    "url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "topicCategories" TEXT,
    "darkType" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "trackedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("avatarUrl", "bannerUrl", "country", "darkType", "description", "handle", "id", "joinedDate", "name", "notes", "subscribers", "tags", "topicCategories", "totalViews", "trackedAt", "url", "verified", "videoCount") SELECT "avatarUrl", "bannerUrl", "country", "darkType", "description", "handle", "id", "joinedDate", "name", "notes", "subscribers", "tags", "topicCategories", "totalViews", "trackedAt", "url", "verified", "videoCount" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "views" BIGINT,
    "likes" BIGINT,
    "comments" BIGINT,
    "duration" TEXT,
    "publishedAt" DATETIME,
    "type" TEXT,
    "transcript" TEXT,
    "aiAnalysis" TEXT,
    "userId" TEXT,
    CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("aiAnalysis", "channelId", "comments", "duration", "id", "likes", "publishedAt", "thumbnailUrl", "title", "transcript", "type", "views") SELECT "aiAnalysis", "channelId", "comments", "duration", "id", "likes", "publishedAt", "thumbnailUrl", "title", "transcript", "type", "views" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
