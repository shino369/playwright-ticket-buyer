import { Page } from "playwright";

export type ColorType = "text" | "variable" | "error" | "operation";

export type DateTimeOptions = {
  timeZone: string; // e.g. "Asia/Tokyo"
  time: string; // e.g. "2025-01-01 17:46:00"
};

export type PaymentMethod =
  | "ローソン"
  | "セブン-イレブン"
  | "ファミリーマート"
  | "クレジットカード";

export type BaseOptions = {
  targetUrl: string;
  paymentMethod: PaymentMethod;
};

export type BatchOptions = {
  targetDate: string;
  targetVenue: string;
  targetOpenTime: string;
  companion: boolean;
} & BaseOptions;

export type Job = {
  batchOptions: BatchOptions;
  page: Page;
  jobIndex: number;
};

export type TargetConfig = {
  timeZone: string;
  startTime: string;
  targetUrl: string;
  paymentMethod: PaymentMethod;
  batchOptionsArr: {
    targetDate: string;
    targetVenue: string;
    targetOpenTime: string;
    companion: boolean;
  }[];
};