const BaseService = require('./BaseService');
const errors = require('../errors');

class AnalyticsService extends BaseService {
    constructor() {
        super();
    }

    async getTotalOpenTicketsDayWise(workspaceId, clientId) {
        try {
            // Get all tickets created in the workspace
            const { data: tickets, error } = await this.supabase
                .from('tickets')
                .select('createdAt, closedAt')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (error) {
                throw new errors.InternalServerError(error.message);
            }

            const dayWiseCounts = {};

            tickets.forEach(ticket => {
                const createdDate = new Date(ticket.createdAt).toISOString().split('T')[0];
                const closedDate = ticket.closedAt ? new Date(ticket.closedAt).toISOString().split('T')[0] : null;

                // Add count for creation date
                dayWiseCounts[createdDate] = (dayWiseCounts[createdDate] || 0) + 1;

                // Subtract count for closure date (if exists)
                if (closedDate) {
                    dayWiseCounts[closedDate] = (dayWiseCounts[closedDate] || 0) - 1;
                }
            });

            // Convert to array format and sort by date
            const result = Object.entries(dayWiseCounts)
                .map(([day, count]) => ({
                    day,
                    total_open_tickets: count
                }))
                .sort((a, b) => new Date(a.day) - new Date(b.day));

            // Calculate running total
            let runningTotal = 0;
            result.forEach(day => {
                runningTotal += day.total_open_tickets;
                day.total_open_tickets = runningTotal;
            });

            return result;
        } catch (error) {
            console.error(error);
            throw new errors.InternalServerError(error.message);
        }
    }
}

module.exports = AnalyticsService;
