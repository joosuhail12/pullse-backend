const { CourierClient } = require("@trycourier/courier");
const BaseService = require("./BaseService");
require('dotenv').config();  // if using .env for config


// Using singleton pattern to just keep one instance of the NotificationService 
class NotificationService extends BaseService {
    static instance = null;
    courier = null;
    availableNotificationsTypes = [
        'pullse_ticket_assigned_to_user'
    ];

    defaultParameters = {
        'pullse_ticket_assigned_to_user': {
            'title': 'Ticket Assigned',
            'body': 'Hey there! A new ticket has been assigned to you.',
        }
    }

    parameterMappingForTypes = {
        'pullse_ticket_assigned_to_user': null
    }

    constructor() {
        super();
        this.init();
    }

    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    async init() {
        this.courier = new CourierClient({ authorizationToken: process.env.COURIER_AUTH_TOKEN });
    }

    async sendNotification(notificationType, userId, parameters) {
        if (!this.availableNotificationsTypes.includes(notificationType)) {
            throw new Error(`Notification type ${notificationType} is not available`)
        }

        // Validate parameters (Should include all parameters for the notification type )
        const requiredParameters = this.parameterMappingForTypes[notificationType]
        if (requiredParameters) {
            const missingParameters = Object.keys(requiredParameters).filter(param => !parameters[param])
            if (missingParameters.length > 0) {
                throw new Error(`Missing parameters: ${missingParameters.join(', ')}`)
            }
        }

        console.log("Sending notification to", userId)
        const { requestId } = await this.courier.send({
            message: {
                to: {
                    user_id: userId,
                },
                content: {
                    title: this.defaultParameters[notificationType].title,
                    body: this.defaultParameters[notificationType].body,
                },
                data: {
                    ...parameters,
                    type: notificationType,
                },
                routing: {
                    method: "single",
                    channels: ["inbox"],
                },
            },
        });

        console.log(requestId)

        return requestId;
    }

    async handleTicketAssignedToUser(userId) {
        try {
            // Fetch the user from user table to get the name of the user
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();

            if (userError) throw new Error(`Fetch failed at handleChatTicketReassigned(): ${userError.message}`);

            if (!user) {
                console.log("User not found");
                return;
            }

            console.log("User found", user);

            await this.sendNotification('pullse_ticket_assigned_to_user', user.id); // user.email
        } catch (error) {
            console.error("Error in handleTicketAssignedToUser", error);
        }
    }


    async authenticateCourier(userId) {
        console.log("Authenticating courier for user", userId);
        try {
            // Validate the user id
            if (!userId) {
                throw new Error("User id is required");
            }

            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, email')
                .eq('id', userId)
                .single();

            if (userError) throw new Error(`Fetch failed at authenticateCourier(): ${userError.message}`);

            if (!user) {
                throw new Error("User not found");
            }

            const requiredScopes = [
                `user_id:${userId}`,
                'inbox:read:messages',    // Essential for receiving messages
                'inbox:write:messages',   // May be needed for real-time updates
                'inbox:write:event',      // Required for live event handling
                'inbox:write:events'      // Required for live event handling
            ];

            const scope = requiredScopes.join(' ');

            const response = await fetch('https://api.courier.com/auth/issue-token', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.COURIER_AUTH_TOKEN}`, // Secret key
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scope: scope,
                    expires_in: "24h"
                })
            });

            console.log("Response from courier", response);

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error("Error in authenticateCourier", error);
            return null;
        }
    }
}

module.exports = NotificationService;