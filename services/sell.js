"use strict";

const Response = require("./response");

module.exports = class Sell {
    constructor(user, webhookEvent) {
        this.user = user;
        this.webhookEvent = webhookEvent;
    }

    handlePayload(payload) {
        let response;

        switch (payload) {
            case "paintings":
                response = (
                    Response.genText("What year was it created?")
                );
                break;
            case "mixed media":
                response = (
                    Response.genText("What year was it created?")
                );
                break;
        }
    }
}