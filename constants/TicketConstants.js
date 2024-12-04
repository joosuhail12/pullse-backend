class Status {

    static get open() {
        return "open";
    }

    static get inProgress() {
        return "in-progress";
    }

    static get closed() {
        return "closed";
    }
}

class EntityType {

    static get conversation() {
        return 'conversation';
    }

    static get ticket() {
        return 'ticket';
    }
}

class MessageType {

    static get text() {
        return 'text';
    }

    static get note() {
        return 'note';
    }

    static get summary() {
        return 'summary';
    }

    static get qa() {
        return 'quality_assurance';
    }
}




module.exports = { Status, EntityType, MessageType };
