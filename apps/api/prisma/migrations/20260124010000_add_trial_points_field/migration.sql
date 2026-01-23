-- AlterTable - 新增試用期點數欄位
-- 試用點數獨立於購買點數，扣除順序：trialPoints → freePoints → points
ALTER TABLE "User" ADD COLUMN "trialPoints" INTEGER NOT NULL DEFAULT 0;

-- 更新免費點數預設值為 0（試用結束後才會每日補 2 點）
ALTER TABLE "User" ALTER COLUMN "freePoints" SET DEFAULT 0;

-- 移轉現有試用中用戶：將 points 中的試用點數移到 trialPoints
-- 注意：只影響 trialStartDate 有值且 trialEndedProcessed = false 的用戶
-- 這些用戶的部分 points 可能包含試用點數（最多 40 點）
-- 為避免影響已儲值的用戶，這裡不自動移轉，由管理員手動處理
