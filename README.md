# node-gmail-worker
Work with the Gmail API in Node.js
## !!! not fully working yet
This app is meant to be a relatively simple means to send  Gmail from a Node.js program.
In the future other capabilities could be developed.

It can be used 3 ways.
* As a child-process with fork()
* As a module with require()
* Directly from the command line.


It can maintain configurations for multiple identity's (Gmail accounts)

NOTE: To use this app you will need to obtain an OAuth 2.0 client ID file from Google (see below).

# Install
node-gmail-worker has not been published to npm yet so for now you can install it manually

* `git clone https://github.com/phil-giambra/node-gmail-worker.git`
* `cd node-gmail-worker`
* `npm install`
* (optional) make it global with `npm link`

or by url

* local install `npm install https://github.com/phil-giambra/node-gmail-worker.git`
* global install `npm install -g https://github.com/phil-giambra/node-gmail-worker.git`

# Configuration
However you choose to use node-gmail-worker it will require a place to store data for the
identities (gmail/gsuite accounts) that it does jobs for. It will create a folder named
`node-gmail-worker` with an sub-folder named `identities` for this purpose.

Default location:
* Linux `/home/{username}/.config/`
* Windows  `C:\Users\{username}\AppData\Roaming\`

Alternate locations can be specified:
* command line:  use the -c option
* fork(): use -c option or send a config packet
* require(): use the config() method

Example configuration structure:
```
node-gmail-worker/
│
└───identities/
   │
   └───gmailuser@gmail.com/
   |   │   credentials.json
   |   │   options.json
   |
   └───gsuiteuser@yourdomain.com/
       │   credentials.json
       │   options.json

```

## Using on the command line
If installed globally you can just use the command  `ngworker`

otherwise use `node /path/to/node-gmail-worker/index.js`   

All output from command line calls is formatted as a json string

### cli options
On Windows hosts us a `/` instead of a `-` ( eg. -c becomes /c )

| Syntax               | Description
| :---                 | :----   
| `-c /path/to/config` | Use an alternate config location.<br> Works with all other options.
| `-l `|  returns a list of available identities and their status         
| `-n emailAddress`      | Add a new identity to config. <br> Creates `emailAddress` folder <br>Creates options.json file
| `-a emailAddress`<br> `-a emailAddress auth_code`| `-a emailAddress` returns a url from google for sign in <br><br>   `-a emailAddress auth_code` will trigger an attempt to get an access token and return the results<br>
| `-j jsonString`| Preform a job defined in a json string<br> Valid job types ["send"].


## Using as a child-process
You can read the fork_example.js script to see an example of how to use node-gmail-worker from another app.<br> To run the example
* `node fork_example.js YourEmailAddress`

## Using as a module
You can read the require_example.js script to see an example of how to use node-gmail-worker as a module with require()

* `const ngw = require('node-gmail-worker');`

or

* `const ngw = require("path/to/node-gmail-worker/index.js")`



## Getting credentials from Google
This process is a little involved but it's necessary to interact with the Google API

* First open a browser window here: https://console.developers.google.com/ . You may be greeted with consent screen if you have never used the Google Cloud Platform before.

*  At the top of the page click on "Select a Project". This will bring up a dialog, in it's top right corner click "New Project"
* Enter a name for your project and then click "Create". In a few second you project will be created and you will be returned to the dashboard. If this is your first project it will be selected for you. If not make sure to select it at the top of the page  
*  Now you need to enable the proper API's for this project.<br> Click on "+ ENABLE APIS AND SERVICES".<br> On the next screen scroll down and click on the Gmail card. <br>On the next screen click "ENABLE".
* Next you need to setup a consent screen for your project. <br>Near the top, on the right, click "CONFIGURE CONSENT SCREEN" <br>
Here you will need to select the user type. <br>Unless you have a GSuite account your only option will be "External". <br>Select one and click "CREATE"

* You only need to fill out the required inputs on this screen
  * Under App Info (App name & User support email)
  * Under Developer contact information (Email addresses)
  * Then at the bottom click "SAVE AND CONTINUE"


* Next you will select the scopes (permissions) for your project.

  * Near the top click "ADD AND REMOVE SCOPES".
  * In the right side-panel provided check the box for the scope ".../auth/gmail.send". It is in the second page of results.
  * Once you have it selected click "UPDATE" at the bottom of the panel. Then click "SAVE AND CONTINUE" at the bottom of the page.
  * Google will warn you about verification but it is not necessary at this point for testing


* On the next screen at the bottom just click "SAVE AND CONTINUE" then "BACK TO DASHBOARD"


* Now click on "Credentials" in the left side-panel menu. Then at the top you will click on "+ CREATE CREDENTIALS" and select "OAuth client ID".

* On this screen for application type select "Desktop app". You can enter any name you like then click "CREATE"

* You will be presented with OAuth client created screen. You can just click "OK" as you will be downloading these credentials as a file.

* Under the OAuth 2.0 Client IDs section you will see the client you just created. On the left end of it's entry click the download icon.

* Rename the downloaded file to credentials.json and move or copy it into the proper identity folder for node-gmail-worker
