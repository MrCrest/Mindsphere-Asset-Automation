# Mindsphere-Asset-Automation

>## DEV Edit
> **NEW** mclib datapoint example:
>```csv
>mclib,myDataSourceName,My Datasource description
>myDataSourceName,myVariableName,,unit,datatype
>myDataSourceName,outsideTemp,,Deg,DOUBLE
>myDataSourceName,powerOut,,kW,DOUBLE
>myDataSourceName,motorTemp,,Deg,DOUBLE
>myDataSourceName,callanTest,,unit,BOOLEAN
>myDataSourceName,callanRules,,unit,BOOLEAN
>myDataSourceName,boi,,unit,DOUBLE
>```
>Datamapping currently remains unchanged.
>
>The empty ",," in the csv datapoints above is for an optional datapoint >description
>
>## END DEV EDIT

Asset entry and mapping automation tool for Siemens' Mindsphere

This document serves as an instruction manual on how to use this tool, as proper input validation is not yet part of the tool.
This above statement means that by not following these instructions to the letter, you risk uploading incorrect data to Mindsphere.  The consequences of this will vary depending on your usage of Mindsphere assets, and you are liable to these issues by your use of this tool.

Above all, CHECK every single data point entered.  If you trust the tool to do it correctly, that is your prerogative.

The usage of the tool is entirely within "Asset Manager" of Siemens' Mindsphere.  After installing the addon, navigate through asset manager into your already created asset of your bridge/gateway.

> NOTE: If it is not an IOT2040, expect and please report bugs until I have finished ensuring compatability with other hardware.

After selecting "navigate to plugin" on your gateway, the usual data point entry plugin should load.  This is where you can begin to use the Asset Automaton tool.
Open the tool by clicking it's logo on the top right of your browser, and select "Navigate into the workspace". (Purpose explained elsewhere).
A new tab should have opened that looks remarkably similar to the previous tab you were in.  Feel free to close the old tab at any time.

## For data point entry:
Please first have the datasources already established (PLC groupings).

> NOTE: In the current release, the tool can only add datapoints to the data source at the very top.  If you wish to have many data sources, do them one at a time, as older data sources will be pushed to the bottom, and untouchable by the tool.

Once your data sources are present, please save your changes, and exit "Edit Mode" ("Enter edit mode" button should be deep blue and clickable).
You are now free to paste your CSV into the tool, and select "Process Data Sources".
Depending on how many datapoints you have, this can take many minutes.  Your page will be unusable, and the URL will be changing rapidly.  In most cases it may seem like it has hung, or crashed.  Please ignore these, and wait until the process is finished.  Once the process is complete, you will see all your data points present.  Remember to save it!

> NOTE: This process is awful, but was the fastest method of entry.  I am currently testing other methods to create a cleaner solution.

## For datapoint mapping:
Please firstly select "View Datamappings" on the left of the screen and wait for the page to load.
Paste your CSV into the tool, and select "process data mappings".
This process is much faster than datapoint entry, but still may take a minute in extreme circumstances.  Your webpage will be unusable, with no sign of it working.
Once it is complete, it will automatically refresh the page, and all your data mappings should be present.  If some have been missed, please report it, and try again.

> NOTE: In retrying, you may re-do mappings that have already been successful.


## How to prepare your data for automatic entry
This tool works by pasting an appropriately edited CSV into the field supplied, then the tool will attempt to create or map each point.  At all times, the tool will currently assume your input is completely validated and correct. (Validation coming soon).

Generating a perfectly formatted CSV is your responsibility, however I will provide the guidelines, and eventually supply a template google sheet to help you along the way.
Either way, I highly recommend using excel or google sheets to generate your values.

### The CSV for DATA POINT ENTRY should look something like this:
```csv
FV1_Bottom_Temp,Degrees,DOUBLE,DB50.DBD00100
FV1_Top_Temp,Degrees,DOUBLE,DB50.DBD00101
```

Instead of the real example values above, here are the descriptors instead:
```csv
VARIABLE_NAME,VARIABLE_UNITS,DATA_TYPE,ADDRESS
```
To clarify some of the data points,
VARIABLE_NAME is any name of your choosing, but there must never be any duplicates.
VARIABLE_UNITS is again your choice, but be consistent.
TYPE must be in all caps, and must be one of the following: INT, LONG, DOUBLE, BOOLEAN, or STRING.
ADDRESS must be the valid address of that data point in your PLC.

### The CSV for DATA MAPPING should look something like this:
```csv
FV1_Bottom_Temp,Region_1,Process_Variable,BreweryVessel01
FV1_Top_Temp,Region_4,Process_Variable,BreweryVessel01
```
Instead of the real example values above, here are the descriptors instead:
```csv
VARIABLE_NAME,VARIABLE_GROUP,VARIABLE_TYPE,ASSET_NAME
```
To clarify some of the data points,
VARIABLE_NAME is any name of your choosing, but there must never be any duplicates.
VARIABLE_GROUP is the name of your .
VARIABLE_TYPE is the type of variable you are mapping to.
ASSET_NAME is the name of your asset you are mapping to.

This csv can be as long as you can fit in your copy paste buffer (see: "Random Access Memory").




