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

export const rethrowIfInstanceOf = (e: any) => {
  if (e instanceof TicketNotAvailableException) {
    throw e;
  }

  if (e instanceof TicketNotFoundException) {
    throw e;
  }
};
