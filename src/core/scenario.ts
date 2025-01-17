import { color, BatchOption, splitDateString } from "../utils/index.js";
import { Page } from "playwright";

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
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });

  // log the success message
  console.log(color("operation", "Logged in successfully."));
};

type Job = {
  batchOption: BatchOption;
  page: Page;
  jobIndex: number;
};

export const runJob = async (job: Job) => {
  try {
    await proceedLandingPage(job);
    await proceedSelectTicketPage(job);
    await proceedSelectPaymentPage(job);
    await proceedTOSPage(job);
    await proceedFinishPage(job);

    console.log(
      color(
        "operation",
        `[${job.jobIndex}] job ${job.jobIndex} finished successfully!`
      )
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error(e as any);
    console.log(
      color(
        "error",
        `[${job.jobIndex}] job ${job.jobIndex} failed. Error occurred: ${err.message}`
      )
    );
  }
};

const proceedLandingPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding landing page...`)
  );
  await checkSiteAvailability(job);
  await matchTargetLive(job);
};

const proceedSelectTicketPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding select ticket page...`)
  );
  await selectLiveTicket(job);
  await addCompanion(job);
  await goNext(job);
};

const proceedSelectPaymentPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding select payment page...`)
  );
  await selectPayment(job);
  await goNext(job);
};

const proceedTOSPage = async (job: Job) => {
  console.log(
    color("operation", `[${job.jobIndex}] Proceeding terms of Service page...`)
  );
  await agreeTerms(job);
  await saveScreenshot(job);
  await goNext(job);
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
  const { page } = job;

  await page.waitForSelector(".next-button");
  const nextBtn = page.locator(".next-button");
  if (!nextBtn) {
    throw new Error("The next button is not found.");
  }
  await nextBtn.click();
  await page.waitForLoadState("domcontentloaded");
};

/**
 * check site availability
 * @param job
 */
const checkSiteAvailability = async (job: Job) => {
  const { batchOption, page, jobIndex } = job;
  const { targetUrl } = batchOption;

  console.log(color("text", `[${jobIndex}] Going to the target site...`));

  try {
    await page.goto(targetUrl);
    await page.waitForURL(targetUrl, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });
  } catch (e) {
    const currentUrl = page.url();
    throw new Error(
      "The target page is not available. Current URL: " + currentUrl
    );
  }
};

/**
 * check if target live exist
 * @param job
 */
const matchTargetLive = async (job: Job) => {
  const { batchOption, page, jobIndex } = job;
  const { targetDate, targetVenue, targetOpenTime } = batchOption;

  console.log(color("text", `[${jobIndex}] Checking if target live exist...`));
  const splitedDate = splitDateString(targetDate);

  // locate the target button with the desired text
  await page.waitForSelector(".tour-act");

  /**
   * locate the target .tour-act with children:
   * 1. .act-venue with text `targetVenue`
   * 2. .open-time with text `targetOpenTime`
   */

  const tourAct = page
    .locator(".tour-act", {
      has:
        page.locator(".act-venue", { hasText: targetVenue }) &&
        page.locator(".open-time", { hasText: targetOpenTime }) &&
        page.locator(".act-date-year", { hasText: splitedDate.year }) &&
        page.locator(".act-date-month", { hasText: splitedDate.month }) &&
        page.locator(".act-date-day", { hasText: splitedDate.day }),
    })
    .last(); // assume the last one should be latest

  if (!tourAct) {
    throw new Error("The target act is not found.");
  }

  await tourAct
    .locator(
      '.color-primary.size-small.type-filled.width-auto.icon-right:has-text("申込み")'
    )
    .click();

  // redirect to the next page
  await page.waitForLoadState("domcontentloaded");
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

  await page.waitForSelector(radioGroupSelector);
  const radioGroup = page.locator(radioGroupSelector);
  const radioBtn = radioGroup.locator(radioBtnSelector).first();
  if (!radioBtn) {
    throw new Error("The target radio button is not found.");
  }
  await radioBtn.click();
};

/**
 * add live companion, up to 1 companion (2 tickets in total)
 * @param job
 */
const addCompanion = async (job: Job) => {
  const { page, jobIndex, batchOption } = job;

  if (!batchOption.companion) return;

  /**
   * locate the target button of selecting the number of tickets
   * button with class `button.plus`
   * and the companion selector with query `tpl-companion-selector`
   */

  console.log(color("text", `[${jobIndex}] Adding a companion...`));

  const addTicketSelector = ".button.plus";
  const dialogBtnSelector = "tpl-companion-selector";

  const addTicket = page.locator(addTicketSelector);
  if (!addTicket) {
    throw new Error("The target button is not found.");
  }
  await addTicket.click();
  const companion = page.locator(dialogBtnSelector);
  if (!companion) {
    throw new Error("The companion selector is not found.");
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

  await page.waitForSelector(dialogSelector);
  // select the first companion
  const companionBtn = page.locator(companionSelector).first();
  if (!companionBtn) {
    throw new Error("The companion button is not found.");
  }
  await companionBtn.click();
  await page.waitForSelector(confirmSelector);
  const confirmBtn = page.locator(confirmSelector);
  if (!confirmBtn) {
    throw new Error("The confirm button is not found.");
  }
  await confirmBtn.click();
};

/**
 * select payment method. default 7-11
 * @param job
 */
const selectPayment = async (job: Job) => {
  const { page, jobIndex, batchOption } = job;
  const { paymentMethod } = batchOption;
  /**
   * again, locate the first element with query `tpl-radio-group`
   * locate the element with query `tpl-radio-button`which has text `セブン-イレブン`
   * click the button
   */

  console.log(color("text", `[${jobIndex}] Selecting payment method...`));

  const radioGroupSelector = "tpl-radio-group";
  const radioBtnSelector = "tpl-radio-button";

  await page.waitForSelector(radioGroupSelector);
  const paymentRadioGroup = page.locator(radioGroupSelector).first();
  const paymentRadioBtn = paymentRadioGroup.locator(radioBtnSelector, {
    hasText: paymentMethod,
  });
  await paymentRadioBtn.click();
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
  await page.waitForSelector(checkboxSelector);
  const checkbox = page.locator(checkboxSelector);
  if (!checkbox) {
    throw new Error("The checkbox is not found.");
  }
  await checkbox.click();
};

/**
 * save a screenshot of the page
 * @param job
 */
export const saveScreenshot = async (job: Job) => {
  const { page, jobIndex } = job;

  console.log(color("text", `[${jobIndex}] Saving the screenshot...`));
  const screenshotPath = `./screenshots/${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
};
