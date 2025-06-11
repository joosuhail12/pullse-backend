// services/CopilotProfileService.js
const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');

class CopilotProfileService extends BaseService {
  constructor() {
    super();
    this.entityName = 'copilot_profiles';
  }

  async createProfile(data) {
    try {
      let avatar_url = null;

      if (data.avatar_blob && data.avatar_mime) {
        const ext = mime.extension(data.avatar_mime);
        const filename = `avatar_${uuidv4()}.${ext}`;
        const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);

        fs.writeFileSync(filePath, data.avatar_blob);
        avatar_url = `/uploads/${filename}`;
      }

      const record = {
        name: data.name,
        persona_name: data.persona_name,
        avatar_url,
        team_id: data.team_id,
        system_actions: data.system_actions || [],
        custom_actions: data.custom_actions || [],
        content_ids: data.content_ids || [],
        client_id: data.client_id,
        workspace_id: data.workspace_id,
        created_by: data.created_by,
        teammate_id: data.teammate_id
      };

      await this.create(record);
      return { message: 'Copilot profile created successfully', avatar_url };
    } catch (err) {
      return this.handleError(err);
    }
  }

  async listProfiles(query) {
    try {
      const { data, error } = await this.supabase
        .from(this.entityName)
        .select('*')
        .eq('client_id', query.client_id);

      if (error) throw error;

      const mapped = data.map((profile) => {
        return {
          id: profile.id,
          name: profile.name,
          avatarUrl: profile.avatar_url || '',
          description: profile.persona_name,
          allowedActionIds: [...(profile.system_actions || []), ...(profile.custom_actions || [])],
          isActive: true,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          conversationsHandled: Math.floor(Math.random() * 2000),
          successRate: Number((Math.random() * 15 + 85).toFixed(1)),
          lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000).toISOString(),
          connectedContentCount: profile.content_ids?.length || 0
        };
      });

      return mapped;
    } catch (err) {
      return this.handleError(err);
    }
  }
}

module.exports = CopilotProfileService;
