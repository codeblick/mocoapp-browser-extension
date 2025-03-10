import browser from "webextension-polyfill"
import ApiClient from "api/Client"
import { isChrome, getCurrentTab, getSettings, isBrowserTab } from "utils/browser"
import { sendMessage, onMessage } from "webext-bridge/background"
import { tabUpdated, settingsChanged, togglePopup, openPopup } from "utils/messageHandlers"
import { isNil } from "lodash"

// This is the main entry point for the background script
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isBrowserTab(tab) && changeInfo.status === "complete") {
    tabUpdated(tab)
  }
})

function timerStoppedForCurrentService(service, timedActivity) {
  return timedActivity.service_id && timedActivity.service_id === service?.id
}

function resetBubble({ tab, settings, service, timedActivity }) {
  const apiClient = new ApiClient(settings)
  apiClient
    .activitiesStatus(service)
    .then(({ data }) => {
      sendMessage(
        "showBubble",
        {
          bookedSeconds: data.seconds,
          timedActivity: data.timed_activity,
          settingTimeTrackingHHMM: settings.settingTimeTrackingHHMM,
          service,
        },
        `content-script@${tab.id}`,
      )
    })
    .then(() => {
      if (isNil(timedActivity) || timerStoppedForCurrentService(service, timedActivity)) {
        sendMessage("closePopup", null, `content-script@${tab.id}`)
      } else {
        openPopup(tab, { service })
      }
    })
}

onMessage("togglePopup", (_message) => {
  getCurrentTab().then((tab) => {
    if (tab && !isBrowserTab(tab)) {
      sendMessage("requestService", null, `content-script@${tab.id}`).then((data) => {
        togglePopup(tab)(data)
      })
    }
  })
})

onMessage("closePopup", (_message) => {
  getCurrentTab().then((tab) => {
    sendMessage("closePopup", null, `content-script@${tab.id}`)
  })
})

onMessage("createActivity", (message) => {
  const { activity, service } = message.data
  getCurrentTab().then((tab) => {
    getSettings().then((settings) => {
      const apiClient = new ApiClient(settings)
      apiClient
        .createActivity(activity)
        .then(() => {
          resetBubble({ tab, settings, service })
        })
        .catch((error) => {
          if (error.response?.status === 422) {
            sendMessage("setFormErrors", error.response.data, `popup@${tab.id}`)
          }
        })
    })
  })
})

onMessage("stopTimer", (message) => {
  const { timedActivity, service } = message.data
  getCurrentTab().then((tab) => {
    getSettings().then((settings) => {
      const apiClient = new ApiClient(settings)
      apiClient
        .stopTimer(timedActivity)
        .then(() => resetBubble({ tab, settings, service, timedActivity }))
        .catch(() => null)
    })
  })
})

onMessage("openOptions", () => {
  let url
  if (isChrome()) {
    url = `chrome://extensions/?options=${browser.runtime.id}`
  } else {
    url = browser.runtime.getURL("options.html")
  }
  return browser.tabs.create({ url })
})

onMessage("openExtensions", () => {
  if (isChrome()) {
    browser.tabs.create({ url: "chrome://extensions" })
  }
})

browser.runtime.onInstalled.addListener(() => {
  browser.storage.onChanged.addListener(({ apiKey, subdomain }, areaName) => {
    if (areaName === "sync" && (apiKey || subdomain)) {
      getSettings().then((settings) => settingsChanged(settings))
    }
  })
})

browser.storage.onChanged.addListener(({ apiKey, subdomain }, areaName) => {
  if (areaName === "sync" && (apiKey || subdomain)) {
    getSettings().then((settings) => settingsChanged(settings))
  }
})

// Manifest V3 uses chrome.action, v2 uses chrome.browserAction
browser.action ??= browser.browserAction
browser.action.onClicked.addListener((tab) => {
  if (!isBrowserTab(tab)) {
    sendMessage("requestService", {}, `content-script@${tab.id}`).then((data) => {
      togglePopup(tab)(data)
    })
  }
})

onMessage("track", async (_message) => {
  const { seconds, billable, description } = _message.data

  const taskId = await getActiveTaskId()
  const teamId = await getTeamId()
  const apiUrl = await getApiUrl()
  const authorizationHeader = await getAuthenticationHeader()

  const now = Date.now()
  const duration = seconds * 1000

  try {
    await fetch(`${apiUrl}/team/${teamId}/time_entries/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
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
  } catch (err) {
    console.error("MOCOAPP_BROWSER_EXTENSION", err)
  }
})

async function getAuthenticationHeader() {
  const cookie = await browser.cookies.get({ url: "https://app.clickup.com", name: "cu_jwt" })
  return `Bearer ${cookie.value}`
}

async function getActiveTaskId() {
  const tab = await getCurrentTab()

  return await runFunc(tab, () => document.querySelector("[data-task-id]").dataset.taskId)
}

async function getTeamId() {
  const tab = await getCurrentTab()

  return await runFunc(tab, () => {
    const config = JSON.parse(localStorage.getItem("cuHandshake"))
    return Object.keys(config)[0]
  })
}

async function getApiUrl() {
  const tab = await getCurrentTab()

  return await runFunc(tab, () => {
    const config = JSON.parse(localStorage.getItem("cuHandshake"))
    const teamId = Object.keys(config)[0]
    return config[teamId].appEnvironment.apiUrl
  })
}

async function runFunc(tab, func) {
  const data = await browser.scripting.executeScript({
    target: { tabId: tab.id, allFrames: false },
    func: func,
  })

  return data[0].result
}
