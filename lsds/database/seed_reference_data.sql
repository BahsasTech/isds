-- ============================================================================
-- LEARNING AND STAFF DEVELOPMENT SYSTEM (LSDS)
-- Reference / seed data  --  Version 1.0
--
-- Run AFTER schema.sql. Safe to re-run: every insert is idempotent, and
-- existing administrator-edited values are never overwritten.
--
-- Contains: roles, approval workflow steps, content categories, system settings.
-- Contains NO user accounts -- the first System Administrator is created by the
-- PHP installer (never ship a default password in the database).
-- ============================================================================

SET NAMES utf8mb4;
USE lsds_db;

-- ----------------------------------------------------------------------------
-- 1. Roles  (Spec 4)
-- ----------------------------------------------------------------------------
INSERT INTO roles (role_key, role_name, description) VALUES
  ('sysadmin',           'System Administrator',         'Manages platform configuration, accounts, departments and system settings. Holds no approval or financial authority by default.'),
  ('staff',              'Staff Member / Applicant',     'Applies for training and conferences, uses the knowledge repository, videos, meetings and forums.'),
  ('principal_manager',  'Principal Manager',            'First designated departmental reviewer of training applications.'),
  ('agm',                'Assistant General Manager',    'Second departmental reviewer; reviews the Principal Manager recommendation.'),
  ('gm',                 'General Manager',              'Final departmental reviewer; forwards approved recommendations to Learning and Development.'),
  ('ld_officer',         'Learning and Development Officer', 'Evaluates programme relevance, eligibility and training policy compliance.'),
  ('finance_officer',    'Finance Officer',              'Reviews funding requests, records authorization and disbursements.'),
  ('auditor',            'Auditor / Management',         'Read-only oversight of applications, expenditure, attendance and audit logs.'),
  ('knowledge_manager',  'Knowledge Manager',            'Reviews and publishes documents and videos in the knowledge repository.'),
  ('support_technician', 'Support Technician',           'Handles technical support tickets and contributes knowledge base solutions.'),
  ('forum_moderator',    'Discussion Forum Moderator',   'Reviews reported discussion content and maintains forum quality.')
ON DUPLICATE KEY UPDATE
  role_name   = VALUES(role_name),
  description = VALUES(description);

-- ----------------------------------------------------------------------------
-- 2. Approval workflow definition  (Spec 8, 23.2 training_approval_steps)
-- Sequence: Principal Manager -> AGM -> GM -> L&D -> Finance -> Disbursement
-- ----------------------------------------------------------------------------
INSERT INTO training_approval_steps
  (stage_order, stage_key, stage_label, required_role_key, scope, is_mandatory, allow_delegate, is_active, description)
VALUES
  (1, 'principal_manager',     'Principal Manager Review',        'principal_manager',  'department',   1, 1, 1, 'Checks completeness, relevance to duties, costs and supporting documents.'),
  (2, 'agm',                   'Assistant General Manager Review','agm',                'department',   1, 1, 1, 'Reviews departmental training priorities and the justification.'),
  (3, 'gm',                    'General Manager Review',          'gm',                 'department',   1, 1, 1, 'Final departmental review before forwarding to Learning and Development.'),
  (4, 'learning_development',  'Learning and Development Review', 'ld_officer',         'organization', 1, 1, 1, 'Reviews objectives, eligibility, provider details and training policy.'),
  (5, 'finance_review',        'Financial Review and Authorization','finance_officer',  'organization', 1, 1, 1, 'Verifies budget, cost classification and records funding authorization.'),
  (6, 'disbursement',          'Disbursement Recording',          'finance_officer',    'organization', 1, 1, 1, 'Records payment(s) against the authorized amount.')
ON DUPLICATE KEY UPDATE
  stage_order       = VALUES(stage_order),
  stage_label       = VALUES(stage_label),
  required_role_key = VALUES(required_role_key),
  scope             = VALUES(scope),
  is_mandatory      = VALUES(is_mandatory),
  allow_delegate    = VALUES(allow_delegate),
  is_active         = VALUES(is_active),
  description       = VALUES(description);

