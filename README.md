# node-gmail-utils
Work with the gmail API in node js
## !!! not fully working yet
This app is meant to be a relatively simple means to send  Gmail from a Node js program.
In the future other capabilities could be developed.

It can be called as a sub-process from another node process(your app)
or directly on the command line.
It can maintain configs for multiple identity's (gmail accounts)

NOTE: To use this app you will need to obtain a credentials file from google (see below).

## Command line options
(On Windows hosts us a "/" instead of a "-" eg -c becomes /c)

| Syntax               | Description
| :---                 | :----   
| `-c /path/to/config`              | Use an alternate config location<br> A folder named node-gmail-utils will be created at the location specified.<br> This option can be combined with all other options.        
| `-a emailAddress`      | Add a new identity to config. <br> This will create a folder and an options.json file.<br> You can edit the options.json to your liking <br>then add your credentials.json that you get from Goolge<br> Can only be combined with -c option.
| `-s '{json:string}'`| Send an email defined in json text. <br>This option is not working yet.


## Working as a sub-process
You can read the test.js script to see an example of how to use node-gmail-utils from another app

* You will need to create an identity, either manually or with the -a option on the command line before running test.js
  * `node index.js -a YourEmailAddress`  
  * copy your google credentials.json to the identity folder
* then run test.js
  * `node test.js YourEmailAddress`


## Getting credentials from Google
This process is a little involved but it's necessary to interact with the Google API

* First open a browser window here: https://console.developers.google.com/ . You may be greeted with consent screen if you have never used the Google Cloud Platform before.

*  At the top of the page click on "Select a Project". This will bring up a dialog. In the top right hand corner click "New Project"
* Enter a name for your project and then click "Create". In a few second you project will be created and you will be returned to the dashboard. If this is your first project it will be selected for you. If not make sure to select it at the top of the page  
*  Now you need to enable the proper API's for this project. Click on "+ ENABLE APIS AND SERVICES".<br> On the next screen scroll down and click on the GMail card. <br>On the next screen click "ENABLE".
* Next you need to setup a consent screen for your project. Near the top, on the right, click "CONFIGURE CONSENT SCREEN" <br>
Here you will need to select the user type. Unless you have a GSuite account your only option will be "External". Select one and click "CREATE"

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

* Rename the downloaded file to credentials.json and move or copy it into the proper identity folder for node-gmail-utils
