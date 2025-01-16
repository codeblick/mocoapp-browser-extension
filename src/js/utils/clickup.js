export class Clickup {
  async track(seconds, billable, description) {
    const taskId = await this.getActiveTaskId()
    const teamId = await this.getTeamId()
    const apiUrl = await this.getApiUrl()

    const now = Date.now()
    const duration = seconds * 1000

    try {
      const res = await fetch(`${apiUrl}/team/${teamId}/time_entries/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await this.getAuthenticationHeader(),
        },
        body: JSON.stringify({
          start: now - duration,
          end: now,
          duration: duration,
          tid: taskId,
          stop: now,
          billable: billable,
          description: description,
          via: "manual",
        }),
      })
      console.log("MOCOAPP_BROWSER_EXTENSION", res.status)
    } catch (err) {
      console.log("MOCOAPP_BROWSER_EXTENSION", err)
    }
  }

  async getActiveTaskId() {
    return await this.runFunc(() => document.querySelector("[data-task-id]").dataset.taskId)
  }

  async getAuthenticationHeader() {
    return new Promise((resolve) => {
      chrome.cookies.get({ url: "https://app.clickup.com", name: "cu_jwt" }, function (cookie) {
        if (cookie) {
          resolve(`Bearer ${cookie.value}`)
        } else {
          resolve(null)
        }
      })
    })
  }

  async getTeamId() {
    return await this.runFunc(() => {
      const config = JSON.parse(localStorage.getItem("cuHandshake"))
      return Object.keys(config)[0]
    })
  }

  async getApiUrl() {
    return await this.runFunc(() => {
      const config = JSON.parse(localStorage.getItem("cuHandshake"))
      const teamId = Object.keys(config)[0]
      return config[teamId].appEnvironment.apiUrl
    })
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
