import { createLogger } from "@repo/shared";

const log = createLogger("template");

async function main(): Promise<void> {
  log.info("script loaded");
}

void main().catch((err) => log.error(err));
