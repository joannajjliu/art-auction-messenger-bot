'use strict';

// Imports dependencies and set up http server
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const Response = require("./services/response"),
    mongoose = require('mongoose'),
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); //creates express http server

/* ----------- Database connections: ------------------ */
// Connecting to database:
mongoose.connect("mongodb://localhost:27017/artAuctionDB", 
    {useUnifiedTopology: true, useNewUrlParser: true});

//note: _id is auto created
const artworkSchema = new mongoose.Schema ({
    pid: Number, //pid of seller
    category: String, // Painting, Mixed Media, or Sculpture
    title: String,
    imageURL: String,
    yearCreated: Number,
    length: Number, //in inches
    width: Number, //in inches
    price: Number //in CAD, starting bid price
});

const personSchema = new mongoose.Schema ({
    pid: Number,
    firstName: String,
    lastName: String,
    role: String, //seller or buyer
    artworksToSell: [artworkSchema] //
});

// artworks collection
const Artwork = mongoose.model("Artwork", artworkSchema);
// people collection
const Person = mongoose.model("Person", personSchema);

// Database collection properties:
let dbPID;
let dbFirstName;
let dbLastName;
let dbRole;

let dbCategory;
let dbTitle;
let dbImgURL;
let dbYrCreated;
let dbLength;
let dbWidth;
//add dbHeight later;
let dbPrice;
/* ----------- End of database section: ------------------ */

// Declaring variables:
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
let sender_firstName;
let sell_art_prompt = 0;
// Handler functions:
// Handles messages events
async function handleMessage(sender_psid, received_message) {
    console.log("dbCategory: ", dbCategory);
    let responses;
    // Check if the message contains text
    if (received_message.text) {
        switch (sell_art_prompt) {
            case 0:
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
                break;
            case 1:
                responses = Response.genText("Please upload your art");
                dbTitle = received_message.text; //artwork title
                sell_art_prompt = 0; //reset prompt counter
                break;
            case 2:
                responses = Response.genText(
                    `Perfect, for your artwork created in ${received_message.text}, please enter its LENGTH in INCHES:`);
                sell_art_prompt = 3; //width prompt
                dbYrCreated = received_message.text; //yr created
                break;
            case 3:
                responses = Response.genText(
                    `Thank you. Now what is its WIDTH in INCHES`);
                sell_art_prompt = 4; //price prompt
                dbLength = received_message.text; //image length
                break;
            case 4:
                responses = Response.genText(
                    `Thank you for inputting your artwork's dimensions! Now for the last step, what price do you have in mind?
Please enter in CAD, rounded to the nearest dollar.`)
                sell_art_prompt = 5; //notification prompt
                dbWidth = received_message.text; //image width
                break;
            case 5:
                responses = Response.genText(
                    `Great! Thank you for submitting your artwork and its description and pricing.
We will set the auction details, and send you a notification on next steps.`);
                sell_art_prompt = 0; //reset prompt counter
                dbPrice = received_message.text; //price in CAD
                //save to db:

                // const artwork = new Artwork ({
                //     pid: dbPID,
                //     category: dbCategory, // Painting, Mixed Media, or Sculpture
                //     title: dbTitle,
                //     imageURL: dbImgURL,
                //     yearCreated: dbYrCreated,
                //     length: dbLength, //in inches
                //     width: dbWidth, //in inches
                //     price: dbPrice //in CAD
                // })
                // artwork.save();

                //save to database if not exists, else update existing
                Artwork.updateOne({pid: dbPID, title: dbTitle}, {
                        pid: dbPID,
                        category: dbCategory, // Painting, Mixed Media, or Sculpture
                        title: dbTitle,
                        imageURL: dbImgURL,
                        yearCreated: dbYrCreated,
                        length: dbLength, //in inches
                        width: dbWidth, //in inches
                        price: dbPrice //in CAD
                    }, {upsert : true}, (err) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Successfully updated artwork collection");
                        }
                    });



                break;
        }
    } else if (received_message.attachments) {
        // Gets the URL of the message attachment
        const attachment_url = dbImgURL = received_message.attachments[0].payload.url;
        
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
    switch (payload) {
        case "sell_photography":
        case "sell_painting":
        case "sell_sculpture":
            responses = Response.genText(
                `What year was it created? 
Please enter the year below.`
            )
            sell_art_prompt = 2; // length prompt
            dbCategory = payload.split('_')[1]; //set for db (photography, painting, sculpture)
            break;
        case "yes":
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
                        "title": "Photography",
                        "payload": "sell_photography"
                    },
                    {
                        "type": "postback",
                        "title": "Sculpture",
                        "payload": "sell_sculpture"
                    }
                ]
            );
            break;
        case "no": 
            responses = { "text": "Oops, try sending another image." }
            break;
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
            dbRole = "buy";
            break;
        case "sell_art": 
            handleSellArt(sender_psid);
            dbRole = "sell";
            break;
        case "buy_painting":
        case "buy_photography":
        case "buy_sculpture":
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
            // console.log("webhook event: ", webhook_event);
              
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            dbPID = webhook_event.sender.id;
            getUserProfile(sender_psid)
                .then(userProfile => {
                    // assign to sender_firstName variable:
                    sender_firstName = userProfile.first_name;
                    dbFirstName = userProfile.first_name;
                    dbLastName = userProfile.last_name;
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
                title: "Painting",
                payload: "buy_painting"
            },
            {
                title: "Photography",
                payload: "buy_photography"
            },
            {
                title: "Sculpture",
                payload: "buy_sculpture"
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
Please note, to update a previously uploaded artwork, please ensure it has the SAME TITLE as what was previously.
New titles will be recorded as a new artwork.
Now, what is the title of your artwork?`)
    ];
    //save to database if not exists, else update existing
    Person.updateOne({pid: dbPID}, {
        pid: dbPID,
        firstName: dbFirstName,
        lastName: dbLastName,
        role: dbRole }, {upsert : true}, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("Successfully updated people collection");
            }
        });

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