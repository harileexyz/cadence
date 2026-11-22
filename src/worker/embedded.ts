import { prisma } from "@/lib/prisma";
import {
  cleanupPublishedMediaAssets,
  refreshExpiringInstagramTokens,
  runSchedulerTick,
} from "./scheduler";

const POLL_INTERVAL_MS = 15_000;
const MEDIA_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

const globalForWorker = globalThis as unknown as {
  cadenceWorkerStarted?: boolean;
};

export function startEmbeddedWorker(): void {
  if (globalForWorker.cadenceWorkerStarted) {
    return;
  }
  globalForWorker.cadenceWorkerStarted = true;
  console.log("[worker] Embedded Cadence scheduler worker started in single-process mode.");

  let tickInFlight = false;
  const pollTimer = setInterval(async () => {
    if (tickInFlight) return;
    tickInFlight = true;
    try {
      const processed = await runSchedulerTick({ prismaClient: prisma });
      if (processed > 0) {
        console.log(`[worker] Processed ${processed} due post target(s).`);
      }
    } catch (err) {
      console.error("[worker] Error during scheduler tick:", err);
    } finally {
      tickInFlight = false;
    }
  }, POLL_INTERVAL_MS);
  pollTimer.unref?.();

  let maintenanceInFlight = false;
  const runMaintenance = async () => {
    if (maintenanceInFlight) return;
    maintenanceInFlight = true;
    try {
      const count = await refreshExpiringInstagramTokens(prisma);
      if (count > 0) {
        console.log(`[worker] Proactively refreshed ${count} Instagram token(s).`);
      }
      const purged = await cleanupPublishedMediaAssets(prisma);
      if (purged > 0) {
        console.log(
          `[worker] Auto-purged ${purged} published media file(s) to save storage.`
        );
      }
    } catch (err) {
      console.error("[worker] Error during token/media maintenance:", err);
    } finally {
      maintenanceInFlight = false;
    }
  };

  void runMaintenance();
  const maintenanceTimer = setInterval(runMaintenance, MEDIA_CLEANUP_INTERVAL_MS);
  maintenanceTimer.unref?.();
}
