class UserRoles {

    // static get internalAdmin() {
    //     return "INTERNAL_ADMIN";
    // }

    // static get agentAdmin() {
    //     return "AGENT_ADMIN";
    // }

    static get superAdmin() {
        return "SUPER_ADMIN";
    }

    static get organizationAdmin() {
        return "ORGANIZATION_ADMIN";
    }

    static get workspaceAdmin() {
        return "WORKSPACE_ADMIN";
    }

    static get workspaceAgent() {
        return "WORKSPACE_AGENT";
    }

    static get visitor() {
        return "VISITOR";
    }
}


module.exports = UserRoles;

// crud
// workspace modification
// agent can ticket update create the ticket 