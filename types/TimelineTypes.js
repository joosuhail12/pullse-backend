/**
 * @fileoverview Timeline Data Structure Interfaces
 * Comprehensive type definitions for timeline entries including database fields and enhanced frontend data
 */

/**
 * @typedef {Object} TimelineEntry
 * @description Complete timeline entry structure with all database and enhanced frontend fields
 * 
 * // =============================================================================
 * // DATABASE FIELDS (Raw timeline table data)
 * // =============================================================================
 * @property {string} id - UUID primary key
 * @property {string} entity_type - Type of entity ('contact', 'company', 'ticket')
 * @property {string} entity_id - UUID of the related entity
 * @property {string} activity_type - Type of activity ('email', 'ticket', 'note', 'call', 'meeting', 'contact_update', 'company_update', 'system')
 * @property {string} [activity_subtype] - Subtype of activity (e.g., 'sent', 'received', 'created', 'updated', 'closed')
 * @property {string} title - Activity title
 * @property {string} [description] - Detailed description
 * @property {string} [summary] - Brief one-line summary for timeline display
 * @property {string} [related_ticket_id] - UUID of related ticket
 * @property {string} [related_email_id] - UUID of related email/conversation
 * @property {string} [related_note_id] - UUID of related note
 * @property {string} [related_call_id] - UUID of related call
 * @property {string} [related_meeting_id] - UUID of related meeting
 * @property {string} [related_conversation_id] - UUID of related conversation
 * @property {string} [field_changed] - Name of field that was changed
 * @property {Object} [old_value] - JSONB data of old values
 * @property {Object} [new_value] - JSONB data of new values
 * @property {string} [changes_summary] - Human readable summary of changes
 * @property {string} [actor_id] - UUID of user who performed the action
 * @property {string} [actor_name] - Name of the actor
 * @property {string} [actor_type] - Type of actor ('user', 'customer', 'system', 'automation')
 * @property {string} [actor_email] - Email of the actor
 * @property {string} workspace_id - UUID of workspace
 * @property {string} client_id - UUID of client
 * @property {string} [source] - Source of activity ('web', 'mobile', 'api', 'email', 'phone', 'chat', 'system', 'automation')
 * @property {string} [priority] - Priority level ('low', 'normal', 'high', 'urgent')
 * @property {boolean} [is_internal] - Whether activity is internal
 * @property {number} [response_time_minutes] - Response time in minutes
 * @property {string} activity_date - ISO timestamp when activity occurred
 * @property {string} created_at - ISO timestamp when timeline entry was created
 * @property {string} [deleted_at] - ISO timestamp when entry was soft deleted
 * 
 * // =============================================================================
 * // ENHANCED FRONTEND FIELDS (Added by enrichTimelineDataForFrontend)
 * // =============================================================================
 * @property {string} [original_activity_type] - Original activity type before database mapping
 * @property {ActorInfo} actor - Enhanced actor information
 * @property {TicketInfo} [related_ticket] - Enhanced ticket information
 * @property {EmailInfo} [related_email] - Enhanced email information
 * @property {TicketInfo} [contact_ticket] - Ticket data for contact timeline entries
 * @property {ChangesDetail} [changes_detail] - Formatted change information
 * @property {string} formatted_date - Human-readable date format
 * @property {string} time_ago - Relative time display
 * @property {string} date_group - Date grouping for UI ('Today', 'Yesterday', 'This Week', etc.)
 * @property {string} activity_category - Activity category for grouping ('Communication', 'Support', 'Internal', etc.)
 * @property {string} activity_icon - Icon name for UI display
 * @property {string} activity_color - Color theme for activity type
 * @property {string} display_title - Formatted title for display
 * @property {string} display_summary - Formatted summary for display
 * @property {string} [display_description] - Formatted description for display
 * @property {boolean} can_edit - Whether entry can be edited
 * @property {boolean} can_delete - Whether entry can be deleted
 * @property {string} importance_level - Importance level ('low', 'medium', 'high')
 * @property {EntityContext} entity_context - Context information about the entity
 */

