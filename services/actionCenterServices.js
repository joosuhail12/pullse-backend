const BaseService = require('./BaseService');
const _ = require('lodash');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class ActionCenterService extends BaseService {
  constructor() {
    super();
    this.entityName = 'Action Center Action';

    /* default projection for list/details */
    this.listingFields = [
      'id',
      'name',
      'description',
      'method',
      'endpoint',
      'is_active',
      'enabled',
      'created_at',
      'updated_at',
      'category',
      'folder_id'
    ];
  }

  /* ──────────────────────────────────────────
     Create a new action       (payload = UI form)
     ────────────────────────────────────────── */
  async createAction(payload) {
    const {
      name,
      toolName,
      endpoint,
      method,
      description,
      headers,
      parameters          = [],   // array of param objects
      connectedChatbots   = [],   // [{ id, name }…]
      category,
      folderId,
      workspaceId,
      clientId,
      createdBy
    } = payload;

    try {
      /* 1‒ Prevent duplicate by name in same workspace */
      const { data: existing } = await supabase
        .from('action_center_actions')
        .select('id')
        .eq('name', name)
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId)
        .maybeSingle();

      if (existing) {
        throw this.handleError(
          `${this.entityName} "${name}" already exists.`
        );
      }

      /* 2‒ Insert main action row */
      const { data: actionRows, error: insertErr } = await supabase
        .from('action_center_actions')
        .insert([{
          name,
          tool_name:   toolName,
          description,
          method,
          endpoint,
          headers,
          category,
          folder_id:   folderId ?? null,
          workspace_id: workspaceId,
          client_id:    clientId,
          created_by:   createdBy
        }])
        .select();

      if (insertErr) throw insertErr;

      const actionId = actionRows[0].id;

      /* 3‒ Insert parameter rows (if any) */
      if (parameters.length) {
        const paramRows = parameters.map(p => ({
          action_id:     actionId,
          name:          p.name,
          description:   p.description,
          type:          p.type,
          required:      Boolean(p.required),
          default_value: p.default ?? null,
          options:       p.options ? JSON.stringify(p.options) : null
        }));

        const { error: paramErr } = await supabase
          .from('action_center_parameters')
          .insert(paramRows);

        if (paramErr) throw paramErr;
      }

      /* 4‒ Insert chatbot mapping rows (if any) */
      if (connectedChatbots.length) {
        const mappingRows = connectedChatbots.map(cb => ({
          action_id: actionId,
          chatbot_id: cb.id
        }));

        const { error: mapErr } = await supabase
          .from('action_center_chatbots')
          .insert(mappingRows);

        if (mapErr) throw mapErr;
      }

      /* 5‒ Return full row incl. params + chatbots */
      return await this.fetchActionById(actionId);

    } catch (err) {
      return this.handleError(err);
    }
  }

  /* ──────────────────────────────────────────
     Fetch a single action by ID (with children)
     ────────────────────────────────────────── */
  async fetchActionById(id) {
    const { data: action, error } = await supabase
      .from('action_center_actions')
      .select(this.listingFields.join(', '))
      .eq('id', id)
      .maybeSingle();

    if (error) return this.handleError(error);
    if (!action) return null;

    /* attach params */
    const { data: params } = await supabase
      .from('action_center_parameters')
      .select('*')
      .eq('action_id', id);

    /* attach chatbots */
    const { data: chatbots } = await supabase
      .from('action_center_chatbots')
      .select('chatbot_id:chatbot_id, chatbots(name)')
      .eq('action_id', id);

    return {
      ...action,
      parameters: params ?? [],
      chatbots:   (chatbots ?? []).map(c => ({
        id: c.chatbot_id,
        name: c.chatbots?.name ?? ''
      }))
    };
  }

  /* ──────────────────────────────────────────
     Grid fetch for the UI
     ────────────────────────────────────────── */
  async fetchActionGrid({ workspaceId, clientId }) {
    try {
      /* Base rows */
      const { data: actions, error } = await supabase
        .from('action_center_actions')
        .select(this.listingFields.join(', '))
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!actions.length) return [];

      /* Get all IDs once for child look-ups in parallel */
      const ids = actions.map(a => a.id);

      const [{ data: params }, { data: maps }] = await Promise.all([
        supabase
          .from('action_center_parameters')
          .select('*')
          .in('action_id', ids),

        supabase
          .from('action_center_chatbots')
          .select('action_id, chatbot_id, chatbots(name)')
          .in('action_id', ids)
      ]);

      /* Group children */
      const paramByAction = _.groupBy(params, 'action_id');
      const botsByAction  = _.groupBy(maps,  'action_id');

      /* Assemble UI shape */
      return actions.map(a => ({
        id:                 a.id,
        name:               a.name,
        description:        a.description,
        method:             a.method,
        endpoint:           a.endpoint,
        createdAt:          a.created_at,
        updatedAt:          a.updated_at,
        isActive:           a.is_active,
        enabled:            a.enabled,
        parameters:         paramByAction[a.id] ?? [],
        createdBy:          { id: a.created_by },     // add join if you need name
        chatbots:           (botsByAction[a.id] ?? []).map(b => ({
                              id:   b.chatbot_id,
                              name: b.chatbots?.name ?? ''
                            })),
        folderId:           a.folder_id
      }));
    } catch (err) {
      return this.handleError(err);
    }
  }
}

module.exports = ActionCenterService;   