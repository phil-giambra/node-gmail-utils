

// this script is an example of how to use node-gmail-worker as a module.
// execute like { node fork_example.js emailAddress }

const ngw = require('node-gmail-worker');

// Every request packet sent to the worker will require the "id" property
// that is set to a vaild Identtity in it's config.
// for this example we get the Identity to use from the last
// arguement on command line
let args = process.argv
let user_id = args[args.length - 1]
console.log("Gmail user", user_id);


ngw.msg.on('auth', (packet) => {
    console.log('an auth event occurred!', packet);
    if (packet.status === "error") {
        // handle auth errors
    } else {
        // handle auth responce
    }
});

ngw.msg.on('job', (packet) => {
    console.log('an job event occurred!', packet);
    if (packet.status === "error") {
        // handle job errors
    } else {
        // handle positive job responce
    }
});





//------------------------STDIN COMMANDS------------------------------------
// setup commands from stdin for testing the modules methods and events
let CMDS = {}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  //console.log(chunk);
  if (chunk[0] === "/") {
      console.log("command recived");
      let splitcmd = chunk.replace("/", "").trim().split(" ")
      console.log("split command ", splitcmd);
      if (CMDS[splitcmd[0]]) {
          CMDS[splitcmd[0]](splitcmd)
      } else {
          console.log("Invalid Command", splitcmd );
      }
  }
  else {
      console.log("Invalid command");
  }
});

CMDS.list = function(cmd) {
    console.log("list command:\n",ngw.list());
}

CMDS.config = function(cmd) {
    console.log("set config command:\n");
    ngw.config()
}

CMDS.auth = function(cmd) {

    console.log("sending auth command:\n");

}

CMDS.quit = function(cmd) {
    process.exit()
}

CMDS.job = function(cmd) {
    console.log("request job command:\n");
    let jobData = {
    toName:user_id,
    toAddr:user_id,
    subject:"node-gmail-worker fork_example.js TEST",
    body:"This is a gmail sent by node-gmail-worker <br> running as a module",
    //(optional) these will override the existing options for an identity if they are declared
    options:{
        //dname:"" ,
        //pre_body:"",
        //post_body:"",
        //cc:[]
        }
    }
    let packet = { type:"job", job:"send", id:user_id, data:jobData }
    ngw.job(packet)
}

CMDS.help = function(cmd) {
    console.log("Command list:");
    for (let c in CMDS) {
        console.log(c);
    }
}
