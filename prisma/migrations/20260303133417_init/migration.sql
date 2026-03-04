-- CreateTable
CREATE TABLE "Channel" (
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
    "trackedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Video" (
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
    CONSTRAINT "Video_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChannelMetricsHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "subscribers" BIGINT,
    "totalViews" BIGINT,
    "avgViewsPerVideo" REAL,
    "estimatedMonthlyViews" BIGINT,
    "estimatedRevenue" REAL,
    "darkScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelMetricsHistory_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
