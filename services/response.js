"use strict";

module.exports = class Response {
    static genQuickReply(text, quickReplies) {
        let response = {
            text: text,
            quick_replies: []
        };

        for (let quickReply of quickReplies) {
            response["quick_replies"].push({
                content_type: "text",
                title: quickReply["title"],
                payload: quickReply["payload"]
            });
        }
        return response;          
    }

    static genGenericTemplate(image_url, title, subtitle, buttons) {
        let response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: title,
                            subtitle: subtitle,
                            image_url: image_url,
                            buttons: buttons
                        }
                    ]
                }
            }
        };
        return response;
    }

    static genGenericTemplateCarousel(cardsArray) {
        let response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: cardsArray.map(card => {
                        return {
                            title: card.title,
                            subtitle: card.subtitle,
                            image_url: card.image_url,
                            buttons: card.buttons
                        }
                    })
                }
            }
        };
        return response;
    }

    static genButtonTemplate(title, buttons) {
        console.log("genButtonTemplate reached");
        let response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: title,
                    buttons:  buttons
                }
            }
        };
        return response;
    }

    static genText(text) {
        let response = {
            text: text
        };
        return response;
    }
}