chrome.runtime.onMessage.addListener(function (request)
{
    if (request.action === "Nav")
    {
        var iFrameDiv = document.getElementById('mdspCore-plugin__content'); //may not be necessary
        var iFrameURL = iFrameDiv.getElementsByTagName("iframe")[0].src;
        window.open(iFrameURL);
    }
    else if (request.action === "Source")
    {
        //opens the editor for data points
        var openEditMode = document.getElementsByClassName("button--primary--with-icon")[0];
        openEditMode.click();

        var rows = request.payload.split('\n');
        rows.forEach(function(entry)
        {
            var points = entry.split(',');
            
            var addDataPoint = document.getElementsByClassName("button--simple-with-icon spacing-right mediumIcon")[0];
            addDataPoint.click();

            var nameElement = document.getElementById('name');
            nameElement.value= points[0];
            nameElement.dispatchEvent(new Event('input', { 'bubbles': true }));

            var unitElement = document.getElementById('unit');
            unitElement.value= points[1];
            unitElement.dispatchEvent(new Event('input', { 'bubbles': true }));

            document.getElementsByClassName("fa fa-fw fa-caret-down ui-clickable")[0].click()

            switch(points[2]) //int long double boolean string 0 1 2 3 4
            {
                case "INT":
                    document.getElementsByClassName("ui-dropdown-item ui-corner-all")[0].click()
                    break;
                case "LONG":
                    document.getElementsByClassName("ui-dropdown-item ui-corner-all")[1].click()
                    break;
                case "DOUBLE":
                    document.getElementsByClassName("ui-dropdown-item ui-corner-all")[2].click()
                    break;
                case "BOOLEAN":
                    document.getElementsByClassName("ui-dropdown-item ui-corner-all")[3].click()
                    break;
                case "STRING":
                    document.getElementsByClassName("ui-dropdown-item ui-corner-all")[4].click()
                    break;
            }
           
            var addressElement = document.getElementById('address');
            addressElement.value=points[3];
            addressElement.dispatchEvent(new Event('input', { 'bubbles': true }));

            var acceptData = document.getElementsByClassName("mdspCore-popOver__footer-bar-button")[0];
            acceptData.click();
        });
    }
    else if (request.action === "Map")
    {
        
        function jsonRequest(targetURL)
        {
            var jsonRequest = new XMLHttpRequest();
            jsonRequest.open("GET", targetURL,false);
            jsonRequest.send(null);
            var jsonData =  JSON.parse(jsonRequest.responseText);
            return jsonData;
        }

        //step 1, finding the URL of the DP ID JSON, and get it
        var currentURL = document.URL;
        var agentID = currentURL.split("/")[3];
        var subTennant = currentURL.split("-")[0];
        var dataURL = subTennant + "-uipluginassetmanagermciot2040.eu1.mindsphere.io/api/mindconnectdevicemanagement/v3/devices/" + agentID + "/dataConfig";
        var dataPointIdJSON = jsonRequest(dataURL);

        //step 2, same thing but for asset ID JSON

        var assetURL = subTennant + "-uipluginassetmanagermciot2040.eu1.mindsphere.io/api/assetmanagement/v3/assets?size=1000"
        var assetIdJSON = jsonRequest(assetURL);
        

        //step 3, create 2 dictionary sets to keyval common tongue names to ID's

        var dataPointDict = [];
        var dataPointTargetLoc = dataPointIdJSON.dataSources[0].dataPoints;
        for (var i in dataPointTargetLoc)
        {
            dataPointDict.push(
            {
                name : dataPointTargetLoc[i].name,
                ID : dataPointTargetLoc[i].dataPointId
            })
        }

        var assetDict = [];
        var assetTargetLoc = assetIdJSON._embedded.assets;

        for (var i in assetTargetLoc)
        {

            assetDict.push(
            {
                name : assetTargetLoc[i].name,
                ID : assetTargetLoc[i].assetId
            })
        }
        
        //loop starts here

        var rows = request.payload.split('\n');

        for (var i = 0; i < rows.length; i++)
        {
            var points = rows[i].split(',');
 
            var dpName = points[0];
            var grpName = points[1];
            var varName = points[2];
            var assetName = points[3];           
  
            var dpNameObject = dataPointDict.find(o => o.name === dpName);
            var assetNameObject = assetDict.find(o => o.name === assetName);
            var parameters = JSON.stringify
            ({
                "agentId" : agentID,
                "dataPointId" : dpNameObject.ID,
                "entityId" : assetNameObject.ID, 
                "propertySetName" : grpName,
                "propertyName" : varName,
                "keepMapping" : true
            })

            var postDataMap = new XMLHttpRequest();
            var MapURL = '/api/mindconnect/v3/dataPointMappings';
            postDataMap.open('POST', MapURL, true);
            postDataMap.setRequestHeader('Content-type', 'application/json');
            postDataMap.setRequestHeader('x-xsrf-token', document.cookie.split('XSRF-TOKEN=')[1].split(';')[0]);
            postDataMap.onreadystatechange = function()
            {
                if(postDataMap.readyState == 4 && postDataMap.status == 200)
                {
                    alert(postDataMap.responseText);
                }
            }
            postDataMap.send(parameters)
            
            finTime = Date.now();
            while (Date.now() < finTime + 25)
            {
            }
        }
        location.reload();          
    }
})