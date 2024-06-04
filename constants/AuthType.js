class AuthType {

    static get user() {
        return 'user';
    }

    static get agent() {
        return 'agent';
    }

    static get client() {
        return 'client';
    }

    static get service() {
        return 'service';
    }

    static get customer() {
        return 'customer';
    }
}

module.exports = AuthType;
