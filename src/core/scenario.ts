import { color, waitUntil, BatchOption } from "../utils/index.js";
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

  // wait until the page is redirected to https://asobiticket2.asobistore.jp/receptions
  await page.waitForURL("https://asobiticket2.asobistore.jp/receptions", {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });

  // log the success message
  console.log(color("operation", "Logged in successfully."));
};

export const runJob = async ({
  batchOption,
  page,
}: {
  batchOption: BatchOption;
  page: Page;
}) => {
  const { dateTimeOptions, targetUrl, targetVenue, targetOpenTime } =
    batchOption;
  const targetTime = dateTimeOptions;

  // infinite loop to wait until the target time
  await waitUntil(targetTime);

  console.log(color("operation", "Navigating to the target page..."));
  await page.goto(targetUrl);
  await page.waitForURL(targetUrl, {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });

  await matchTarget({ page, targetVenue, targetOpenTime });
  await selectLive(page);
  await addCompanion(page);

  console.log(color("operation", "Navigating to the select payment page..."));
  await goNext(page);

  await selectPayment(page);
  console.log(color("operation", "Navigating to the confirm page..."));
  await goNext(page);

  console.log(color("operation", "Navigating to the agree terms page..."));
  await agreeTerms(page);

  await saveScreenshot(page);

  //   console.log(color("operation", "Navigating to the finished page..."));
  //   await goNext(page);
};

/**
 * proceed to the next step by clicking the button with class `.next-button`
 * @param page
 */
const goNext = async (page: Page) => {
  await page.waitForSelector(".next-button");
  const nextBtn = page.locator(".next-button");
  await nextBtn.click();
  await page.waitForLoadState("domcontentloaded");
};

const matchTarget = async ({
  page,
  targetVenue,
  targetOpenTime,
}: {
  page: Page;
  targetVenue: string;
  targetOpenTime: string;
}) => {
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
        page.locator(".open-time", { hasText: targetOpenTime }),
    })
    .last(); // assume the last one should be latest

  if (!tourAct) {
    console.log(color("error", "The target tour act is not found."));
    process.exit(1);
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
 * @param page
 */
const selectLive = async (page: Page) => {
  /**
   * locate the target button with the desired ticket type
   * radio group with query `tpl-radio-group.ng-untouched.ng-pristine.ng-valid`
   * and the target first radio button with query `tpl-radio-button`
   *  */
  const radioGroupSelector = "tpl-radio-group";
  const radioBtnSelector = "tpl-radio-button";

  await page.waitForSelector(radioGroupSelector);
  const radioGroup = page.locator(radioGroupSelector);
  const radioBtn = radioGroup.locator(radioBtnSelector).first();
  await radioBtn.click();
};

/**
 * add live companion, up to 1 companion (2 tickets in total)
 * @param page
 */
const addCompanion = async (page: Page) => {
  /**
   * locate the target button of selecting the number of tickets
   * button with class `button.plus`
   * and the companion selector with query `tpl-companion-selector`
   */

  const addTicketSelector = ".button.plus";
  const dialogBtnSelector = "tpl-companion-selector";

  const addTicket = page.locator(addTicketSelector);
  await addTicket.click();
  const companion = page.locator(dialogBtnSelector);
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
  await companionBtn.click();
  await page.waitForSelector(confirmSelector);
  const confirmBtn = page.locator(confirmSelector);
  await confirmBtn.click();
};

const selectPayment = async (page: Page) => {
  /**
   * again, locate the first element with query `tpl-radio-group`
   * locate the element with query `tpl-radio-button`which has text `セブン-イレブン`
   * click the button
   */

  const radioGroupSelector = "tpl-radio-group";
  const radioBtnSelector = "tpl-radio-button";

  await page.waitForSelector(radioGroupSelector);
  const paymentRadioGroup = page.locator(radioGroupSelector).first();
  const paymentRadioBtn = paymentRadioGroup.locator(radioBtnSelector, {
    hasText: "セブン-イレブン",
  });
  await paymentRadioBtn.click();
};

/**
 * agree the terms by clicking the checkbox with query `tpl-checkbox`
 * @param page
 */
const agreeTerms = async (page: Page) => {
  /**
   * locate the target element with query `tpl-checkbox`
   * click the button
   */

  const checkboxSelector = "tpl-checkbox";
  await page.waitForSelector(checkboxSelector);
  const checkbox = page.locator(checkboxSelector);
  await checkbox.click();
};

/**
 * save a screenshot of the page
 * @param page
 */
export const saveScreenshot = async (page: Page) => {
  // save the screenshot to the `src/screenshot` directory
  const screenshotPath = `./screenshots/${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
};
