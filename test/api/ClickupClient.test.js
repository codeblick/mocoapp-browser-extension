import ClickupClient from "../../src/js/api/ClickupClient"

describe("ClickupClient", () => {
  const now = 1788526451714

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("creates a time entry through the official ClickUp API", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('{"id":"entry-1"}'),
    })
    const client = new ClickupClient({ apiToken: "pk_test", fetchImpl })

    await client.createTimeEntry({
      teamId: "2545848",
      taskId: "869evjuqg",
      seconds: 2700,
      billable: true,
      description: "Testing",
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.clickup.com/api/v2/team/2545848/time_entries",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "pk_test",
        },
        body: JSON.stringify({
          start: now - 2700000,
          duration: 2700000,
          tid: "869evjuqg",
          billable: true,
          description: "Testing",
        }),
      },
    )
  })

  it("invokes fetch without binding it to the ClickUp client", async () => {
    let receiver
    const fetchImpl = jest.fn(function () {
      receiver = this
      return Promise.resolve({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"id":"entry-1"}'),
      })
    })
    const client = new ClickupClient({ apiToken: "pk_test", fetchImpl })

    await client.createTimeEntry({
      teamId: "2545848",
      taskId: "869evjuqg",
      seconds: 60,
      billable: true,
      description: "Testing",
    })

    expect(receiver).not.toBe(client)
  })

  it("reports a rejected ClickUp request", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue("1"),
    })
    const client = new ClickupClient({ apiToken: "pk_test", fetchImpl })

    await expect(
      client.createTimeEntry({
        teamId: "2545848",
        taskId: "869evjuqg",
        seconds: 60,
        billable: false,
        description: "Testing",
      }),
    ).rejects.toThrow("ClickUp-Zeitbuchung fehlgeschlagen (400): 1")
  })

  it("requires a personal ClickUp API token", async () => {
    const client = new ClickupClient({ apiToken: "", fetchImpl: jest.fn() })

    await expect(
      client.createTimeEntry({
        teamId: "2545848",
        taskId: "869evjuqg",
        seconds: 60,
        billable: false,
        description: "Testing",
      }),
    ).rejects.toThrow("ClickUp API-Token fehlt")
  })
})
