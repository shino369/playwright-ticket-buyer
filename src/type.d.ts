export * from "./";

declare global {
    namespace NodeJS {
      interface ProcessEnv {
        SITE_BASE_URL: string;
        TARGET_URL: string;
        TARGET_TIME: string;
        TARGET_VENUE: string;
        TARGET_OPEN_TIME: string;
        ADD_COMPANION: '0' | '1';
        EMAIL: string;
        PASSWORD: string;
      }
    }
  }
