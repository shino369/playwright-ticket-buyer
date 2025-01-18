export * from "./types/jobOptionsType.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SITE_BASE_URL: string;
      EMAIL: string;
      PASSWORD: string;
    }
  }
}
