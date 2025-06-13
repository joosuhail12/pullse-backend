const { jwtDecode } = require("jwt-decode");

class TemporalServerUtils {
    constructor() {
        this.temporalServerJwt = "";
        this.apiKey = process.env.TEMPORAL_API_KEY || "";
        this.jwtExpiry = null;
    }

    static getInstance() {
        if (!TemporalServerUtils.instance) {
            TemporalServerUtils.instance = new TemporalServerUtils();
        }
        return TemporalServerUtils.instance;
    }

    isJwtValid() {
        if (!this.temporalServerJwt || this.temporalServerJwt === "") {
            return false;
        }

        try {
            const decoded = jwtDecode(this.temporalServerJwt);
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp > currentTime + 60; // Add 60 second buffer
        } catch (error) {
            console.error("Error decoding JWT:", error);
            return false;
        }
    }

    async ensureAuthenticated() {
        if (!this.isJwtValid()) {
            await this.authTemporalServer();
        }
    }

    async startWorkflow(data) {
        const { workflowId, ticketId, contactId, companyId } = data;

        await this.ensureAuthenticated();

        const response = await fetch(process.env.TEMPORAL_SERVER_URL + "/workflow/startWorkflow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.temporalServerJwt}`,
            },
            body: JSON.stringify({
                workflowId,
                ticketId,
                contactId,
                companyId,
            }),
        });

        if (!response.ok) {
            // Check if the error is 401 (token might have expired between check and use)
            if (response.status === 401) {
                await this.authTemporalServer();
                return this.startWorkflow(data);
            }

            const errorText = await response.text();
            throw new Error(`Failed to start workflow (${response.status}): ${errorText}`);
        }
        console.log("Workflow started");

        return response.json();
    }

    async authTemporalServer() {
        if (!this.apiKey) {
            throw new Error("API key not set. Please set TEMPORAL_API_KEY environment variable.");
        }

        const response = await fetch(process.env.TEMPORAL_SERVER_URL + "/auth", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to authenticate with temporal server (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        this.temporalServerJwt = data.token;

        return this.temporalServerJwt;
    }
}

module.exports = TemporalServerUtils;