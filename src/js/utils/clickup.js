export class Clickup {
  async track(teamId, seconds, billable) {
    const now = Date.now()
    const duration = seconds * 1000

    fetch(`https://app.clickup.com/scheduling/v1/team/${teamId}/time_entries/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await this.getAuthenticationHeader(),
      },
      body: JSON.stringify({
        start: now - duration,
        end: now,
        duration: duration,
        tid: await this.getActiveTaskId(),
        stop: now,
        billable: billable,
        via: "manual",
      }),
    })
  }

  async getActiveTaskId() {
    return await this.runFunc(() => document.querySelector("[data-task-id]").dataset.taskId)
  }

  async getAuthenticationHeader() {
    return `Bearer ${await this.runFunc(() => localStorage.getItem("id_token"))}`
  }

  runFunc(func) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]

        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id, allFrames: false },
            function: func,
          },
          (data) => {
            resolve(data[0].result)
          },
        )
      })
    })
  }
}
