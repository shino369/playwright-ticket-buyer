export class TicketNotAvailableException extends Error {
  constructor() {
    super("Target ticket not available.");
  }
}

export class TicketNotFoundException extends Error {
  constructor() {
    super(
      "Target ticket not found. Please check if you have input the correct ticket detail."
    );
  }
}

export class ElementNotFoundException extends Error {
  constructor(str: string) {
    super(`${str} not found.`);
  }
}

export class PageNotLoadedCorrectlyException extends Error {
  constructor(e: any) {
    super(`Target next page not loaded correctly. ${e}`);
  }
}