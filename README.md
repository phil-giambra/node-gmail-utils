# node-gmail-utils
Work with the gmail API in node js
## !!! not at all working yet
This app is meant to be a relatively simple means to send and receive Gmail from a Node js program.

It will be called as a sub-process from another node process(your app)
or directly on the command line.
It can maintain configs for multiple identity's (gmail accounts)

## command line default_options
(On Windows hosts us a "/" instead of a "-" eg -c becomes /c)

| Syntax             | Description
| :---               | :----   
| -c path            | use alternate config location       
| -a emailAddress    | Add a new identity to config. This will create a folder and
an options.json file. You can edit the options.json to your liking and then add your credentials.json that you get from Goolge



* communication with node's process.send() and process.on('message', (msg) => {})
