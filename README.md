# node-gmail-worker
Work with the Gmail API in Node.js
## !!! not fully working yet
This app is meant to be a relatively simple means to send  Gmail from a Node.js program.
In the future other capabilities could be developed.

It can be used 3 ways.
* As a child-process with fork()
* As a module with require()
* Directly from the command line.


It can maintain configs for multiple identity's (Gmail accounts)



NOTE: To use this app you will need to obtain an OAuth 2.0 client ID file from Google (see below).

# Install
node-gmail-worker has not been published to npm yet so for now you have to install it manually

* `git clone https://github.com/phil-giambra/node-gmail-worker.git`
* `cd node-gmail-worker`
* `npm install`
* (optional) make it global with `npm link`

or by url

* local install `npm install https://github.com/phil-giambra/node-gmail-worker.git`
* global install `npm install -g https://github.com/phil-giambra/node-gmail-worker.git`

## Using on the command line
If installed globally you can just use the command <br> `ngworker` <br>otherwise use <br>`node /path/to/node-gmail-worker/index.js`   
### cli options
On Windows hosts us a `/` instead of a `-` ( eg. -c becomes /c )

| Syntax               | Description
| :---                 | :----   
| `-c /path/to/config` | Use an alternate config location.<br> A folder named node-gmail-worker will be created at the location specified.<br> This option can be used with all other options.
| `-l `|  Outputs a json string containing a list of the current config's identities and there status         
| `-n emailAddress`      | Add a new identity to config. <br> This will create a folder named `emailAddress` and an options.json file within it.<br> You need to put your credentials.json from Google into the folder .<br>Can only be combined with -c option.
| `-a emailAddress`<br> `-a emailAddress auth_code`| `-a emailAddress` will output a json string containing a url from google where the user goes to sign in and get the auth_code<br>   `-a emailAddress auth_code` will trigger an attempt to get an access token and will output a json string containing the results<br>Can only be combined with -c option.
| `-j '{"json":"string"}'`| Preform a job defined in json text (send an email). <br> This option is not implemented yet.


## Using as a child-process
You can read the fork_example.js script to see an example of how to use node-gmail-worker from another app.<br> To run the example
* `node fork_example.js YourEmailAddress`

## Using as a module
Note: node-gmail-worker has not been published to npm yet so for now you have to <br>require with a path
* `const ngw = require("path/to/node-gmail-worker/index.js")`

or install it locally and use npm link
* in node-gmail-worker folder `npm link`
* in your project folder `npm link node-gmail-worker`
* `const ngw = require("node-gmail-worker")`


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
