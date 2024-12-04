class Status {

    static get ACTIVE() {
        return "active";
    }

    static get BANNED() {
        return "banned";
    }
}

class UserType {

    static get agent() {
        return 'agent';
    }

    static get service() {
        return 'service';
    }

    static get workflow() {
        return 'workflow';
    }

    static get customer() {
        return 'customer';
    }

    static get chatbot() {
        return 'chatbot';
    }
}

module.exports = { Status, UserType };
