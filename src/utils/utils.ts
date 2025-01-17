import chalk from "chalk";

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

export type BatchOption = {
  dateTimeOptions: DateTimeOptions;
  targetUrl: string;
  targetVenue: string;
  targetOpenTime: string;
};

const checkTimeStringRegex = (time: string) => {
  const regex = new RegExp(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  return regex.test(time);
};

export const waitUntil = async (targetTime: DateTimeOptions) => {
  /**
   * Convert the target time to the local time zone,
   * and then use an infinite loop to wait until the target time.
   */

  const { timeZone, time } = targetTime;

  if (!checkTimeStringRegex(time)) {
    console.log(
      color(
        "error",
        "Invalid time format. Please use the following format: 'YYYY-MM-DD HH:mm:ss'"
      )
    );
    process.exit(1);
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
        "operation",
        `Waiting until ${targetDateTimeLocal}. Current time: ${new Date().toLocaleString(
          "en-US",
          { timeZone }
        )}, Time left: ${Math.floor(
          (targetDateTimeLocalFormatted - new Date().getTime()) / 1000
        )} seconds`
      )
    );
    await sleep(1000);
  }

  console.log(
    color("operation", `Target time reached: ${targetDateTimeLocal}`)
  );
};
