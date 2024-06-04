const errors = require('./errors');

const Errors = {};

for (const [name, { message, code, httpCode }] of Object.entries(errors)) {
    Errors[name] = class extends Error {
        constructor(msg = message, data = null) {
            super();
            this.error = message;
            this.message = msg;
            this.code = code;
            this.httpCode = httpCode;
            this.data = data;
        }
    };
}

module.exports = Errors;
