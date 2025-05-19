/* services/ContentFolderService.js (excerpt) */
const { v4: uuid }   = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const BaseService     = require('./BaseService.js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class ContentFolderService extends BaseService {
    constructor() {
        super();
        this.entityName     = 'ContentFolder';
        this.listingFields  = ['id', 'name', 'parentId', 'itemCount', 'createdAt', 'updatedAt'];
        this.updatableFields = ['name', 'parentId'];
    }
    /* …createFolder stays unchanged… */
    async createFolder({ name, parentId = null, clientId, workspaceId }) {
        const { data, error } = await supabase
        .from('folders')
      .insert({
        id: uuid(),
        name,
        parent_id: parentId,
        client_id: clientId,
        workspace_id: workspaceId,
      })
      .single();

    if (error) throw error;
    return data;                          // { id, name, … }
  }
  /* LIST WITH COUNTS — all in Node, no SQL view */
  async listFoldersWithCounts({ clientId, workspaceId }) {
    /* 1️⃣  get all folders ------------------------------------------------ */
    try {
      const { data: folders, error: errFolders } = await supabase
        .from('folders')
        .select('id,name,parent_id,created_at,updated_at')
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId);

    if (errFolders) throw errFolders;

    /* 2️⃣  get counts aggregated by folder_id ---------------------------- */
    // PostgREST:  select=folder_id,count:id&group=folder_id
    const { data: counts, error: errCounts } = await supabase
      .from('ingestion_events')
      .select('folder_id, count:id', { group: 'folder_id' })   // <- count(*) aliased as id
      .eq('client_id', clientId)
      .eq('workspace_id', workspaceId);

    if (errCounts) throw errCounts;
    // Make a quick lookup map: { folder_id → count }
    const countMap = counts.reduce((acc, r) => {
        const key = r.folder_id ?? null;          // keep null literal for “no folder”
        acc[key] = (acc[key] || 0) + 1;           // each row = one item
        return acc;
    }, {});
    /* 3️⃣  build response ------------------------------------------------- */
    const result = folders.map(f => ({
      id:         f.id,
      name:       f.name,
      parentId:   f.parent_id,
      itemCount:  countMap[f.id] ?? 0,
      createdAt:  f.created_at,
      updatedAt:  f.updated_at,
    }));
    // total across all folders (and even docs with folder_id = null,
    // because PostgREST includes a row where folder_id is null)
    const total = [...result.values()].reduce((itemCount, n) => itemCount + n, 0);

    const now = new Date().toISOString();

    return [
      {
        id: 'all',
        name: 'All Content',
        parentId: null,
        itemCount: total,
        createdAt: now,
        updatedAt: now,
      },
      ...result,
      ];
    } catch (error) {
      console.error('Error in listFoldersWithCounts:', error);
      throw error;
    }
  }
}

module.exports = ContentFolderService;
