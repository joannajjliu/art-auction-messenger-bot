'use strict';

// Imports dependencies and set up http server
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const Response = require("./services/response"),
    request = require('request'),
    https = require('https'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); //creates express http server

// Declaring variables:
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
let sender_firstName;
// Handler functions:
// Handles messages events
function handleMessage(sender_psid, received_message) {
    let responses;

    // Check if the message contains text
    if (received_message.text) {
      // Create the payload for a basic text message
      responses = [
          Response.genText(`Hi ${sender_firstName}, I'm here to guide you through your first art auction.`),
          Response.genText("What are you looking to bid on today?")
        // {
        //     "text": `Hi ${sender_firstName}, I'm here to guide you through your first art auction.`,
        // }
      ];
    } else if (received_message.attachments) {
        // Gets the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        responses = Response.genGenericTemplate(
            attachment_url,
            "Is this the right picture?",
            "Tap a button to answer",
            [
                {
                    "type": "postback",
                    "title": "Yes!",
                    "payload": "yes",
                },
                {
                    "type": "postback",
                    "title": "No!",
                    "payload": "no",
                }
            ]
        );
    }
    // Sends the response message
    if (Array.isArray(responses)) {
        console.log("isArray");
        let delay = 0;
        for (let response of responses) {
            callSendAPI(sender_psid, response, delay * 2000);
            delay++;
        }
        
    } else {
        callSendAPI(sender_psid, responses, 0);  
    }
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;

    //Get the payload for the postback:
    let payload = received_postback.payload;

    //Set the response based on the postback payload
    if (payload === "yes") {
        response = { "text": "Thanks!" }
    } else if (payload === "no") {
        response = { "text": "Oops, try sending another image." }
    }
    //Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response, delay = 0) {

  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
    // Send the HTTP request to the Messenger Platform
    setTimeout(() => {
        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {
            if (!err) {
              console.log('message sent!')
            } else {
              console.error("Unable to send message:" + err);
            }
        }), delay
    })
}
  
// Set server port and log message on success
app.listen(process.env.PORT || 8080, () => {
    console.log('webhook is listening');
});

// -- Add the webhook endpoint: -- //
app.post('/webhook', (req, res) => {
    let body = req.body;
    // Checks if this is an event from a page subscription
    if (body.object === 'page') {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Gets the message, entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log("webhook event: ", webhook_event);
              
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
            getUserProfile(sender_psid)
                .then(userProfile => {
                    console.log("userProfile :", userProfile);
                    // assign to sender_firstName variable:
                    sender_firstName = userProfile.first_name;
                    // Check if the event is a message or postback and
                    // pass the event to the appropriate handler function
                    if (webhook_event.message) {
                        // console.log("sender_firstName: ", sender_firstName);
                        handleMessage(sender_psid, webhook_event.message);        
                    } else if (webhook_event.postback) {
                        handlePostback(sender_psid, webhook_event.postback);
                    }
                });
            

        });

        //  Returns a '200 OK' response to all requests,
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

//-- Add webhook verification --
// Support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    // Parse the query params:
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
})

//api query returns sender first name, last name, and profile pic

async function getUserProfile(sender_psid) {
    try {
      const userProfile = await callUserProfileAPI(sender_psid);

    //   for (const key in userProfile) {
    //     const camelizedKey = camelCase(key);
    //     const value = userProfile[key];
    //     delete userProfile[key];
    //     userProfile[camelizedKey] = value;
    //   }

      return userProfile;
    } catch (err) {
      console.log("Fetch failed:", err);
    }
  }

function callUserProfileAPI(sender_psid) {
    return new Promise(function(resolve, reject) {
      let body = [];

      // Send the HTTP request to the Graph API
      request({
        uri: `https://graph.facebook.com/v2.6/${sender_psid}`,
        qs: {
          access_token: process.env.PAGE_ACCESS_TOKEN,
          fields: "first_name, last_name"
        },
        method: "GET"
      })
        .on("response", function(response) {
          // console.log(response.statusCode);

          if (response.statusCode !== 200) {
            reject(Error(response.statusCode));
          }
        })
        .on("data", function(chunk) {
          body.push(chunk);
        })
        .on("error", function(error) {
          console.error("Unable to fetch profile:" + error);
          reject(Error("Network Error"));
        })
        .on("end", () => {
          body = Buffer.concat(body).toString();
          // console.log(JSON.parse(body));

          resolve(JSON.parse(body));
        });
    });
  }