const errors = require("./errors");
class ResponseHandler {
    successHandler(data) {
        let response = {
            status: "success",
            message: "Successfully done",
        };
        if (data) {
            response.data = data;
        }
        return Promise.resolve(response);
    }

    errorHandler(data) {
        return Promise.reject(data);
    }
}

function handler(req, res, promise) {
    let _inst = new ResponseHandler();
    return promise
        .then(_inst.successHandler)
        .catch(_inst.errorHandler)
        .then((data) => {
            res.send(data);
        })
        .catch((data) => {
            if (data?.httpCode) {
                let resp = {
                    statusCode: data?.httpCode || 500,
                    code: data.code || 500,
                    error: data.error || 500,
                    message: data.message,
                };
                if (data.data) {
                    resp.data = data.data;
                }
                return res.code(data.httpCode).send(resp);
            } else {
                let error = new errors.Internal();
                return res.code(error.httpCode).send(error);
            }
        });
}

module.exports = handler;
