let actions = [
  {
    "id": "create_ticket",
    "name": "Create Ticket",
    "entity": "ticket",
    "attributes": [
      {
        "id": "title",
        "name": "Title",
        "fieldType": "string",
        "required": true
      },
    ]
  },
  {
    "id": "update_ticket",
    "name": "Update Ticket",
    "entity": "ticket",
    "attributes": null
  },
  {
   "name": "Reply to Customer",
    "id": "reply_to_customer",
    "entity": null,
    "attributes": [
      {
        "id": "message",
        "name": "Message",
        "fieldType": "text",
        "required": true
      }
    ]
  },
  {
    "name": "Add Note",
    "id": "add_note",
    "entity": null,
    "attributes": [
      {
        "id": "message",
        "name": "Message",
        "fieldType": "text",
        "required": true
      }
    ]
  },
  {
    "name": "Internal Notification",
    "id": "internal_notification",
    "entity": null,
    "attributes": [
      {
        "id": "assigneeId",
        "name": "Assignee",
        "entity": "ticket",
        "fieldType": "list",
        "options": null,
        "required": true
      },
      {
        "id": "teamId",
        "name": "Team Id",
        "entity": "ticket",
        "fieldType": "list",
        "options": null,
        "required": false
      },
      {
        "id": "subject",
        "name": "Subject",
        "fieldType": "string",
        "required": true
      },
      {
        "id": "message",
        "name": "Message",
        "fieldType": "text",
        "required": true
      },
    ]
  },
];

module.exports = actions;