-- ----------------------------------------------------------------------------
-- 3. Content categories  (Spec 12.2)
-- ----------------------------------------------------------------------------
INSERT INTO categories (name, slug, description, entity_type) VALUES
  ('Staff Training and Development',   'staff-training-and-development',   'Training policy, plans and staff development material.',        'any'),
  ('Networking and Infrastructure',    'networking-and-infrastructure',    'Network design, addressing, routing and infrastructure docs.',  'any'),
  ('Hardware and Maintenance',         'hardware-and-maintenance',         'Equipment manuals, maintenance procedures and asset records.',  'any'),
  ('Software and Applications',        'software-and-applications',        'Application documentation, licences and user guides.',          'any'),
  ('Information Security',             'information-security',             'Security policies, awareness material and incident procedures.','any'),
  ('System Administration',            'system-administration',            'Server, operating system and platform administration guides.', 'any'),
  ('Standard Operating Procedures',    'standard-operating-procedures',    'Approved SOPs for organisational processes.',                   'document'),
  ('Organizational Policies',          'organizational-policies',          'Formal organisational policies and circulars.',                 'document'),
  ('Training Materials',               'training-materials',               'Slides, handouts, recordings and courseware.',                  'any'),
  ('Technical Support',                'technical-support',                'Known fixes, troubleshooting articles and ticket solutions.',   'any'),
  ('Research and Reports',             'research-and-reports',             'Research papers, survey reports and technical studies.',        'document')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  entity_type = VALUES(entity_type);

-- ----------------------------------------------------------------------------
-- 4. System settings  (Spec 20, 27, 29)
-- Values inserted here are defaults only; ON DUPLICATE KEY deliberately keeps
-- whatever the administrator has already configured.
-- ----------------------------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('app_name',                        'Learning and Staff Development System', 'string', 'Application title shown in the interface.'),
  ('app_short_name',                  'LSDS',                                  'string', 'Short application name.'),
  ('timezone',                        'Africa/Lagos',                         'string', 'Default timezone for schedules and reports.'),
  ('currency',                        'NGN',                                  'string', 'Default reporting currency.'),
  ('max_upload_mb',                   '512',                                  'integer','Maximum single file upload size in megabytes.'),
  ('allowed_document_types',          'pdf,docx,xlsx,pptx,png,jpg,jpeg',      'string', 'Permitted document upload extensions.'),
  ('allowed_video_types',             'mp4,webm,mov,mkv',                     'string', 'Permitted video upload extensions.'),
  ('password_min_length',             '8',                                    'integer','Minimum password length.'),
  ('password_require_mixed_case',     '1',                                    'boolean','Require upper and lower case characters.'),
  ('password_require_number',         '1',                                    'boolean','Require at least one digit.'),
  ('session_timeout_minutes',         '120',                                  'integer','Idle session timeout in minutes.'),
  ('login_max_attempts',              '5',                                    'integer','Failed logins before temporary lockout.'),
  ('login_lockout_minutes',           '15',                                   'integer','Lockout duration in minutes.'),
  ('email_notifications_enabled',     '1',                                    'boolean','Master switch for SMTP email notifications.'),
  ('sms_notifications_enabled',       '0',                                    'boolean','Master switch for SMS notifications.'),
  ('jitsi_base_url',                  'https://meet.jitsi.si',                'string', 'Base URL of the Jitsi Meet deployment.'),
  ('ai_features_enabled',             '0',                                    'boolean','Master switch for optional AI features (Spec 21).'),
  ('training_overlap_check_enabled',  '1',                                    'boolean','Warn applicants about clashing programmes (Spec 7.3).'),
  ('reapproval_on_material_change',   '1',                                    'boolean','Re-run approvals when programme or amount changes materially (Spec 8.1).'),
  ('backup_retention_days',           '30',                                   'integer','How long completed backup records are retained.'),
  ('maintenance_mode',                '0',                                    'boolean','Puts the platform into maintenance mode.')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