/**
 * @typedef {Object} ActorInfo
 * @description Enhanced actor information
 * @property {string|null} id - Actor UUID
 * @property {string} type - Actor type ('user', 'customer', 'system', 'automation')
 * @property {string} name - Actor name
 * @property {string|null} email - Actor email
 * @property {string} display_name - Formatted display name
 * @property {string} initials - Actor initials for avatar
 * @property {string|null} avatar_url - Avatar image URL
 * @property {boolean} is_system - Whether actor is system-generated
 * @property {string} [role] - Actor role
 * @property {string} [status] - Actor status
 */

/**
 * @typedef {Object} TicketInfo
 * @description Enhanced ticket information
 * @property {string} id - Ticket UUID
 * @property {number} sno - Ticket serial number
 * @property {string} title - Ticket title
 * @property {string} status - Ticket status
 * @property {string} priority - Ticket priority
 * @property {string} [description] - Ticket description
 * @property {string} [channel] - Communication channel
 * @property {string} customerId - Customer UUID
 * @property {string} [assignedTo] - Assigned user UUID
 * @property {string} [assigneeId] - Assignee UUID
 * @property {string} [teamId] - Team UUID
 * @property {string} [typeId] - Ticket type UUID
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Update timestamp
 * @property {string} [closedAt] - Closure timestamp
 * @property {string} [lastMessageAt] - Last message timestamp
 * @property {TeamInfo} [teams] - Team information
 * @property {TicketType} [ticketTypes] - Ticket type information
 * @property {UserInfo} [assignee] - Assignee information
 * @property {string} url - URL to ticket details
 * @property {string} display_id - Formatted ticket ID (#123)
 * @property {string} status_color - Color for status display
 * @property {string} priority_color - Color for priority display
 */

/**
 * @typedef {Object} EmailInfo
 * @description Enhanced email/conversation information
 * @property {string} id - Email UUID
 * @property {string} [subject] - Email subject
 * @property {string} [message] - Email content
 * @property {string} type - Message type
 * @property {string} [direction] - Email direction ('sent', 'received')
 * @property {string} [messageType] - Message type
 * @property {string} createdAt - Creation timestamp
 * @property {string} [fromEmail] - Sender email
 * @property {string} [toEmail] - Recipient email
 * @property {string} [ccEmail] - CC emails
 * @property {string} [bccEmail] - BCC emails
 * @property {Array} [attachments] - Email attachments
 * @property {boolean} [isRead] - Read status
 * @property {string} customerId - Customer UUID
 * @property {string} preview - Message preview text
 * @property {string} url - URL to conversation
 * @property {string} direction_icon - Icon for direction display
 */

/**
 * @typedef {Object} ChangesDetail
 * @description Detailed change information for updates
 * @property {Array<FieldChange>} [fields_updated] - Array of field changes
 * @property {number} total_changes - Total number of changes
 * @property {string} change_type - Type of change ('update', 'tags', 'sentiment')
 * @property {string} summary - Summary of changes
 * @property {*} [raw_old] - Raw old value (fallback)
 * @property {*} [raw_new] - Raw new value (fallback)
 */

/**
 * @typedef {Object} FieldChange
 * @description Individual field change information
 * @property {string} field_name - Name of changed field
 * @property {string} field_type - Type of field ('simple', 'complex', 'tags', 'sentiment', 'url')
 * @property {*} old_value - Original value
 * @property {*} new_value - New value
 * @property {boolean} changed - Whether field actually changed
 * @property {string} description - Human-readable description
 * @property {string} display_text - Formatted display text
 * @property {string} formatted_old - Formatted old value for display
 * @property {string} formatted_new - Formatted new value for display
 * @property {string} change_type - Type of change ('added', 'removed', 'modified')
 */

/**
 * @typedef {Object} EntityContext
 * @description Context information about the entity
 * @property {string} entityType - Type of entity ('contact', 'company')
 * @property {string} entityId - UUID of entity
 * @property {string} workspaceId - UUID of workspace
 * @property {string} clientId - UUID of client
 */

/**
 * @typedef {Object} TeamInfo
 * @description Team information
 * @property {string} id - Team UUID
 * @property {string} name - Team name
 */

/**
 * @typedef {Object} TicketType
 * @description Ticket type information
 * @property {string} id - Type UUID
 * @property {string} name - Type name
 */

/**
 * @typedef {Object} UserInfo
 * @description User information
 * @property {string} id - User UUID
 * @property {string} name - User name
 * @property {string} email - User email
 */

