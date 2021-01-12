document.addEventListener('DOMContentLoaded', function()
{
    document.getElementById("iFrameDive").onclick=function()
    {
        chrome.tabs.query({currentWindow: true, active: true},
            function (tabs)
            {
                chrome.tabs.sendMessage(tabs[0].id, {action: "Nav", payload: ""})
            })
    }
    document.getElementById("dataMap").onclick=function()
    {
        chrome.tabs.query({currentWindow: true, active: true},
            function (tabs)
            {
                chrome.tabs.sendMessage(tabs[0].id, {action: "Map", payload: document.getElementById("csvPaste").value})
            })
    }

    document.getElementById("dataSource").onclick=function()
    {
        chrome.tabs.query({currentWindow: true, active: true},
            function (tabs)
            {
                chrome.tabs.sendMessage(tabs[0].id, {action: "Source", payload: document.getElementById("csvPaste").value})
            })
    }
}, false)