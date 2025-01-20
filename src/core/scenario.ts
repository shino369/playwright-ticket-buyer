import { BatchOptions, Job } from "../type.js";
import {
  ElementNotFoundException,
  TicketNotAvailableException,
  TicketNotFoundException,
} from "../excepctions/customException.js";
import {
  color,
  splitDateString,
  retryWithBackoff,
  waitUntilNextPageLoaded,
  rethrowIfInstanceOf,
  reloadCurrentPageBeforeRetry,
  sleep,
} from "../utils/utils.js";
import { BrowserContext, Page } from "playwright";
import { loginTimeout, pageLoadTimeout, visibleTimeout } from "../constants/constants.js";

export const login = async ({
  entryUrl,
  page,
  email,
  password,
}: {
  entryUrl: string;
  page: Page;
  email: string;
  password: string;
}) => {
  /** accept the cookies by clicking the button with id `onetrust-accept-btn-handler`
   * and then login by clicking button with classname `asobi_utility_login_btn`
   * page will be redirected to the login page
   * click the login button with class `c-button--login`
   * again accept the cookies by clicking the button with id `onetrust-accept-btn-handler`
   * there will be a form section to enter the login credentials
   * email with id `mail` and password with id `pass`
   * and a checkbox of keep me logged in with id `retention-c`
   * click the login button with id `btn-idpw-login`
   */

  console.log(color("operation", "Logging in..."));

  await page.goto(entryUrl);
  await page.waitForSelector("#onetrust-accept-btn-handler");
  await page.click("#onetrust-accept-btn-handler");
  await page.waitForSelector(".asobi_utility_login_btn");
  await page.click(".asobi_utility_login_btn");
  await page.waitForSelector(".c-button--login");
  await page.click(".c-button--login");
  await page.waitForSelector("#onetrust-accept-btn-handler");
  await page.click("#onetrust-accept-btn-handler");
  await page.waitForSelector("#mail");
  await page.fill("#mail", email);
  await page.fill("#pass", password);
  await page.check("#retention-c");
  await page.click(".l-contents");

  // wait until the attr `disabled` of the button with id `btn-idpw-login` is removed
  await page.waitForSelector("#btn-idpw-login:not([disabled])");
  await page.click("#btn-idpw-login");

  // wait until the page is redirected to entryUrl
  await page.waitForURL(entryUrl, {
    timeout: loginTimeout,
    waitUntil: "domcontentloaded",
  });

  // log the success message
  console.log(color("operation", "Logged in successfully."));
};

export const runJobByPirority = async ({
  batchOptionsArr,
  context,
}: {
  batchOptionsArr: BatchOptions[];
  context: BrowserContext;
}) => {
  let ErrorCount = 0;
  const page = await context.newPage();
  for (const [jobIndex, batchOptions] of batchOptionsArr.entries()) {
    try {
      await runJob({ batchOptions, page, jobIndex });
      // if the job is finished successfully, break the loop and ignore the rest of the jobs
      break;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(e as any);
      console.log(
        color(
          "error",
          `[${jobIndex}] job ${jobIndex} failed. Reason: ${err.message}`
        )
      );
      ErrorCount++;
    }
  }

  if (ErrorCount === batchOptionsArr.length) {
    throw new Error("All jobs failed.");
  }
};

export const runJob = async (job: Job) => {
  console.log(
    color("operation", [
      `[${job.jobIndex}] Running job...`,
      `Target date: ${job.batchOptions.targetDate}`,
      `Target venue: ${job.batchOptions.targetVenue}`,
      `Target open time: ${job.batchOptions.targetOpenTime}`,
    ])
  );
  const steps = [
    async () => proceedLandingPage(job),
    async () => proceedSelectTicketPage(job),
    async () => proceedSelectPaymentPage(job),
    async () => proceedTOSPage(job),
    async () => proceedFinishPage(job),
  ].map((step, index) => async () => {
    // retry the step with backoff
    await retryWithBackoff({
      fn: step,
      exceptionHandler: async (e) => {
        console.error(color("error", `An error occurred: ${e}`));
        rethrowIfInstanceOf(e);
        await reloadCurrentPageBeforeRetry(e, job);
      },
    });
  });

  for (const step of steps) {
    await step();
  }

  console.log(
    color(
      "operation",
      `[${job.jobIndex}] job ${job.jobIndex} finished successfully!`
    )
  );
};

const proceedLandingPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding landing page...`)
  );
  await checkSiteAvailability(job);
  await matchTargetLive(job);
  await waitUntilNextPageLoaded(job, "choice");
};

const proceedSelectTicketPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding select ticket page...`)
  );
  await selectLiveTicket(job);
  await addCompanion(job);
  await goNext(job);
  await waitUntilNextPageLoaded(job, "payment");
};

const proceedSelectPaymentPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding select payment page...`)
  );
  await selectPayment(job);
  await goNext(job);
  await waitUntilNextPageLoaded(job, "confirm");
};

const proceedTOSPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding terms of Service page...`)
  );
  await agreeTerms(job);
  await saveScreenshot(job);
  await goNext(job);
  await waitUntilNextPageLoaded(job, "complete");
};

const proceedFinishPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding finish page...`)
  );
  job.page.close();
};

/**
 * proceed to the next step by clicking the button with class `.next-button`
 * @param job
 */
const goNext = async (job: Job) => {
  const { page, jobIndex } = job;

  const nextBtnSelector = ".next-button";

  await page.waitForSelector(nextBtnSelector, { timeout: visibleTimeout });
  const nextBtn = page.locator(nextBtnSelector);
  const isVisible = await nextBtn.isVisible({ timeout: visibleTimeout });
  if (!isVisible) {
    throw new ElementNotFoundException(`[${jobIndex}] The go next button`);
  }
  await nextBtn.click();
};

/**
 * check site availability
 * @param job
 */
const checkSiteAvailability = async (job: Job) => {
  const { batchOptions, page, jobIndex } = job;
  const { targetUrl } = batchOptions;
  console.log(color("text", `[${jobIndex}] Going to the target site...`));

  const res = await page.goto(targetUrl, {
    timeout: pageLoadTimeout,
    waitUntil: "domcontentloaded",
  });

  // important to wait for the page to load correctly.
  // Some sites redirect back if the page does not exist
  await sleep(150); 

  await page.waitForURL(targetUrl, {
    timeout: visibleTimeout,
    waitUntil: "domcontentloaded",
  });

  if (res?.url() !== targetUrl || page.url() !== targetUrl) {
    throw new Error("The target site is not available.");
  }
};

/**
 * check if target live exist
 * @param job
 */
const matchTargetLive = async (job: Job) => {
  const { batchOptions, page, jobIndex } = job;
  const { targetDate, targetVenue, targetOpenTime } = batchOptions;

  console.log(color("text", `[${jobIndex}] Checking if target live exist...`));
  const splitedDate = splitDateString(targetDate);

  // wait until the target live is visible. has delay for the animation
  await page.waitForSelector(".tour-act", {
    timeout: visibleTimeout * 1.5,
  });

  /**
   * use playwright locate the target .tour-act with children:
   * 1. .act-venue with text `targetVenue`
   * 2. .open-time with text `targetOpenTime`
   * 3. .act-date-year with text `splitedDate.year`
   * 4. .act-date-month with text `splitedDate.month`
   * 5. .act-date-day with text `splitedDate.day`
   *
   * you should match all of the above children
   */

  const tourActs = page
    .locator(".tour-act", {
      has: page.locator(".act-venue", { hasText: targetVenue }),
    })
    .and(
      page.locator(".tour-act", {
        has: page.locator(".act-venue", { hasText: targetVenue }),
      })
    )
    .and(
      page.locator(".tour-act", {
        has: page.locator(".open-time", { hasText: targetOpenTime }),
      })
    )
    .and(
      page.locator(".tour-act", {
        has: page.locator(".act-date-year", { hasText: splitedDate.year }),
      })
    )
    .and(
      page.locator(".tour-act", {
        has: page.locator(".act-date-month", { hasText: splitedDate.month }),
      })
    )
    .and(
      page.locator(".tour-act", {
        has: page.locator(".act-date-day", { hasText: splitedDate.day }),
      })
    );

  const targetLive = tourActs;
  const istargetLiveVisible = await targetLive.isVisible({ timeout: visibleTimeout });

  if (!istargetLiveVisible) {
    throw new TicketNotFoundException();
  }
  const targetStatus = await targetLive.textContent({ timeout: visibleTimeout });
  console.log(color("text", targetStatus));

  const proceedBtn = targetLive.locator("button", { hasText: "申込み" });
  const isDisabled = await proceedBtn.evaluate((el) =>
    el.classList.contains("disabled")
  );
  if (isDisabled) {
    throw new TicketNotAvailableException();
  }

  await proceedBtn.click();
};

/**
 * select the live ticket type
 * @param job
 */
const selectLiveTicket = async (job: Job) => {
  const { page, jobIndex } = job;
  /**
   * locate the target button with the desired ticket type
   * radio group with query `tpl-radio-group.ng-untouched.ng-pristine.ng-valid`
   * and the target first radio button with query `tpl-radio-button`
   *  */

  console.log(color("text", `[${jobIndex}] Selecting ticket...`));

  const radioGroupSelector = "tpl-radio-group";
  const radioBtnSelector = "tpl-radio-button";

  await page.waitForSelector(radioGroupSelector, { timeout: visibleTimeout });
  const radioGroup = page.locator(radioGroupSelector);
  const radioBtn = radioGroup.locator(radioBtnSelector).first();
  const isVisible = await radioBtn.isVisible({ timeout: visibleTimeout });

  if (!isVisible) {
    throw new ElementNotFoundException(
      `[${jobIndex}] target radio button for selecting ticket`
    );
  }
  await radioBtn.click();
};

/**
 * add live companion, up to 1 companion (2 tickets in total)
 * @param job
 */
const addCompanion = async (job: Job) => {
  const { page, jobIndex, batchOptions } = job;

  if (!batchOptions.companion) return;

  /**
   * locate the target button of selecting the number of tickets
   * button with class `button.plus`
   * and the companion selector with query `tpl-companion-selector`
   */

  console.log(color("text", `[${jobIndex}] Adding a companion...`));

  const addTicketSelector = ".button.plus";
  const dialogBtnSelector = "tpl-companion-selector";

  const addTicket = page.locator(addTicketSelector);
  const isAddTicketVisible = await addTicket.isVisible({ timeout: visibleTimeout });

  if (!isAddTicketVisible) {
    throw new ElementNotFoundException(`${jobIndex} The add ticket button`);
  }
  await addTicket.click();
  const companion = page.locator(dialogBtnSelector);
  const isCompanionVisible = await companion.isVisible({ timeout: visibleTimeout });
  if (!isCompanionVisible) {
    throw new ElementNotFoundException(`${jobIndex} The companion selector`);
  }
  await companion.click();
  /**
   * modal dialog with class `cdk-dialog-container` will be shown
   * locate and click the first target div with class `companion`
   * then locate and click the button with class `.color-accent.size-small.type-filled.width-auto.icon-right`
   */

  const dialogSelector = ".cdk-dialog-container";
  const companionSelector = ".companion";
  const confirmSelector =
    ".color-accent.size-small.type-filled.width-auto.icon-right";

  await page.waitForSelector(dialogSelector, { timeout: visibleTimeout * 1.5 });
  // select the first companion
  const companionBtn = page.locator(companionSelector).first();
  const isCompanionBtnVisible = await companionBtn.isVisible({ timeout: visibleTimeout });
  if (!isCompanionBtnVisible) {
    throw new ElementNotFoundException(`${jobIndex} The companion button`);
  }
  await companionBtn.click();

  const confirmBtn = page.locator(confirmSelector);
  const isConfirmBtnVisible = await confirmBtn.isVisible({ timeout: visibleTimeout });
  if (!isConfirmBtnVisible) {
    throw new ElementNotFoundException(
      `[${jobIndex}] The confirm button for adding companion`
    );
  }
  await confirmBtn.click();
};

/**
 * select payment method
 * @param job
 */
const selectPayment = async (job: Job) => {
  const { page, jobIndex, batchOptions } = job;
  const { paymentMethod } = batchOptions;
  /**
   * again, locate the first element with query `tpl-radio-group`
   * locate the element with query `tpl-radio-button`which has text `セブン-イレブン`
   * click the button
   */

  console.log(color("text", `[${jobIndex}] Selecting payment method...`));

  const radioGroupSelector = "tpl-radio-group";
  const radioBtnSelector = "tpl-radio-button";

  await page.waitForSelector(radioGroupSelector, { timeout: visibleTimeout * 1.5 });
  const paymentRadioGroup = page.locator(radioGroupSelector).first();

  const paymentRadioBtn = paymentRadioGroup.locator(radioBtnSelector, {
    hasText: paymentMethod,
  });

  const isVisible = await paymentRadioBtn.isVisible({ timeout: visibleTimeout });
  if (!isVisible) {
    // if the target radio button is not visible, click the first one anyway
    await paymentRadioGroup.locator(radioBtnSelector).first().click();
  } else {
    await paymentRadioBtn.click();
  }
};

/**
 * agree the terms
 * @param job
 */
const agreeTerms = async (job: Job) => {
  const { page, jobIndex } = job;
  /**
   * locate the target element with query `tpl-checkbox`
   * click the button
   */

  console.log(color("text", `[${jobIndex}] Checking terms of service box...`));

  const checkboxSelector = "tpl-checkbox";
  await page.waitForSelector(checkboxSelector, { timeout: visibleTimeout });
  const checkbox = page.locator(checkboxSelector);
  const isVisible = await checkbox.isVisible({ timeout: visibleTimeout });
  if (!isVisible) {
    throw new ElementNotFoundException(
      `[${jobIndex}] The checkbox for terms of service`
    );
  }
  await checkbox.click();
};

/**
 * save a screenshot of the page
 * @param job
 */
const saveScreenshot = async (job: Job) => {
  const { page, jobIndex } = job;

  console.log(color("text", `[${jobIndex}] Saving the screenshot...`));
  const screenshotPath = `./screenshots/${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
};
