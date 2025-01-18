import { chromium } from "playwright";
import { color, getTargetConfig, sleep, waitUntil } from "./utils/utils.js";
import { login, runJobByPirority } from "./core/scenario.js";
import "dotenv/config";

(async () => {
  const entryUrl = process.env.SITE_BASE_URL as string;
  const email = process.env.EMAIL as string;
  const password = process.env.PASSWORD as string;

  const { targetDateTimeOptions, batchOptionsArr } = getTargetConfig();

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
    await runJobByPirority({
      batchOptionsArr,
      context,
    });

    // wait for 30 seconds before closing the browser
    await sleep(30000);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(e as any);
    console.error(color("error", `Error: ${err.message}`));
  }

  await browser.close();
})();
