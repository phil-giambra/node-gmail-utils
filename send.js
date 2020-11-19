const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  authorize(JSON.parse(content), saveOAuthClient);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


let OC = null

function saveOAuthClient(auth) {
    console.log("got the auth client");
    OC = auth
    //console.log(OC);
    setTimeout(function(){
        console.log("send1");
        sendMail()
    }, 1000)
    setTimeout(function(){
        console.log("send2");
        //listLabels(OC)
    }, 3000)
}




async function sendMail() {
    // You can use UTF-8 encoding for the subject using the method below.
 // You can also just use a plain string if you don't need anything fancy.
 const gmail = google.gmail({version: 'v1', auth:OC}); // this could move to global
 const subject = 'Hello';
 const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
 const messageParts = [
   'From: Jakes Place <info@jakesplaceny.com>',
   'To: Phil Giambra <philgiambra@gmail.com>',
   'Content-Type: text/html; charset=utf-8',
   'MIME-Version: 1.0',
   `Subject: ${utf8Subject}`,
   '',
   'This is a message just to say hello.',
   'So... <b>Hello!</b>  ',
 ];
 const message = messageParts.join('\n');

 // The body needs to be base64url encoded.
 const encodedMessage = Buffer.from(message)
   .toString('base64')
   .replace(/\+/g, '-')
   .replace(/\//g, '_')
   .replace(/=+$/, '');

 const res = await gmail.users.messages.send({
   userId: 'me',
   requestBody: {
     raw: encodedMessage,
   },
 });
 console.log("got responce from gmail",res.data);
 //return res.data;
}
