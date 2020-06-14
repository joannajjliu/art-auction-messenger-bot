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
let sell_art_prompt = 0;
// Handler functions:
// Handles messages events
async function handleMessage(sender_psid, received_message) {
    let responses;
    // Check if the message contains text
    if (received_message.text) {
        if (sell_art_prompt === 0) {//initial prompt
            // Create the payload for a basic text message
            responses = [
                // Response.genText(`Hi ${sender_firstName}, welcome to ArtAuction, where you'll be able to both buy and sell art`),
                Response.genQuickReply(
                    `Hi ${sender_firstName}, welcome to ArtAuction, what would you like to do today?`, [
                    {
                        title: "Buy Art",
                        payload: "buy_art"
                    },
                    {
                        title: "Sell Art",
                        payload: "sell_art"
                    }
                    ])
            ];
        } else if (sell_art_prompt === 1) {
            responses = Response.genText("Please upload your art");
            sell_art_prompt = 0; //reset prompt counter
        }
    } else if (received_message.attachments) {
        // Gets the URL of the message attachment
        const attachment_url = received_message.attachments[0].payload.url;
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
    sendResponses(sender_psid, responses);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let responses;
    //Get the payload for the postback:
    let payload = received_postback.payload;
    //Set the response based on the postback payload
    if (payload === "yes") {
        responses = Response.genButtonTemplate(
            "What category would you like to label it under?",
            [
                {
                    "type": "postback",
                    "title": "Painting",
                    "payload": "sell_painting"
                },
                {
                    "type": "postback",
                    "title": "Mixed Media",
                    "payload": "sell_mixed_media"
                },
                {
                    "type": "postback",
                    "title": "Sculpture",
                    "payload": "sell_sculpture"
                }
            ]
        );
    } else if (payload === "no") {
        responses = { "text": "Oops, try sending another image." }
    }
    //Send the message to acknowledge the postback
    sendResponses(sender_psid, responses);
}

// Handles messaging quick_reply events
function handleQuickReply(sender_psid, received_quick_reply) {
    let response;

    //Get the payload for the postback:
    let payload = received_quick_reply.payload;
    switch (payload) {
        case "buy_art":
            handleBuyArt(sender_psid);
            break;
        case "sell_art": 
            handleSellArt(sender_psid);
            break;
        case "buy_jewelry":
        case "buy_decorative_art":
        case "buy_fine_art":
            response = { "text": `What type of ${payload} are you looking for?`}
            break;
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
        })
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
            getUserProfile(sender_psid)
                .then(userProfile => {
                    // assign to sender_firstName variable:
                    sender_firstName = userProfile.first_name;
                    // Check if the event is a message or postback and
                    // pass the event to the appropriate handler function
                    if (webhook_event.message) {
                        if (webhook_event.message.quick_reply) {
                            handleQuickReply(sender_psid, webhook_event.message.quick_reply);
                        } else {
                            // send default start message:
                            handleMessage(sender_psid, webhook_event.message);
                        }   
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

// Buy or Sell art functions
async function handleBuyArt(sender_psid) {
    let responses;
    // Create the payload for a basic text message
    responses = [
        Response.genQuickReply(
            "What are you looking to bid on today?", [
            {
                title: "Decorative Art",
                payload: "buy_decorative_art"
            },
            {
                title: "Jewelry",
                payload: "buy_jewelry"
            },
            {
                title: "Fine Art",
                payload: "buy_fine_art"
            }
            ])
    ];
    // Sends the response message
    sendResponses(sender_psid, responses);
}

function handleSellArt(sender_psid) {
    sell_art_prompt = 1; //cnter for keeping track of prompts
    let responses;
    // Create the payload for a basic text message
    responses = [
        Response.genText(
            `Hi ${sender_firstName}, I'm here to guide you through selling your first art work. 
What is the title of your artwork?`)
    ];
    // Sends the response message
    sendResponses(sender_psid, responses);
}

// Helper: send response message
async function sendResponses(sender_psid, responses) {
    if (Array.isArray(responses)) {
        let delay = 0;
        for (let response of responses) {
            await callSendAPI(sender_psid, response, delay * 3000);
            delay++;
        }
    } else {
        callSendAPI(sender_psid, responses, 0);  
    }
}

//Functions returning sender first name, last name, and profile pic
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

          resolve(JSON.parse(body));
        });
    });
  }