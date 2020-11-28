# this script is not meant to be run as is
# it provides examples of using the ngworker command

# get a list of identities -----------------------------------------------------
ngworker -l

# example output
<<COMMENT
[
 {
     "id": "gmailuser@gmail.com",
     "creds": "ok",
     "options": "ok",
     "token": "ok"
 },
 {
     "id": "gsuiteuser@yourdomain.com",
     "creds": "missing",
     "options": "ok",
     "token": "missing"
 }
]

COMMENT


# create an identity ----------------------------------------------------------
ngworker -n bob@gmail.com

# succesful output
<<COMMENT
{
    "type": "create",
    "status": "done",
    "id": "bob@gmail.com",
    "path": "/home/phil/.config/node-gmail-worker/identities/bob@gmail.com",
    "errors": [],
    "results": [
        "Identity created for bob@gmail.com",
        "You must place Google OAuth 2.0 client ID credentials at the following location",
        "/home/phil/.config/node-gmail-worker/identities/bob@gmail.com/credentials.json"
    ]
}
COMMENT

# authorize an identity (first call)--------------------------------------------
ngworker -a bob@gmail.com

<<COMMENT
{
    "needed": true,
    "id": "bob@gmail.com",
    "key": null,
    "errors": [],
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&.....",
    "status": "done"
}



COMMENT

# authorize an identity (second call)-------------------------------------------
ngworker -a bob@gmail.com auth_code_from_google

<<COMMENT
{
    "needed": true,
    "id": "bob@gmail.com",
    "key": "auth_code_from_google",
    "status": "done"
}

COMMENT


# request a job (send an email)-------------------------------------------------
ngworker -j '{ "type":"job", "job":"send", "id":"bob@gmail.com", "data":{"toName":"Phil Giambra","toAddr":"philgiambra@gmail.com","subject":"node-gmail-worker cli_example.js TEST","body":"This is a gmail sent by node-gmail-worker running on the command line","options":{}}}'

<<COMMENT
{
    "type": "job",
    "job": "send",
    "id": "bob@gmail.com",
    "data": {
        "toName": "Phil Giambra",
        "toAddr": "philgiambra@gmail.com",
        "subject": "node-gmail-worker cli_example.js TEST",
        "body": "This is a gmail sent by node-gmail-worker running on the command line",
        "options": {
            "dname": "bob@gmail.com",
            "pre_body": "",
            "post_body": "",
            "cc": []
        }
    },
    "errors": [],
    "status": "done",
    # the results is an object from google with info about the api call
    "results": {}
}
COMMENT
