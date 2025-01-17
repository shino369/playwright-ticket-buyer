import { chromium } from "playwright";
import { BatchOption, color, sleep } from "./utils/index.js";
import { login, runJob } from "./core/scenario.js";
import "dotenv/config";

(async () => {
  // Launch the browser
  console.log(color("operation", "Launching browser..."));
  const browser = await chromium.launch({
    headless: false,
  });

  const siteUrl = process.env.SITE_BASE_URL as string;
  const email = process.env.EMAIL as string;
  const password = process.env.PASSWORD as string;

  const page = await browser.newPage();
  console.log(color("operation", "Browser launched."));

  await login({
    entryUrl: siteUrl,
    page,
    email,
    password,
  });

  const targetUrl = process.env.TARGET_URL as string;

  const targetSellTime = {
    timeZone: "Asia/Tokyo",
    time: process.env.TARGET_TIME as string,
  };

  const batchOptions: BatchOption[] = [
    {
      dateTimeOptions: targetSellTime,
      targetUrl: targetUrl,
      targetVenue: process.env.TARGET_VENUE as string,
      targetOpenTime: "OPEN " + process.env.TARGET_OPEN_TIME as string,
    },
  ];

  for (const batchOption of batchOptions) {
    await runJob({ batchOption, page });
  }

  await browser.close();
})();
