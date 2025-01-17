import chalk from "chalk";
import { Page } from "playwright";

/**
 * Colorize the message with the specified color.
 */
type ColorType = "text" | "variable" | "error" | "operation";
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

type DateTimeOptions = {
  timeZone: string; // e.g. "Asia/Tokyo"
  time: string; // e.g. "2025-01-01 17:46:00"
};

type PaymentMethod = "ローソン" | "セブン-イレブン" | "ファミリーマート";

export type BaseOption = {
  targetUrl: string;
  paymentMethod: PaymentMethod;
};

export type BatchOption = {
  targetDate: string;
  targetVenue: string;
  targetOpenTime: string;
  companion: boolean;
} & BaseOption;

const checkTimeStringRegex = (time: string) => {
  const regex = new RegExp(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  return regex.test(time);
};

export const waitUntil = async (targetTime: DateTimeOptions) => {
  /**
   * Convert the target time to the local time zone,
   * and then use an infinite loop to wait until the target time.
   */

  console.log(color("operation", `Waiting until the target time...`));

  const { timeZone, time } = targetTime;

  if (!checkTimeStringRegex(time)) {
    throw new Error(
      "Invalid time format. Please use the following format: 'YYYY-MM-DD HH:mm:ss'"
    );
  }

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
  // targetDate: "2025/03/01"

  const [year, month, day] = targetDate.split("/");
  return { year, month, day };
};
