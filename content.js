chrome.runtime.onMessage.addListener(async function (request)
{
    if (request.action === "Nav")
    {
        //TODO: automate by checking for '/plugin/ at end of url
        var iFrameDiv = document.getElementById('mdspCore-plugin__content'); //may not be necessary
        var iFrameURL = iFrameDiv.getElementsByTagName("iframe")[0].src;
        //window.open(iFrameURL);
        window.location.href = iFrameURL; //does this fix popup being blocked?
    
    }
    else if (request.action === "Source")
    {
        /* ------------------------------ CONFIG ------------------------------ */
        //create radio buttons for either append or overwrite (for now, overwrite)
        let saveOption = 'overwrite'; //or 'append'
        //create radio buttons for automatic assetID, user chosen or human-readable (look at Node-RED code)
        let assetIDOption = 'automatic'; //'automatic' or 'user' or 'human';
        //let assetIDOption = 'user';

        //rules:
        //cannot name datasources "S7","OPCUA","MODBUSTCP", "MODBUSRTU","IOSHIELD", "SYSTEM", "ROCKWELL"  "mclib", etc
        //cannot mix mclibs with other datasource types
        //atm can't support OPCUA advanced config (set to basic and then configure manually afterwards)

        //TODO: extract csv option / JSON option

        /* ------------------------------ HELPER FUNCTIONS ------------------------------ */
        let humanReadableSet = new Set();   //will have to fill if user chose append
        //helper function to avoid any non-unique human readable IDs
        function uniqueHumanDatapointIDs(datapointName) {
            let constructedName = `DP-${datapointName.substr(0, 33)}`
            if (humanReadableSet.has(constructedName)) {
                let i = 1;
                if (constructedName.length >= 33 ) { //needs more trimming
                    constructedName.substr(0, 33);
                }
                stringNumericalPosition = constructedName.length; //-1; ??
                while (humanReadableSet.has(constructedName)) {
                    constructedName = constructedName.substr(0,stringNumericalPosition) + (i).toString().padStart(3, '0');
                }
            }
            humanReadableSet.add(constructedName)
            return constructedName;
        }

        let timestampsUsed = new Set(); //keep track of any numericIDs not being unique
        //helper function to avoid any non-unique IDs
        function uniqueTimestamps(generatedTimestamp) {
            while (timestampsUsed.has(generatedTimestamp)) {
                generatedTimestamp = generatedTimestamp+1;
            }
            timestampsUsed.add(generatedTimestamp);
            return generatedTimestamp;
        }


        /* ------------------------------ GET CURRENT CONFIG ------------------------------ */
        //build proper url
        let pathName = document.location.pathname;
        let datasource = pathName.split('/')[1];
        let configURL = document.location.origin + '/api/agentmanagement/v3/agents/' + datasource + '/dataSourceConfiguration'
        console.log('retrieving existing config from: ', configURL);
        let currentConfig = await (await fetch(configURL,{ 'headers': { "Access-Control-Allow-Origin": document.location.origin}})).json();
        console.log('existing config:',currentConfig)

        if (currentConfig.configurationId === null){
            currentConfig.configurationId = uniqueTimestamps(Date.now());
        };
        
        //need to store etag to send as if-match
        let currentTag = currentConfig.eTag;

        //strip id,etag from currentConfig
        delete currentConfig.id;
        delete currentConfig.eTag;

        /* ------------------------------ PARSE CSV ------------------------------ */
        console.log('request.payload\n',request.payload);
        let body = { 'configurationId': currentConfig.configurationId, 'dataSources': [] };
        lastTimeStampUsed = body.configurationId;
        let rows = request.payload.split('\n');
        //if rows.length
        let usingMCLIB = false;

        

        let dataSources = []
        let dataSource; //declare here to stop switch cases getting upset?
        for (let row of rows) {
            switch(row.split(',')[0]) {
                case 'mclib':
                    usingMCLIB = true;
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'dataPoints': [],
                        'customData': null,
                        'type': 'mclib'  //to be deleted later
                    };
                    dataSources.push(dataSource);
                    break;
                case 'S7':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'S7',
                        'protocolData': {
                            'ipAddress': row.split(',')[4]
                        },
                        'type': 'S7'  //to be deleted later
                    };
                    if (row.split(',')[5]) { // Manual
                        dataSource.protocolData['manualRackAndSlot'] = 'Manual';
                        dataSource.protocolData['rackNumber'] = row.split(',')[6];
                        dataSource.protocolData['slotNumber'] = row.split(',')[7];
                    }
                    dataSources.push(dataSource);
                    break;
                case 'OPCUA':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'OPCUA',
                        'protocolData': {
                            'opcUaServerName': row.split(',')[4],
                            'opcUaServerAddress': row.split(',')[5],
                            'opcUaServerIPAddress': row.split(',')[6],
                            'enableEvents': (row.split(',')[7] != '' ? row.split(',')[7] : false ), //if blank, set to false
                            'opcUaCertificateMetadata': "",
                            'opcUaSecurityMode': "NONE",
                            'opcUaAuthenticationType': row.split(',')[8]
                        },
                        'type': 'OPCUA'  //to be deleted later
                    };
                    if (dataSource.protocolData['opcUaAuthenticationType'] == 'BASIC') { // BASIC AUTH
                        dataSource.protocolData['opcUaUsername'] = row.split(',')[9];
                        dataSource.protocolData['opcUaPassword'] = row.split(',')[10];
                    }
                    dataSources.push(dataSource);
                    break;
                case 'MODBUSTCP':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'MODBUS',
                        'protocolData': {
                            "protocolType": "TCP",
                            "ipAddress": row.split(',')[4],
                            "port": row.split(',')[5],
                            //optional
                            "byteTimeout": (row.split(',')[6] || 500),
                            "requestDelay": (row.split(',')[7] || 500),
                            "responseSuspensionTime": (row.split(',')[8] || 0),
                            "responseTimeout": (row.split(',')[9] || 0)
                        },
                        'type': 'MODBUSTCP'  //to be deleted later
                    };
                    dataSources.push(dataSource);
                    break;
                case 'MODBUSRTU':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'MODBUS',
                        'protocolData': {
                            "protocolType": "RTU",
                            "ipAddress": row.split(',')[4], //Serial port
                            "serialType": row.split(',')[5],
                            "baudrate": row.split(',')[6],
                            "dataBits": row.split(',')[7],
                            "stopBits": row.split(',')[8],
                            "parity": row.split(',')[9],
                            "termination": row.split(',')[10],
                            //optional
                            "byteTimeout": (row.split(',')[11] || 500),
                            "requestDelay": (row.split(',')[12] || 500),
                            "responseSuspensionTime": (row.split(',')[13] || 10000),
                            "responseTimeout": (row.split(',')[14] || 0)
                        },
                        'type': 'MODBUSRTU'  //to be deleted later
                    };
                    dataSources.push(dataSource);
                    break;
                case 'IOSHIELD':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'IOSHIELD',
                        'protocolData': {},
                        'type': 'IOSHIELD'  //to be deleted later
                    };
                    dataSources.push(dataSource);
                    break;
                case 'SYSTEM':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'SYSTEM',
                        'protocolData': {},
                        'type': 'SYSTEM'  //to be deleted later
                    };
                    dataSources.push(dataSource);
                    break;
                case 'ROCKWELL':
                    dataSource = { 
                        'name': row.split(',')[1],
                        'description': (row.split(',')[2] || ""),
                        'readCycleInSeconds': (row.split(',')[3] != '' ? row.split(',')[3] : 60 ),
                        'dataPoints': [],
                        'customData': null,
                        'protocol': 'ROCKWELL',
                        'protocolData': {
                            "cpuType": row.split(',')[4],
                            "ipAddress": row.split(',')[5],
                            "dhpConnected": false,   //TODO: what's going on here? Is this using agent onboarding network Configuration information?
                        },
                        'type': 'ROCKWELL'  //to be deleted later
                    };
                    if (row.split(',')[6] & row.split(',')[7]) {    //lol the config literally contains a comma, so lets just roll with it
                        dataSource.protocolData['routeParameters'] = `${row.split(',')[6]},${row.split(',')[7]}`;
                    }
                    dataSources.push(dataSource);
                    break;
            }
        }
        
        //attach datapoints to datasources
        for (let dataSource of dataSources) {
            let name = dataSource.name;
            for (let row of rows) {
                if (row.split(',')[0] == name) { //datasource match
                    let datapoint;
                    switch(dataSource.type) {
                        case 'mclib':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "type": row.split(',')[4],
                                'id': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'S7':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "address": row.split(',')[6],
                                    //optional
                                    "acquisitionType": (row.split(',')[7] || 'READ'),
                                    "onDataChanged": (row.split(',')[8] || false),
                                    "hysteresis": (row.split(',')[9] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'OPCUA':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "address": row.split(',')[6],
                                    //optional
                                    "onDataChanged": (row.split(',')[7] || false),
                                    "hysteresis": (row.split(',')[8] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'MODBUSTCP': //TODO create function convert writing into integers for modbus
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "functionType": row.split(',')[6], //this also ends up as integers (like realType)
                                    'slaveNumber': row.split(',')[7],
                                    'startAddress': row.split(',')[8],
                                    'quantity': row.split(',')[9],
                                    'variableType': row.split(',')[10],
                                    'responseAddressOffset': row.split(',')[11],
                                    'responseQuantity': row.split(',')[12],

                                    //optional
                                    'realType': (row.split(',')[13] == ('Reversed Order' || 1) ? 1 : 0), //Normal Order = 0, Reversed order = 1
                                    "onDataChanged": (row.split(',')[14] || false),
                                    "hysteresis": (row.split(',')[15] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'MODBUSRTU':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "functionType": row.split(',')[6], //this also ends up as integers (like realType)
                                    'slaveNumber': row.split(',')[7],
                                    'startAddress': row.split(',')[8],
                                    'quantity': row.split(',')[9],
                                    'variableType': row.split(',')[10],
                                    'responseAddressOffset': row.split(',')[11],
                                    'responseQuantity': row.split(',')[12],

                                    //optional
                                    'realType': (row.split(',')[13] == ('Reversed Order' || 1) ? 1 : 0), //Normal Order = 0, Reversed order = 1
                                    "onDataChanged": (row.split(',')[14] || false),
                                    "hysteresis": (row.split(',')[15] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'IOSHIELD':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "pinType": row.split(',')[6],
                                    "pinNumber": row.split(',')[7],
                                    "address": `${row.split(',')[6].substr(0,1)}I${row.split(',')[7]}`,

                                    //optional
                                    "onDataChanged": (row.split(',')[8] || false),
                                    "hysteresis": (row.split(',')[9] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'SYSTEM':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "category": row.split(',')[6],
                                    "variable": row.split(',')[7],
                                    "address": `/${row.split(',')[6]}/${row.split(',')[7]}`,

                                    //optional
                                    "onDataChanged": (row.split(',')[8] || false),
                                    "hysteresis": (row.split(',')[9] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                        case 'ROCKWELL':
                            datapoint = {
                                'name': row.split(',')[1],
                                "description": row.split(',')[2],
                                "unit": (row.split(',')[3] || null),
                                "dataType": row.split(',')[4],
                                'dataPointId': (
                                    assetIDOption == 'automatic' ? uniqueTimestamps(Date.now())
                                    : (assetIDOption == 'user' ? row.split(',')[5] 
                                    : uniqueHumanDatapointIDs(row.split(',')[1])) //human-readable 
                                    ),
                                "dataPointData": {
                                    "address": "",
                                    "tagName": row.split(',')[6] ,
                                    
                                    //optional
                                    "onDataChanged": (row.split(',')[7] || false),
                                    "hysteresis": (row.split(',')[8] || 0),
                                    },
                                "customData": null
                            }
                            dataSource.dataPoints.push(datapoint);
                            break;
                    }
                }
            }
        }
        
        //hardware agent
        if (!usingMCLIB) {
            //https://xxxxxxxx-uipluginassetmanagermciot2040.eu1.mindsphere.io/6e96fdd899ed46988eb0bb42e39ff9b1/datasource
            body['agentId'] = currentConfig.agentId || window.location.pathname.split('/')[1];
            body['uploadCycle'] = currentConfig.uploadCycle || 10;
        }

        //strip datasource type
        for (let dataSource of dataSources) {
            delete dataSource.type;
        }

        body.dataSources = dataSources;
        console.log('body',body);

        //this part doesn't work in firefox
        let res = await fetch(configURL, {
            'method': 'PUT',
            'body': JSON.stringify(body),
            'headers': {
                'Content-type': 'application/json;charset=UTF-8',
                'x-xsrf-token': document.cookie.split('XSRF-TOKEN=')[1].split(';')[0],
                "Access-Control-Allow-Origin": document.location.origin,
                "if-match" : currentTag,    //etag
                "accept": "application/hal+json,application/json"
            }
        });

        let resBody = await res.json();
        console.log(resBody);
        location.reload();
        
        

        //console.log($.get('https://xxxxxxxx-uipluginassetmanagermclib.eu1.mindsphere.io/api/agentmanagement/v3/agents/' + datasource + '/dataSourceConfiguration'));
        
        // //opens the editor for data points
        // var pluginName = document.location.href.includes('mclib') ? 'mclib' : 'agent';
        // console.log(pluginName);
        // var openEditMode = document.getElementsByClassName("button--primary--with-icon")[0];
        // var openEditMode = pluginName == 'mclib' ? document.getElementsByClassName("button button--primary withoutMargin")[0] : document.getElementsByClassName("button--primary--with-icon")[0] ;
        // openEditMode.click();

        // var rows = request.payload.split('\n');
        // rows.forEach(function(entry)
        // {
        //     var points = entry.split(',');
            
        //     var addDataPoint = pluginName == 'mclib' ? document.getElementsByClassName("button button--secondaryContentAction")[document.getElementsByClassName("button button--secondaryContentAction").length -2] : document.getElementsByClassName("button--simple-with-icon spacing-right mediumIcon")[document.getElementsByClassName("button--simple-with-icon spacing-right mediumIcon").length-1];
        //     addDataPoint.click();

        //     var nameElement = document.getElementById('name');
        //     nameElement.value= points[0];
        //     nameElement.dispatchEvent(new Event('input', { 'bubbles': true }));

        //     var unitElement = document.getElementById('unit');
        //     unitElement.value= points[1];
        //     unitElement.dispatchEvent(new Event('input', { 'bubbles': true }));

        //     if(pluginName == 'mclib'){
        //         document.getElementsByClassName("ui-dropdown-trigger")[0].click()
        //         switch(points[2]) //int long double boolean string 0 1 2 3 4
        //         {
        //             case "BOOLEAN":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[0].click()
        //                 break;
        //             case "INT":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[1].click()
        //                 break;
        //             case "LONG":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[2].click()
        //                 break;
        //             case "DOUBLE":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[3].click()
        //                 break;
        //             case "STRING":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[4].click()
        //                 break;
        //             case "BIG_STRING":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[5].click()
        //                 break;
        //             case "TIMESTAMP":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[6].click()
        //                 break;
        //         }                
        //     } else {
        //         document.getElementsByClassName("fa fa-fw fa-caret-down ui-clickable")[0].click()
        //         switch(points[2]) //int long double boolean string 0 1 2 3 4
        //         {
        //             case "INT":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[0].click()
        //                 break;
        //             case "LONG":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[1].click()
        //                 break;
        //             case "DOUBLE":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[2].click()
        //                 break;
        //             case "BOOLEAN":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[3].click()
        //                 break;
        //             case "STRING":
        //                 document.getElementsByClassName("ui-dropdown-item ui-corner-all")[4].click()
        //                 break;
        //         }
        //     }
           
        //     if(pluginName == 'mclib'){
        //         var acceptData = document.querySelector('[data-mdsp-e2e="datapoint-add_save-button"]');
        //     } else{
        //         var addressElement = document.getElementById('address');
        //         addressElement.value=points[3];
        //         addressElement.dispatchEvent(new Event('input', { 'bubbles': true }));
        //         var acceptData = document.getElementsByClassName("mdspCore-popOver__footer-bar-button")[0];
        //     }

        //     acceptData.click();
        // });
    }
    else if (request.action === "Map")
    {
        
        let currentURL = document.URL;
        let agentID = currentURL.split("/")[3];
        let tenantName = currentURL.split("-")[0];


        //step 1, finding the URL of the DP ID JSON, and get it
        let resDataConfig = await fetch(`${tenantName}-uipluginassetmanagermclib.eu1.mindsphere.io/api/agentmanagement/v3/agents/${agentID}/dataSourceConfiguration`, {
            'method': 'GET',
            'headers': {
                "Access-Control-Allow-Origin": document.location.origin,
                "referer": `https://${tenantName}-uipluginassetmanagermclib.eu1.mindsphere.io/${agentID}/datasource`,
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                "accept": "application/hal+json,application/json"
            }
        });
        var dataPointIdJSON = await resDataConfig.json();
        console.log("dataPointIdJSON",dataPointIdJSON);


        //step 2, same thing but for asset ID JSON
        let resAssets = await fetch(`${tenantName}-uipluginassetmanagermclib.eu1.mindsphere.io/api/assetmanagement/v3/assets?size=1000`, {
            'method': 'GET',
            //'body': JSON.stringify(body),
            'headers': {

                "Access-Control-Allow-Origin": document.location.origin,
                "referer": `https://${tenantName}-uipluginassetmanagermclib.eu1.mindsphere.io/${agentID}/datamapping`,
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                "accept": "application/hal+json,application/json"

            }
        });
        var assetIdJSON = await resAssets.json();
        console.log("assetIdJSON",assetIdJSON);
        

        //step 3, create 2 dictionary sets to keyval common tongue names to ID's
        let dataMapConfig = {}
        for (let dataSource of dataPointIdJSON.dataSources) {
            dataMapConfig[dataSource['name']] = {};
            for (let datapoint of dataSource.dataPoints) {
                dataMapConfig[dataSource['name']][datapoint.name] = datapoint.id
            }
        }
        console.log('dataMapConfig',dataMapConfig);


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
 
            //DatasourceName,DatapointName,Asset,Aspect,VariableName
            var dataSourceName = points[0];
            var dpName = points[1];
            var assetName = points[2];
            var aspectName = points[3];
            var variableName = points[4];           
  
            //var dpNameObject = dataPointDict.find(o => o.name === dpName);
            var assetNameObject = assetDict.find(o => o.name === assetName);
            var parameters = JSON.stringify
            ({
                "agentId" : agentID,
                "dataPointId" : dataMapConfig[dataSourceName][dpName],
                "entityId" : assetNameObject.ID, 
                "propertySetName" : aspectName,
                "propertyName" : variableName,
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