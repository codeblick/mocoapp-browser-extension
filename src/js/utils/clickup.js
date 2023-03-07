const TIMEOUT_MS = 5000

const timeout = (ms, promise) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((reason) => {
        clearTimeout(timer)
        reject(reason)
      })
  })
}

export class Clickup {
  async track(teamId, seconds, billable, description) {
    console.log("MOCOAPP_BROWSER_EXTENSION", { teamId, seconds, billable, description })

    const now = Date.now()
    const duration = seconds * 1000

    const promise = fetch(`https://app.clickup.com/scheduling/v1/team/${teamId}/time_entries/`, {
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
        description: description,
        via: "manual",
      }),
    })

    try {
      await timeout(TIMEOUT_MS, promise)
    } catch (err) {
      alert("An error occured!")
      console.error("MOCOAPP_BROWSER_EXTENSION", err)
    }
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
