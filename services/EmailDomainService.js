const Promise = require("bluebird");
const errors = require("../errors");
const EmailDomainUtility = require('../db/utilities/EmailDomainUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const { createClient } = require('@supabase/supabase-js');

class EmailDomainService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new EmailDomainUtility();
        this.entityName = 'companies';
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'emaildomains';
        this.listingFields = ["id", "domain", "createdAt", "updatedAt", "description", "isVerified"];
        this.updatableFields = ["name", "domain", "description", "isVerified", "mailgunRouteId", "dnsRecords"];
    }

    async createEmailDomain(emailDomainData) {
        try {
            let { domain, clientId } = emailDomainData;
            let emailDomain = await this.findOne({ domain, clientId, archiveAt: null });

            const mailgun = new Mailgun(formData);
            let mg = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            });

            if (!_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.AlreadyExist(this.entityName + " already exist."));
            }

            const mgData = {
                name: domain,
                dkim_key_size: 1024,
                dkim_selector: 'email'
            }

            const domainId = await mg.domains.create(mgData, (error, body) => {
                if (error) {
                    return Promise.reject(error)
                }
                return body;
            }).then(async (response) => {
                const emailDomainDbData = {
                    ...emailDomainData,
                    dnsRecords: [...response.receiving_dns_records, ...response.sending_dns_records],
                };
                const data = await this.create(emailDomainDbData);

                return data;
            }).catch((error) => {
                console.error("Error while adding domain to mailgun: " + error);
            });

            if (!domainId) {
                return Promise.reject(new errors.Internal("Error while adding domain to mg"));
            }

            return domainId;

        } catch (err) {
            return this.handleError(err);
        }

    }

    async listDomainKeys(emailDomainData) {
        try {
            let { id, clientId } = emailDomainData;
            let emailDomain = await this.findOne({ id, clientId });
            if (_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            const mailgun = new Mailgun(formData);
            let mg = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            });
            return await mg.domains.get(emailDomain.domain);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async verifyDomainKeys(emailDomainData) {
        try {
            let { id, clientId } = emailDomainData;
            console.error(id, clientId)
            let emailDomain = await this.findOne({ id, clientId });
            if (_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            const mailgun = new Mailgun(formData)
            let mg = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            })
            const mailgunResponse = await mg.domains.verify(emailDomain.domain);

            let routeId = null;

            if (mailgunResponse.state !== "unverified") {
                try {
                    const routeResponse = await mg.routes.create({
                        priority: 1,
                        description: `Catch-all route for ${emailDomain.domain}`,
                        expression: `match_recipient("^.*@${emailDomain.domain.replace('.', '\\.')}$")`,
                        action: ['forward("https://pullseapi.devwatts.xyz/api/email-domain/email-webhook")'], // TODO: Make this dynamic -- dev
                    });

                    routeId = routeResponse.id;

                    console.log(routeResponse, 'routeResponse from mailgun');
                } catch (e) {
                    console.error(e);
                }
            }

            this.update({ id: emailDomain.id }, { dnsRecords: [...mailgunResponse.sending_dns_records, ...mailgunResponse.receiving_dns_records], isVerified: mailgunResponse.state === 'unverified' ? false : true, mailgunRouteId: routeId });

            const details = await this.getDetails(id, clientId);

            return details;
        } catch (err) {
            return this.handleError(err)
        }
    }

    async getDetails(id, clientId) {
        try {
            let emailDomain = await this.findOne({ id, clientId });
            console.log(emailDomain);
            if (_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return emailDomain;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateEmailDomain({ id, workspaceId, clientId }, updateValues) {
        try {
            let emailDomain = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: emailDomain.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteEmailDomain({ id, workspaceId, clientId }) {
        try {
            let emailDomain = await this.getDetails(id, clientId);
            let res = await this.softDelete(emailDomain.id, "archiveAt");
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async sendEmail(data) {
        try {
            console.log(data);
            const { clientId, message, workspaceId, ticketId } = data;

            let ticket = await this.ticketServiceInst.findOne({ id: ticketId, clientId, workspaceId });

            if (!ticket) {
                return Promise.reject(new errors.NotFound('Ticket not found'));
            }

            console.log(ticket);

            let customer = await this.customerServiceInst.findOne({ id: ticket.customerId });

            if (!customer) {
                return Promise.reject(new errors.NotFound('Customer not found'));
            }

            let client = await this.clientService.findOne({
                id: clientId,
            });


            // Retrieve sender domain from the database
            let emailDomain = await this.findOne({ clientId });

            if (!emailDomain || !emailDomain.domain) {
                return Promise.reject(new errors.NotFound('No email domain configured for this client.'));
            }

            const mailgun = new Mailgun(formData);
            let mg = mailgun.client({
                username: 'api',
                key: process.env.MAILGUN_API_KEY
            });

            const senderEmail = `${emailDomain.fromEmail}@${emailDomain.domain}`; // Adjust sender email format

            // **1. Retrieve previous conversation history**
            let previousMessages = await this.conversationServiceInst.getAllMessageOfConversation(ticket.id, "array", "email");

            console.log(previousMessages)

            // **2. Format email body for threading**
            let threadHistory = previousMessages.map(msg => {
                return `On ${new Date(msg.createdAt).toUTCString()}, ${msg.userType == "customer" ? customer.name : client.name ?? "Agent"} wrote:\n> ${msg.message.replace(/\n/g, '\n> ')}`;
            }).join('\n\n');

            let emailBody = `${message} \n\n----- Previous Messages-----\n${threadHistory} `;

            // **3. Set email headers**
            const emailData = {
                from: senderEmail,
                to: customer.email,
                subject: `Re: ${ticket.title} `, // Keep subject consistent
                text: emailBody,
                'h:References': ticket.lastMailgunMessageId ? `< ${ticket.lastMailgunMessageId}> ` : undefined,
                'h:In-Reply-To': ticket.lastMailgunMessageId ? `< ${ticket.lastMailgunMessageId}> ` : undefined,
                'h:Reply-To': senderEmail,
            };

            console.log(emailData);

            // **4. Send email via Mailgun**
            const mailgunResponse = await mg.messages.create(emailDomain.domain, emailData);

            console.log(mailgunResponse);

            // **5. Save email response in conversation**
            let messageData = {
                clientId,
                createdBy: clientId,
                workspaceId,
                lastMailgunMessageId: mailgunResponse.id.replace(/^<|>$/g, ""),
                message: message,
                type: "email",
                userType: AuthType.agent,
                ticketId: ticket.id
            };

            console.log(messageData);

            let conversation = await this.conversationServiceInst.addMessage(messageData, false);

            console.log(conversation);
            console.log("Added mail to the conversation\n\n");

            return Promise.resolve();

        } catch (e) {
            return this.handleError(e);
        }
    }

    async emailWebhook(data) {
        try {
            // let inst = new BaseFileSystem();
            // let fileSrc = path.join(__dirname, "../", "tmp", (Date.now()) + ".json");
            // //            await inst.writeFile(fileSrc, JSON.stringify(data));
            const domainDetails = await this.getDomainByName(data.recipient.split('@')[1]);

            if (!domainDetails) {
                return Promise.reject(new errors.NotFound('Domain not found'));
            }

            let workspaceId = domainDetails.workspaceId;
            let clientId = domainDetails.clientId;

            let customer = await this.customerServiceInst.findOrCreateCustomer({ email: data.sender, workspaceId, clientId, createdBy: "email", type: "customer", name: data.from.split(' ')[0] });

            let createdBy = customer.id;
            let userType = AuthType.customer;

            if (data['In-Reply-To'] !== undefined) {
                // this is a reply to a previous mail
                let ticket = await this.ticketServiceInst.findOne({ workspaceId, clientId, lastMailgunMessageId: data['In-Reply-To'].replace(/^<|>$/g, "") });

                // await this.ticketServiceInst.update({ id: ticket.id }, { mailgunMessageId: data["Message-Id"].replace(/^<|>$/g, "") });

                let messageData = {
                    clientId,
                    createdBy,
                    workspaceId,
                    lastMailgunMessageId: data["Message-Id"].replace(/^<|>$/g, ""),
                    message: data['stripped-text'],
                    type: "email",
                    userType,
                    ticketId: ticket.id
                };

                await this.conversationServiceInst.addMessage(messageData, false);
            } else {
                // this is a new mail
                let messageData = {
                    clientId,
                    createdBy,
                    workspaceId,
                    lastMailgunMessageId: data["Message-Id"].replace(/^<|>$/g, ""),
                    message: data['stripped-text'],
                    type: "email",
                    userType,
                };
                let ticketData = {
                    title: data.subject,
                    description: data.subject,
                    ticketCreatedBy: userType,
                    customerId: customer.id,
                    channel: TicketChannel.email
                    // don't create new ticket if a conversation exist with Message-ID
                };
                await this.conversationServiceInst.addMessage(messageData, ticketData);
            }

            console.log(`Got new email from: ${data.sender} with Subject ${data.subject} `);

            return Promise.resolve();

        } catch (e) {
            return this.handleError(e);
        }
    }



    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex: `^${name}`, $options: "i" };
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = EmailDomainService;
