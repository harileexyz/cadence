import { prisma } from "@/lib/prisma";
import {
  cleanupPublishedMediaAssets,
  refreshExpiringInstagramTokens,
  runSchedulerTick,
} from "./scheduler";

const POLL_INTERVAL_MS = 15_000;
const TOKEN_MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MEDIA_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

let isRunning = true;

async function pollLoop() {
  console.log("[worker] Cadence scheduler worker started.");

  while (isRunning) {
    try {
      const processed = await runSchedulerTick({ prismaClient: prisma });
      if (processed > 0) {
        console.log(`[worker] Processed ${processed} due post target(s).`);
      }
    } catch (err) {
      console.error("[worker] Error during scheduler tick:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function tokenMaintenanceLoop() {
  while (isRunning) {
    try {
      const count = await refreshExpiringInstagramTokens(prisma);
      if (count > 0) {
        console.log(`[worker] Proactively refreshed ${count} Instagram token(s).`);
      }
      const purged = await cleanupPublishedMediaAssets(prisma);
      if (purged > 0) {
        console.log(`[worker] Auto-purged ${purged} published media file(s) to save storage.`);
      }
    } catch (err) {
      console.error("[worker] Error during token/media maintenance:", err);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, MEDIA_CLEANUP_INTERVAL_MS)
    );
  }
}

process.on("SIGINT", async () => {
  console.log("[worker] Shutting down...");
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

void Promise.all([pollLoop(), tokenMaintenanceLoop()]);
