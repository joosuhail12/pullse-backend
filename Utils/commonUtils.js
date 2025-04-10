const TicketTypeService = require('../services/TicketTypeService');
const UserService = require('../services/UserService');
const TeamService = require('../services/TeamService');
const TagService = require('../services/TagService');
const CustomerService = require('../services/CustomerService');
const jwt = require('jsonwebtoken');
async function getAttributeOptions(entity, { workspaceId, clientId }, filters = {}) {
    let options = [];
    let inst, resp;
    filters["workspaceId"] = workspaceId;
    filters["clientId"] = clientId;
    switch (entity) {
        case 'typeId':
            inst = new TicketTypeService(['id', 'name', '-_id']);
            resp = await inst.paginate(filters, 0);
            options = resp;
            break;

        case 'assigneeId':
            inst = new UserService(['id', 'name', '-_id']);
            resp = await inst.paginate(filters, 0);
            options = resp;
            break;

        case 'teamId':
            inst = new TeamService(['id', 'name', '-_id']);
            resp = await inst.paginate(filters, 0);
            options = resp;
            break;

        case 'tagIds':
            inst = new TagService(['id', 'name', '-_id']);
            resp = await inst.paginate(filters, 0);
            options = resp;
            break;

        case 'customerId':
            inst = new CustomerService(['id', 'name', '-_id'], { TagService });
            resp = await inst.paginate(filters, 0);
            options = resp;
            break;

        case 'priority':
            options = [
                {
                    "id": 4,
                    "name": "Critical",
                    "color": "#FF0000"
                },
                {
                    "id": 3,
                    "name": "High",
                    "color": "#FF0000"
                },
                {
                    "id": 2,
                    "name": "Medium",
                    "color": "#c2aa21"
                },
                {
                    "id": 1,
                    "name": "Low",
                    "color": "#3178CA"
                }
            ];
            break;

        case 'status':
            options = [
                {
                    "id": "open",
                    "name": "Open",
                    "color": "#c2aa21"
                },
                {
                    "id": "in-progress",
                    "name": "In Progress",
                    "color": "#3178CA"
                },
                {
                    "id": "closed",
                    "name": "Closed",
                    "color": "#25ba5d"
                },
            ];
            break;

        case 'channel':
            options = [
                {
                    "id": "email",
                    "name": "Email",
                },
                {
                    "id": "chat",
                    "name": "Chat",
                }
            ];
            break;

    }
    return options;
}

async function verifyJWTToken(authHeader, secret = '$$SUPER_SECRET_JWT_SECRET!@#$%5') {
    if (!authHeader) {
        return false;
    }
    const token = authHeader.split(" ")[1];
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                resolve(false);
            } else {
                if (decoded && decoded.exp && decoded.exp < Date.now()) {
                    resolve(false);
                } else {
                    resolve(decoded);
                }
            }
        });
    });
};

module.exports = {
    getAttributeOptions,
    verifyJWTToken
}