import { sendMessage } from "webext-bridge/content-script"

export class Clickup {
  async track(seconds, billable, description) {
    sendMessage("track", { seconds, billable, description }, "background")
  }
}
