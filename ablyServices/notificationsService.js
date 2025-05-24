const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');

// REST client (no websocket) keeps memory + FD footprint low on server
const ably = new Ably.Rest(process.env.ABLY_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY           // service‑role key so we can write
);

/**
 * Persist a notification, create recipient rows in bulk, then fan‑out.
 *
 * @param {Object}  opts
 * @param {string}  opts.type            notification enum (e.g. "NEW_TICKET")
 * @param {string}  opts.entityId        related ticket / message id
 * @param {string} [opts.actorId=null]   who triggered the event (userId)
 * @param {string[]} opts.recipientIds   array of userIds to notify
 * @param {Object}  [opts.payload={}]    small JSON context (<= 1 KB)
 * @param {string[]} [opts.broadcastChannels=[]] extra Ably channels for group
 */
exports.createAndBroadcast = async function createAndBroadcast (opts) {
  const {
    type,
    entityId,
    actorId = null,                // may be a customer → not in users
    recipientIds = [],
    payload = {},
    broadcastChannels = []
  } = opts;

  if (!recipientIds.length && !broadcastChannels.length) return null;
  console.log("createAndBroadcast", opts);
  // ── sanity‑check actorId belongs to public.users; if not, skip it ──
  let insertCols = { type, entity_id: entityId, payload };
  if (actorId) {
    const { data: uExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', actorId)
      .single();
    if (uExists) insertCols.actor_id = actorId;  // FK ok
  }

  // 1️⃣  insert notification
  console.log("insertCols", insertCols);
  const { data: notif, error: nErr } = await supabase
    .from('notifications')
    .insert(insertCols)
    .select()
    .single();
  if (nErr) throw nErr;

  // 2️⃣  recipient fan‑out
  if (recipientIds.length) {
    const rows = recipientIds.map(uid => ({ notification_id: notif.id, user_id: uid }));
    const { error: rErr } = await supabase.from('notification_recipients').insert(rows);
    if (rErr) throw rErr;
  }

  // 3️⃣  personal realtime pushes
  recipientIds.forEach(uid => {
    ably.channels
        .get(`notifications:user:${uid}`)
        .publish(type.toLowerCase(), { notificationId: notif.id, entityId, payload });
  });

  // 4️⃣  group / queue broadcasts
  broadcastChannels.forEach(ch => {
    ably.channels
        .get(ch)
        .publish(type.toLowerCase(), { notificationId: notif.id, entityId, payload });
  });

  return notif.id;
};
