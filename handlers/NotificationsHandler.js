const BaseHandler = require('./BaseHandler');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const NotificationService = require('../services/NotificationService');
class NotificationsHandler extends BaseHandler {
  constructor() {
    super();
  }
  async getNotifications(req, reply) {
    try {
      // ─── auth context (adapt to your auth-middleware) ─────────────────────
      const userId = req.authUser.id;         // the signed-in agent
      const canSeeUnassigned = true;

      // ─── pull EVERYTHING for this user in one query (max 100 newest) ──────
      const { data, error } = await supabase
        .from('notification_recipients')
        .select(`
            is_read,
            notifications:notification_id (
            id,
            type,
            entity_id,
            payload,
            created_at
            )
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })   // ← use THIS column
        .limit(100);

      if (error) throw error;

      // ─── bucket the rows into 3 logical lists ─────────────────────────────
      const mentions = [];
      const inbox = [];
      const unassigned = [];

      data.forEach((row) => {
        const n = { ...row.notifications, is_read: row.is_read };

        switch (n.type) {
          case 'TICKET_MENTION':
            mentions.push(n);
            break;

          case 'NEW_MESSAGE':
            // inbox.push(n);
            break;

          case 'NEW_TICKET':
            if (canSeeUnassigned && n.payload?.routingType === 'manual')
              unassigned.push(n);
            else
              inbox.push(n);               // direct assignment → user inbox
            break;
        }
      });
      const responseData = {
        counts: {
          mentions: mentions.filter((n) => !n.is_read).length,
          inbox: inbox.filter((n) => !n.is_read).length,
          unassigned: unassigned.filter((n) => !n.is_read).length
        },
        mentions,
        inbox,
        unassigned
      };
      return this.responder(req, reply, Promise.resolve(responseData));
    } catch (error) {
      return this.responder(req, reply, Promise.reject(error));
    }
  }

  async authenticateCourier(req, reply) {
    try {
      const userId = req.authUser.id;
      const token = await NotificationService.getInstance().authenticateCourier(userId);
      return this.responder(req, reply, Promise.resolve({ token }));
    } catch (error) {
      return this.responder(req, reply, Promise.reject(error));
    }
  }
}

module.exports = NotificationsHandler;