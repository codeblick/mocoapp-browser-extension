const CLICKUP_API_BASE_URL = "https://api.clickup.com/api/v2"

export default class ClickupClient {
  constructor({ apiToken, fetchImpl = (...args) => globalThis.fetch(...args) }) {
    this.apiToken = apiToken?.trim()
    this.fetchImpl = (...args) => fetchImpl(...args)
  }

  async createTimeEntry({ teamId, taskId, seconds, billable, description }) {
    if (!this.apiToken) {
      throw new Error("ClickUp API-Token fehlt. Bitte in den Extension-Einstellungen hinterlegen.")
    }
    if (!teamId) {
      throw new Error("ClickUp Workspace-ID konnte nicht ermittelt werden.")
    }
    if (!taskId) {
      throw new Error("ClickUp Task-ID konnte nicht ermittelt werden.")
    }

    const duration = seconds * 1000
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Die ClickUp-Zeit muss größer als 0 sein.")
    }

    const response = await this.fetchImpl(`${CLICKUP_API_BASE_URL}/team/${teamId}/time_entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiToken,
      },
      body: JSON.stringify({
        start: Date.now() - duration,
        duration,
        tid: taskId,
        billable,
        description,
      }),
    })

    const responseText = await response.text()
    if (!response.ok) {
      const details = responseText ? `: ${responseText.slice(0, 300)}` : ""
      throw new Error(`ClickUp-Zeitbuchung fehlgeschlagen (${response.status})${details}`)
    }

    return responseText
  }
}
