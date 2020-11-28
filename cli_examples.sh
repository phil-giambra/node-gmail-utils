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
