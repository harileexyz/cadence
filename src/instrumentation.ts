export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_EMBEDDED_WORKER !== "true"
  ) {
    const { startEmbeddedWorker } = await import("./worker/embedded");
    startEmbeddedWorker();
  }
}
