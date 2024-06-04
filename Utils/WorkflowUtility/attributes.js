let attributes = {
    "ticket": [
        {
            "id": "title",
            "name": "Title",
            "fieldType": "string"
        },
        {
            "id": "priority",
            "name": "Priority",
            "fieldType": "list",
            "options": []
        },
        {
            "id": "status",
            "name": "Status",
            "fieldType": "list",
            "options": []
        },
        {
            "id": "typeId",
            "name": "TicketType",
            "fieldType": "list",
            "options": []
        },
        {
            "id": "teamId",
            "name": "Team",
            "fieldType": "list",
            "options": []
        },
        {
            "id": "assigneeId",
            "name": "Assignee",
            "fieldType": "list",
            "options": []
        },
        {
            "id": "tagIds",
            "name": "Tags",
            "fieldType": "multi-select",
            "options": []
        },
        {
            "id": "customerId",
            "name": "Customer",
            "fieldType": "boolean",
        },
        {
            "id": "externalId",
            "name": "External ID",
            "fieldType": "string"
        },
        // {
        //     "id": "feedback",
        //     "name": "Feedback",
        //     "fieldType": "number"
        // },
        {
            "id": "channel",
            "name": "Channel",
            "fieldType": "list",
            "options": []
        }
    ],
    "customer": [
        {
            "id": "name",
            "name": "Name",
            "fieldType": "string"
        },
        {
            "id": "email",
            "name": "Email",
            "fieldType": "string"
        },
        {
            "id": "phone",
            "name": "Phone",
            "fieldType": "string"
        },
        {
            "id": "company",
            "name": "Company",
            "fieldType": "boolean"
        },
        {
            "id": "tags",
            "name": "Tags",
            "fieldType": "multi-select",
            "options": []
        },
        {
            "id": "notes",
            "name": "Notes",
            "fieldType": "text"
        }
    ],
    "company": [
        {
            "id": "name",
            "name": "Name",
            "fieldType": "string"
        },
        {
            "id": "tags",
            "name": "Tags",
            "fieldType": "multi-select",
            "options": []
        },
        {
            "id": "notes",
            "name": "Notes",
            "fieldType": "text"
        },
        // {
        //     "id": "websites",
        //     "name": "Websites",
        //     "fieldType": "multi-select"
        // }
    ]
};

module.exports = attributes;