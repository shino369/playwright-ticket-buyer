# Playwright-Ticket-Buyer
A simple bot using `playwright` to automate the purchase process of a specific ticket site.Please modify the `.env`  and `target.json` for desired ticket. Run in sequential.

`Playwright`を使ってとASBのチケット購入を自動化するBOT。\
`.env`と`target.json`に設定を入れて起動すれば、あとは自動的に開始時間まで待つことになる。

`batchOptionsArr`はチケットの優先順位に従って入力してください。
上のが失敗したら次のチケットで試すことになる。\
\
まだ試験中のため、失敗する可能性があります。
\
\
＊あくまで自分の分を確保するためだけに使ってください。

---

### Prerequisite

`node.js` or related framework(s) (deno,bun...) is required.

### How to start

```shell
pnpm i
pnpm run start
```
