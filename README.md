# art-auction-messenger-bot
messenger bot for hackathon 

## Bot set-up steps:
- Rename ".sample.env" to ".env" and add the required information
- If using free ngrok for local tunneling, the callback url will need to be updated on each new ngrok session with "https://[ngrok link]/webhook". The PAGE_ACCESS_TOKEN may also need to be regenerated on each new session.
### Setting up webhook
- Reference: https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
- Testing the webhook
    - Run local app: "nodemon index.js" in command line
    - Test webhook verification:
        - In a separate command line: 
        curl -X GET "localhost:1337/webhook?hub.verify_token=<YOUR_VERIFY_TOKEN>&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe"
    - Test webhook:
        - curl -H "Content-Type: application/json" -X POST "localhost:1337/webhook" -d '{"object": "page", "entry": [{"messaging": [{"message": "TEST_MESSAGE"}]}]}'
### Quick Start App:
- reference: https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start