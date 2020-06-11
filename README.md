# fb-messenger-bot-starter
bot starter practice for fb messenger

## Bot set-up steps:
### Setting up webhook
- Reference: https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
- Testing the webhook
    - Run local app: "nodemon index.js" in command line
    - Test webhook verification:
        - In a separate command line: 
        curl -X GET "localhost:1337/webhook?hub.verify_token=<YOUR_VERIFY_TOKEN>&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe"
    - Test webhook:
        - curl -H "Content-Type: application/json" -X POST "localhost:1337/webhook" -d '{"object": "page", "entry": [{"messaging": [{"message": "TEST_MESSAGE"}]}]}'