import { chromium } from "playwright";
import {
  BaseOptions,
  BatchOptions,
  color,
  getTargetConfig,
  sleep,
  waitUntil,
} from "./utils/index.js";
import { login, runJob } from "./core/scenario.js";
import "dotenv/config";

(async () => {
  const entryUrl = process.env.SITE_BASE_URL as string;
  const email = process.env.EMAIL as string;
  const password = process.env.PASSWORD as string;

  const { targetDateTimeOptions, batchOptionsArr } = getTargetConfig();

  if (1 == 1) return;

  console.log(color("operation", "Launching browser..."));
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login({
      entryUrl,
      page,
      email,
      password,
    });

    await waitUntil(targetDateTimeOptions);

    // run batch jobs (parallel async job not working as expected)
    for (const [jobIndex, batchOptions] of batchOptionsArr.entries()) {
      const page = await context.newPage();
      await runJob({ batchOptions, page, jobIndex });
    }

    // wait for 30 seconds before closing the browser
    await sleep(30000);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(e as any);
    console.error(color("error", `An error occurred. ${err.message}`));
  }

  await browser.close();
})();
