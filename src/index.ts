import { chromium } from "playwright";
import {
  BaseOption,
  BatchOption,
  color,
  sleep,
  waitUntil,
} from "./utils/index.js";
import { login, runJob } from "./core/scenario.js";
import "dotenv/config";

(async () => {
  // define the environment variables
  const entryUrl = process.env.SITE_BASE_URL as string;
  const email = process.env.EMAIL as string;
  const password = process.env.PASSWORD as string;

  const targetDateTimeOption = {
    timeZone: "Asia/Tokyo",
    time: "2025-01-18 10:00:00",
  };

  const baseOption: BaseOption = {
    targetUrl:
      "https://asobiticket2.asobistore.jp/receptions/7afc1754-bc25-40f7-9af7-94d3a5390aa3",
    paymentMethod: "セブン-イレブン",
  };

  const batchOptions: BatchOption[] = [
    {
      ...baseOption,
      targetDate: "2025/02/16",
      targetVenue: "渋谷クラブクアトロ＜昼の部＞",
      targetOpenTime: "OPEN " + "14:30",
      companion: false,
    },
    // {
    //   ...baseOption,
    //   targetDate: "2025/02/16",
    //   targetVenue: "渋谷クラブクアトロ＜夜の部＞",
    //   targetOpenTime: "OPEN " + "17:45",
    //   companion: false,
    // },
  ];

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

    await waitUntil(targetDateTimeOption);

    // run batch jobs (parallel async job not working as expected)
    for (const [jobIndex, batchOption] of batchOptions.entries()) {
      const page = await context.newPage();
      await runJob({ batchOption, page, jobIndex });
    }

    // wait for 30 seconds before closing the browser
    await sleep(30000);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(e as any);
    console.error(color("error", `An error occurred. ${err.message}`));
  }

  await browser.close();
})();
