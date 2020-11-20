# node-gmail-utils
Work with the gmail API in node js

This app is meant to be a relatively simple means to send & receive Gmail from a Node js program.

* It will be called as a sub-process from another node process(your app)
* It will maintain configs for multiple identity's(gmail accounts)
  * cmd line option for alt config location
  * need: {add identity} {default identity (first)} 
* communication with node's process.send() and process.on('message', (msg) => {})
