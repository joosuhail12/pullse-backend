import Ably from 'ably';
import { createClient } from '@supabase/supabase-js';
import InternalService from './internalService.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const qaResultSubscriptions = new Set();   // store ticketIds we already wired
const qaResultSubscriptionsTime = {};

export const ensureQaSubscription = async (ticketId, sessionId) => {
  const internalService = new InternalService();
  if (qaResultSubscriptions.has(ticketId)){
    return;
  } 
  const {data:users, error:usersError} = await supabase.from('users').select('id, fName, lName, clientId, defaultWorkspaceId').eq('bot_enabled', true).single();
  if (usersError){
    console.error(usersError);
    return;
  }
  const resCh = ably.channels.get(`document-qa-results`);   // generic channel
  resCh.subscribe(async (msg) => {
    if ((qaResultSubscriptionsTime[msg.data.answer] && new Date() - qaResultSubscriptionsTime[msg.data.answer] < 10000) || msg.data.answer === "Sorry, an internal error occurred."){
      return;
    }
    internalService.saveConversation(ticketId, msg.data.answer, users.id, 'agent', users.fname + " " + users.lname, users.clientId, users.defaultWorkspaceId);
    const reCh = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
    await reCh.publish('message_reply', {
      ticketId:ticketId,
      message:msg.data.answer,
      from:'agent',
      to:'customer',
      sessionId:sessionId
    });
    qaResultSubscriptionsTime[msg.data.answer] = new Date();
  });

  qaResultSubscriptions.add(ticketId);
}