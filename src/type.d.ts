export * from "./";

declare global {
    namespace NodeJS {
      interface ProcessEnv {
        SITE_BASE_URL: string;
        EMAIL: string;
        PASSWORD: string;
      }
    }
  }