/**
 * @typedef {Object} TimelineResponse
 * @description Complete API response structure for timeline endpoints
 * @property {boolean} success - Success status
 * @property {TimelineResponseData} data - Response data
 */

/**
 * @typedef {Object} TimelineResponseData
 * @description Timeline response data structure
 * @property {Array<TimelineEntry>} timeline - Array of timeline entries
 * @property {Array<TimelineGroup>} grouped_timeline - Timeline entries grouped by date
 * @property {EntityInfo} entity - Entity information
 * @property {PaginationInfo} pagination - Pagination information
 * @property {FilterInfo} filters - Filter information
 * @property {TimelineStats} stats - Timeline statistics
 * @property {ResponseMetadata} metadata - Response metadata
 */

/**
 * @typedef {Object} TimelineGroup
 * @description Timeline entries grouped by date
 * @property {string} label - Group label ('Today', 'Yesterday', etc.)
 * @property {Array<TimelineEntry>} entries - Timeline entries in this group
 */

/**
 * @typedef {Object} EntityInfo
 * @description Basic entity information
 * @property {string} type - Entity type ('contact', 'company')
 * @property {string} id - Entity UUID
 */

/**
 * @typedef {Object} PaginationInfo
 * @description Pagination information
 * @property {number} limit - Items per page
 * @property {number} offset - Current offset
 * @property {boolean} has_more - Whether more items exist
 * @property {number} total_returned - Number of items returned
 * @property {number|null} next_offset - Next page offset
 */

/**
 * @typedef {Object} FilterInfo
 * @description Filter information
 * @property {AppliedFilters} applied - Currently applied filters
 * @property {AvailableFilters} available - Available filter options
 */

/**
 * @typedef {Object} AppliedFilters
 * @description Currently applied filters
 * @property {string} activity_type - Applied activity type filter
 * @property {DateRange} date_range - Applied date range
 * @property {boolean} exclude_internal - Whether internal activities are excluded
 */

/**
 * @typedef {Object} AvailableFilters
 * @description Available filter options
 * @property {Array<ActivityTypeOption>} activity_types - Available activity types
 * @property {Array<DateRangeOption>} date_ranges - Available date ranges
 */

/**
 * @typedef {Object} ActivityTypeOption
 * @description Activity type filter option
 * @property {string} value - Activity type value
 * @property {string} label - Display label
 * @property {number} count - Number of activities of this type
 * @property {string} [icon] - Icon name
 */

/**
 * @typedef {Object} DateRangeOption
 * @description Date range filter option
 * @property {string} label - Display label
 * @property {string} value - Range value
 * @property {string|null} from - Start date
 * @property {string|null} to - End date
 */

/**
 * @typedef {Object} DateRange
 * @description Date range
 * @property {string|null} from - Start date
 * @property {string|null} to - End date
 */

/**
 * @typedef {Object} TimelineStats
 * @description Timeline statistics
 * @property {number} total_interactions - Total number of interactions
 * @property {number} avg_response_time_minutes - Average response time
 * @property {ActivityCounts} activity_counts - Count by activity type
 * @property {string} most_frequent_activity - Most frequent activity type
 */

/**
 * @typedef {Object} ActivityCounts
 * @description Activity counts by type
 * @property {number} email - Email count
 * @property {number} ticket - Ticket count
 * @property {number} note - Note count
 * @property {number} call - Call count
 * @property {number} meeting - Meeting count
 * @property {number} company_update - Company update count
 * @property {number} contact_update - Contact update count
 * @property {number} sentiment_update - Sentiment update count
 * @property {number} tag_update - Tag update count
 */

/**
 * @typedef {Object} ResponseMetadata
 * @description Response metadata
 * @property {string} last_updated - Last update timestamp
 * @property {UserContext} user_context - User permissions and context
 */

/**
 * @typedef {Object} UserContext
 * @description User context and permissions
 * @property {boolean} can_add_notes - Whether user can add notes
 * @property {boolean} can_edit_entries - Whether user can edit entries
 * @property {boolean} can_delete_entries - Whether user can delete entries
 */

module.exports = {
    // Export all types for JSDoc reference
    // These are used for documentation and IDE support
}; 