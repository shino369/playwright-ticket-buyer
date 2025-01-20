import chalk from "chalk";
import fs from "fs";
import { z } from "zod";
import {
  BaseOptions,
  BatchOptions,
  ColorType,
  DateTimeOptions,
  Job,
} from "../type.js";
import {
  PageNotLoadedCorrectlyException,
  TicketNotAvailableException,
  TicketNotFoundException,
} from "../excepctions/customException.js";
import { pageLoadTimeout } from "../constants/constants.js";

const themeColors = {
  text: "#ff8e4d",
  variable: "#ff624d",
  error: "#f5426c",
  operation: "#088F8F",
};

export const color = (color: ColorType, message: any) => {
  return chalk.hex(themeColors[color])(message);
};

export const sleep = async (ms: number) => {
  await new Promise((r) => setTimeout(r, ms));
};

export const waitUntil = async (targetTime: DateTimeOptions) => {
  /**
   * Convert the target time to the local time zone,
   * and then use an infinite loop to wait until the target time.
   */

  console.log(color("operation", `Waiting until the target time...`));

  const { timeZone, time } = targetTime;
  const targetDateTime = new Date(time);
  const targetDateTimeUTC = targetDateTime.toUTCString();
  const targetDateTimeLocal = new Date(targetDateTimeUTC).toLocaleString(
    "en-US",
    { timeZone }
  );
  const targetDateTimeLocalFormatted = new Date(targetDateTimeLocal).getTime();

  while (new Date().getTime() < targetDateTimeLocalFormatted) {
    console.log(
      color(
        "text",
        `Waiting until ${targetDateTimeLocal}. Current time: ${new Date().toLocaleString(
          "en-US",
          { timeZone }
        )}, Time left: ${Math.floor(
          (targetDateTimeLocalFormatted - new Date().getTime()) / 1000
        )} seconds`
      )
    );
    await sleep(250);
  }

  console.log(color("text", `Target time reached: ${targetDateTimeLocal}`));
};

export const splitDateString = (targetDate: string) => {
  const [year, month, day] = targetDate.split("/");
  return { year, month, day };
};

const validTimeZoneStr = (tz: string) => {
  if (!Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
    throw new Error("Time zones are not available in this environment");
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (ex) {
    return false;
  }
};

const TargetConfigSchema = z.object({
  timeZone: z
    .string()
    .refine(
      (str) => validTimeZoneStr(str),
      'Invalid time zone. Please use the IANA time zone database format, e.g. "Asia/Tokyo"'
    ),
  startTime: z
    .string()
    .regex(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
      "Invalid time format. Please use the following format: 'YYYY-MM-DD HH:mm:ss'"
    ),
  targetUrl: z.string().url(),
  paymentMethod: z.union([
    z.literal("ローソン"),
    z.literal("セブン-イレブン"),
    z.literal("ファミリーマート"),
    z.literal("クレジットカード"),
  ]),
  batchOptionsArr: z.array(
    z.object({
      targetDate: z
        .string()
        .regex(
          /^(\d{4})\/(\d{2})\/(\d{2})$/,
          "Invalid date format. Please use the following format: 'YYYY/MM/DD'"
        ),
      targetVenue: z.string(),
      targetOpenTime: z
        .string()
        .regex(
          /^(\d{2}):(\d{2})$/,
          "Invalid time format. Please use the following format: 'HH:mm'"
        ),
      companion: z.boolean(),
    })
  ),
});

type TargetConfig = z.infer<typeof TargetConfigSchema>;

export const getTargetConfig = () => {
  try {
    const rawData = fs.readFileSync("./target.json", "utf8");
    const config: TargetConfig = JSON.parse(rawData);

    TargetConfigSchema.parse(config);

    const targetDateTimeOptions = {
      timeZone: config.timeZone,
      time: config.startTime,
    };

    const baseOptions: BaseOptions = {
      targetUrl: config.targetUrl,
      paymentMethod: config.paymentMethod,
    };

    const batchOptionsArr: BatchOptions[] = config.batchOptionsArr.map(
      (opt) => ({
        ...baseOptions,
        ...opt,
        targetOpenTime: "OPEN " + opt.targetOpenTime,
      })
    );

    const formattedConfig = { targetDateTimeOptions, batchOptionsArr };
    console.log(formattedConfig);

    return formattedConfig;
  } catch (e) {
    console.error(color("error", `Error reading target.json`));

    if (e instanceof z.ZodError) {
      console.error(
        color(
          "error",
          e.errors.map((err) => `[${err.path}] ${err.message}`).join("\n")
        )
      );
    }

    process.exit(1);
  }
};

export const retryWithBackoff = async <T>({
  fn,
  exceptionHandler,
  maxRetries = 3,
  baseDelay = 250,
}: {
  fn: () => Promise<T>;
  exceptionHandler: (e: any) => Promise<void>;
  maxRetries?: number;
  baseDelay?: number;
}) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (e) {
      await exceptionHandler(e);
      if (attempt === maxRetries - 1) throw e;

      await sleep(baseDelay * 2 ** attempt);
      attempt++;
      console.log(color("text", `Retrying... Attempt ${attempt + 1}`));
    }
  }
  throw new Error("Max retries reached");
};

export const waitUntilNextPageLoaded = async (job: Job, step: string) => {
  const targetId = job.batchOptions.targetUrl.split("/").pop();
  const nextPageRegex = new RegExp(`entry/${targetId}/${step}`);
  try {
    await job.page.waitForURL(nextPageRegex, {
      timeout: pageLoadTimeout,
      waitUntil: "domcontentloaded",
    });
  } catch (e) {
    throw new PageNotLoadedCorrectlyException(e);
  }
};

export const rethrowIfInstanceOf = (e: any) => {
  if (e instanceof TicketNotAvailableException) {
    throw e;
  }

  if (e instanceof TicketNotFoundException) {
    throw e;
  }
};

export const reloadCurrentPageBeforeRetry = async (e: any, job: Job) => {
  if (e instanceof PageNotLoadedCorrectlyException) {
    console.log("Reloading current page...");
    await job.page.reload({ timeout: pageLoadTimeout, waitUntil: "domcontentloaded" });
  }
};
