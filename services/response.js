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

    static genText(text) {
        let response = {
            text: text
        };
        return response;
    }
}