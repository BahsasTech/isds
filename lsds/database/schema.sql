-- ============================================================================
-- LEARNING AND STAFF DEVELOPMENT SYSTEM (LSDS)
-- MySQL / MariaDB Schema  --  Version 1.0
-- Stack: HTML5/CSS3/JavaScript frontend, PHP (PDO) backend, MySQL database
--
-- Conventions
--   Engine        : InnoDB (transactions, foreign keys)
--   Charset       : utf8mb4 / utf8mb4_unicode_ci
--   PKs           : id INT UNSIGNED AUTO_INCREMENT unless noted
--   Timestamps    : created_at / updated_at maintained by server defaults
--   Money         : DECIMAL(14,2); currency stored as ISO code (default NGN)
--   PN / Oracle   : VARCHAR (text) to preserve leading zeros  (Spec 5)
--   Soft delete   : never used for audit-relevant rows; status ENUM instead
--
-- Run order: schema.sql first, then seed_reference_data.sql
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- Change the database name here if your installation uses a different one.
CREATE DATABASE IF NOT EXISTS lsds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lsds_db;

-- NOTE: Tables are created with IF NOT EXISTS, so re-running this file is a
-- no-op. For a clean rebuild first run:  DROP DATABASE lsds_db;

-- ----------------------------------------------------------------------------
-- SECTION A -- USERS, ROLES, DEPARTMENTS  (Spec 4, 5, 6, 23.1)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username                VARCHAR(100) NOT NULL,
  email                   VARCHAR(190) NOT NULL COMMENT 'Organisational email; also the login identifier',
  password_hash           VARCHAR(255) NOT NULL COMMENT 'password_hash() output',
  account_status          ENUM('active','suspended','deactivated') NOT NULL DEFAULT 'active',
  must_change_password    TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until            DATETIME NULL,
  last_login_at           DATETIME NULL,
  last_login_ip           VARCHAR(45) NULL,
  password_changed_at     DATETIME NULL,
  created_by              INT UNSIGNED NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (account_status),
  CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_key    VARCHAR(40) NOT NULL COMMENT 'Machine name, e.g. principal_manager',
  role_name   VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  parent_id   INT UNSIGNED NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_by  INT UNSIGNED NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code),
  UNIQUE KEY uq_departments_name (name),
  KEY idx_departments_parent (parent_id),
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  role_id      INT UNSIGNED NOT NULL,
  department_id INT UNSIGNED NULL COMMENT 'NULL = role applies across all departments',
  -- Generated key so UNIQUE still works when department_id is NULL (NULLs never conflict)
  dept_key     INT UNSIGNED GENERATED ALWAYS AS (
                 CASE WHEN department_id IS NULL THEN 0 ELSE department_id END) STORED,
  assigned_by  INT UNSIGNED NULL,
  assigned_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles (user_id, role_id, dept_key),
  KEY idx_user_roles_role (role_id),
  KEY idx_user_roles_dept (department_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verified personnel record: PN, Oracle Number, designation  (Spec 5)
-- Login email, role and account status are NOT duplicated here -- they live in
-- users / user_roles. Only authorised admins or HR may amend this table.
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED NOT NULL,
  full_name           VARCHAR(150) NOT NULL,
  pn                  VARCHAR(50) NULL COMMENT 'Personnel Number -- stored as text to keep leading zeros',
  oracle_number       VARCHAR(50) NULL COMMENT 'Oracle Number -- stored as text to keep leading zeros',
  phone               VARCHAR(30) NULL,
  department_id       INT UNSIGNED NULL,
  designation         VARCHAR(120) NULL,
  grade_level         VARCHAR(20) NULL,
  supervisor_user_id  INT UNSIGNED NULL,
  verified_by         INT UNSIGNED NULL,
  verified_at         DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_profiles_user (user_id),
  UNIQUE KEY uq_staff_profiles_pn (pn),
  UNIQUE KEY uq_staff_profiles_oracle (oracle_number),
  KEY idx_staff_profiles_dept (department_id),
  KEY idx_staff_profiles_supervisor (supervisor_user_id),
  CONSTRAINT fk_staff_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_profiles_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_profiles_supervisor FOREIGN KEY (supervisor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_profiles_verified_by FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One active designated officer per position per department  (Spec 6)
-- active_slot is generated so the UNIQUE key enforces "one ACTIVE account"
-- while still allowing any number of historical/inactive rows.
CREATE TABLE IF NOT EXISTS department_approvers (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id  INT UNSIGNED NOT NULL,
  position       ENUM('principal_manager','agm','gm') NOT NULL,
  user_id        INT UNSIGNED NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  active_slot    TINYINT UNSIGNED GENERATED ALWAYS AS (
                   CASE WHEN is_active = 1 THEN 1 ELSE NULL END) STORED,
  start_date     DATE NULL,
  end_date       DATE NULL,
  notes          VARCHAR(255) NULL,
  assigned_by    INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_approver_active (department_id, position, active_slot),
  KEY idx_dept_approvers_user (user_id),
  CONSTRAINT fk_dept_approvers_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_approvers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_dept_approvers_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Authorised temporary delegation of approval authority  (Spec 8.1)
CREATE TABLE IF NOT EXISTS delegation_records (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegator_user_id  INT UNSIGNED NOT NULL,
  delegate_user_id   INT UNSIGNED NOT NULL,
  department_id      INT UNSIGNED NULL,
  position           ENUM('principal_manager','agm','gm','learning_development','finance') NOT NULL,
  start_at           DATETIME NOT NULL,
  end_at             DATETIME NOT NULL,
  reason             VARCHAR(500) NULL,
  status             ENUM('pending','active','revoked','expired') NOT NULL DEFAULT 'pending',
  approved_by        INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delegation_delegator (delegator_user_id, status),
  KEY idx_delegation_delegate (delegate_user_id, status),
  KEY idx_delegation_dept (department_id),
  CONSTRAINT fk_delegation_delegator FOREIGN KEY (delegator_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_delegation_delegate FOREIGN KEY (delegate_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_delegation_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_delegation_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_delegation_window CHECK (end_at > start_at),
  CONSTRAINT chk_delegation_distinct CHECK (delegator_user_id <> delegate_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION B -- TRAINING APPLICATIONS AND APPROVAL WORKFLOW  (Spec 7, 8, 23.2)
-- ----------------------------------------------------------------------------

-- Configurable workflow definition (Spec 8, Spec 25 "Approval Workflow Configuration")
CREATE TABLE IF NOT EXISTS training_approval_steps (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  stage_order       SMALLINT UNSIGNED NOT NULL,
  stage_key         VARCHAR(40) NOT NULL,
  stage_label       VARCHAR(100) NOT NULL,
  required_role_key VARCHAR(40) NOT NULL COMMENT 'Must match roles.role_key',
  scope             ENUM('department','organization') NOT NULL DEFAULT 'department',
  is_mandatory      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 allows policy-based exception skipping',
  allow_delegate    TINYINT(1) NOT NULL DEFAULT 1,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  description       VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_approval_steps_key (stage_key),
  UNIQUE KEY uq_approval_steps_order (stage_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_applications (
  id                             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_no                   VARCHAR(40) NULL COMMENT 'Unique reference assigned on first submission',
  applicant_user_id              INT UNSIGNED NOT NULL,
  department_id                  INT UNSIGNED NOT NULL,
  supervisor_user_id             INT UNSIGNED NULL,
  application_type               ENUM('national_training','international_training','national_conference',
                                     'international_conference','professional_workshop','technical_seminar',
                                     'professional_certification','academic_conference','other') NOT NULL,
  scope                          ENUM('national','international') NOT NULL DEFAULT 'national',
  -- Programme information (Spec 7.2 B)
  programme_title                VARCHAR(255) NOT NULL,
  training_provider              VARCHAR(190) NULL,
  country                        VARCHAR(80) NULL,
  venue                          VARCHAR(190) NULL,
  programme_website              VARCHAR(255) NULL,
  start_date                     DATE NULL,
  end_date                       DATE NULL,
  registration_deadline          DATE NULL,
  programme_objectives           TEXT NULL,
  skills_to_acquire              TEXT NULL,
  relevance_to_duties            TEXT NULL,
  departmental_benefits          TEXT NULL,
  -- Financial information (Spec 7.2 C)
  estimated_total_cost           DECIMAL(14,2) NULL,
  requested_amount               DECIMAL(14,2) NULL,
  currency                       VARCHAR(10) NOT NULL DEFAULT 'NGN',
  funding_justification          TEXT NULL,
  -- Post-training commitment (Spec 7.2 E)
  post_training_knowledge_sharing TEXT NULL,
  post_training_report_plan      TEXT NULL,
  expected_organizational_benefits TEXT NULL,
  -- Workflow state (Spec 8, 9)
  status                         ENUM('draft','submitted','pending_principal_manager','pending_agm','pending_gm',
                                      'pending_learning_development','returned_for_correction','rejected',
                                      'pending_financial_review','financially_approved','pending_disbursement',
                                      'partially_disbursed','disbursed','completed','cancelled')
                                     NOT NULL DEFAULT 'draft',
  current_stage_order            SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  current_stage_key              VARCHAR(40) NULL,
  pending_reviewer_user_id       INT UNSIGNED NULL,
  submission_count               SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  submitted_at                   DATETIME NULL,
  decided_at                     DATETIME NULL,
  cancelled_at                   DATETIME NULL,
  cancel_reason                  VARCHAR(500) NULL,
  created_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_app_reference (reference_no),
  KEY idx_training_applicant (applicant_user_id),
  KEY idx_training_dept_status (department_id, status),
  KEY idx_training_pending_reviewer (pending_reviewer_user_id),
  KEY idx_training_stage (current_stage_order),
  KEY idx_training_dates (start_date, end_date),
  CONSTRAINT fk_training_applicant FOREIGN KEY (applicant_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_training_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_training_supervisor FOREIGN KEY (supervisor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_training_pending_reviewer FOREIGN KEY (pending_reviewer_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_training_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_training_estimated_cost CHECK (estimated_total_cost IS NULL OR estimated_total_cost >= 0),
  CONSTRAINT chk_training_requested_amount CHECK (requested_amount IS NULL OR requested_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_application_documents (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id    INT UNSIGNED NOT NULL,
  doc_type          ENUM('invitation_letter','programme_brochure','training_agenda','provider_quotation',
                         'cost_breakdown','relevant_approval','other') NOT NULL,
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name  VARCHAR(255) NOT NULL COMMENT 'Randomised name on protected storage',
  file_path         VARCHAR(500) NOT NULL,
  mime_type         VARCHAR(100) NULL,
  file_size_bytes   BIGINT UNSIGNED NULL,
  uploaded_by       INT UNSIGNED NULL,
  scan_status       ENUM('pending','clean','infected','skipped') NOT NULL DEFAULT 'pending',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app_doc_stored_name (stored_file_name),
  KEY idx_app_docs_application (application_id),
  CONSTRAINT fk_app_docs_application FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_app_docs_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_cost_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id INT UNSIGNED NOT NULL,
  item_type      ENUM('registration_tuition','transportation','accommodation','daily_allowance','other') NOT NULL,
  description    VARCHAR(255) NULL,
  amount         DECIMAL(14,2) NOT NULL,
  currency       VARCHAR(10) NOT NULL DEFAULT 'NGN',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cost_items_application (application_id),
  CONSTRAINT fk_cost_items_application FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE CASCADE,
  CONSTRAINT chk_cost_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Immutable audit trail of every approval decision  (Spec 8.1)
-- Resubmissions append rows; earlier history is never overwritten.
CREATE TABLE IF NOT EXISTS training_approval_actions (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id          INT UNSIGNED NOT NULL,
  step_id                 INT UNSIGNED NULL,
  stage_key               VARCHAR(40) NOT NULL,
  reviewer_user_id        INT UNSIGNED NOT NULL,
  reviewer_role_key       VARCHAR(40) NOT NULL,
  decision                ENUM('submitted','resubmitted','approved','rejected','returned','forwarded',
                               'cancelled','delegated') NOT NULL,
  comments                TEXT NULL,
  is_visible_to_applicant TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = internal/finance-confidential note',
  delegated_from_user_id  INT UNSIGNED NULL,
  ip_address              VARCHAR(45) NULL,
  acted_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approval_actions_application (application_id, acted_at),
  KEY idx_approval_actions_reviewer (reviewer_user_id),
  KEY idx_approval_actions_stage (stage_key),
  CONSTRAINT fk_approval_actions_application FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_actions_step FOREIGN KEY (step_id) REFERENCES training_approval_steps (id) ON DELETE SET NULL,
  CONSTRAINT fk_approval_actions_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_approval_actions_delegated FOREIGN KEY (delegated_from_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION C -- KNOWLEDGE SHARING SESSIONS  (Spec 11, 23.3)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge_sharing_sessions (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title                    VARCHAR(255) NOT NULL,
  description              TEXT NULL,
  topic                    VARCHAR(190) NULL,
  session_date             DATE NULL,
  start_time               TIME NULL,
  end_time                 TIME NULL,
  venue                    VARCHAR(190) NULL,
  online_meeting_url       VARCHAR(500) NULL,
  presenter_name           VARCHAR(150) NULL,
  presenter_user_id        INT UNSIGNED NULL,
  organizing_department_id INT UNSIGNED NULL,
  target_audience          VARCHAR(255) NULL,
  registration_deadline    DATE NULL,
  max_attendance           SMALLINT UNSIGNED NULL,
  status                   ENUM('draft','published','postponed','cancelled','completed') NOT NULL DEFAULT 'draft',
  postponed_from_date      DATE NULL,
  cancellation_reason      VARCHAR(500) NULL,
  created_by               INT UNSIGNED NULL,
  published_at             DATETIME NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_date (session_date),
  KEY idx_sessions_status (status),
  KEY idx_sessions_dept (organizing_department_id),
  KEY idx_sessions_presenter (presenter_user_id),
  CONSTRAINT fk_sessions_presenter FOREIGN KEY (presenter_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sessions_dept FOREIGN KEY (organizing_department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_sessions_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_sessions_time CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_registrations (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id        INT UNSIGNED NOT NULL,
  user_id           INT UNSIGNED NOT NULL,
  status            ENUM('registered','waitlisted','cancelled','attended') NOT NULL DEFAULT 'registered',
  registered_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at      DATETIME NULL,
  reminder_sent_at  DATETIME NULL,
  reminder_count    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_registration (session_id, user_id),
  KEY idx_session_reg_user (user_id),
  CONSTRAINT fk_session_reg_session FOREIGN KEY (session_id) REFERENCES knowledge_sharing_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_reg_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_attendance (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id       INT UNSIGNED NOT NULL,
  user_id          INT UNSIGNED NOT NULL,
  check_in_at      DATETIME NULL,
  check_out_at     DATETIME NULL,
  attendance_status ENUM('present','late','absent','excused') NOT NULL DEFAULT 'present',
  recorded_by      INT UNSIGNED NULL,
  notes            VARCHAR(500) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_attendance (session_id, user_id),
  KEY idx_session_att_user (user_id),
  CONSTRAINT fk_session_att_session FOREIGN KEY (session_id) REFERENCES knowledge_sharing_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_att_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_att_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_feedback (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  rating       TINYINT UNSIGNED NULL,
  comments     TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_feedback (session_id, user_id),
  CONSTRAINT fk_session_feedback_session FOREIGN KEY (session_id) REFERENCES knowledge_sharing_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_feedback_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_session_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION D -- KNOWLEDGE REPOSITORY: DOCUMENTS AND VIDEOS  (Spec 12, 13, 14)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  entity_type ENUM('document','video','course','session','any') NOT NULL DEFAULT 'any',
  parent_id   INT UNSIGNED NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title                    VARCHAR(255) NOT NULL,
  description              TEXT NULL,
  category_id              INT UNSIGNED NULL,
  department_id            INT UNSIGNED NULL,
  owner_user_id            INT UNSIGNED NOT NULL,
  file_name                VARCHAR(255) NOT NULL,
  stored_file_name         VARCHAR(255) NOT NULL,
  file_path                VARCHAR(500) NOT NULL,
  mime_type                VARCHAR(100) NULL,
  file_size_bytes          BIGINT UNSIGNED NULL,
  current_version_no       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  access_classification    ENUM('internal','restricted','confidential') NOT NULL DEFAULT 'internal',
  review_status            ENUM('draft','submitted_for_review','under_review','returned','approved',
                                'published','archived','superseded') NOT NULL DEFAULT 'draft',
  review_comments          TEXT NULL,
  reviewed_by              INT UNSIGNED NULL,
  reviewed_at              DATETIME NULL,
  submitted_at             DATETIME NULL,
  published_at             DATETIME NULL,
  review_due_date          DATE NULL,
  expiry_date              DATE NULL,
  superseded_by_document_id INT UNSIGNED NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_documents_stored_name (stored_file_name),
  KEY idx_documents_category (category_id),
  KEY idx_documents_dept (department_id),
  KEY idx_documents_owner (owner_user_id),
  KEY idx_documents_status (review_status),
  KEY idx_documents_access (access_classification),
  CONSTRAINT fk_documents_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_documents_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_documents_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_documents_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_documents_superseded_by FOREIGN KEY (superseded_by_document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revision history; obsolete content is archived/superseded, never silently replaced  (Spec 12.4)
CREATE TABLE IF NOT EXISTS document_versions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id     INT UNSIGNED NOT NULL,
  version_no      SMALLINT UNSIGNED NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,
  mime_type       VARCHAR(100) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  change_summary  TEXT NULL,
  author_user_id  INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_version (document_id, version_no),
  KEY idx_document_versions_author (author_user_id),
  CONSTRAINT fk_document_versions_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_document_versions_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_tags (
  document_id INT UNSIGNED NOT NULL,
  tag_id      INT UNSIGNED NOT NULL,
  PRIMARY KEY (document_id, tag_id),
  KEY idx_document_tags_tag (tag_id),
  CONSTRAINT fk_document_tags_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_document_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS videos (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT NULL,
  category_id           INT UNSIGNED NULL,
  department_id         INT UNSIGNED NULL,
  uploaded_by           INT UNSIGNED NOT NULL,
  language              VARCHAR(30) NOT NULL DEFAULT 'English',
  thumbnail_path        VARCHAR(500) NULL,
  file_name             VARCHAR(255) NULL,
  stored_file_name      VARCHAR(255) NOT NULL,
  file_path             VARCHAR(500) NULL COMMENT 'Path to the playback-ready (HLS/MP4) rendition',
  mime_type             VARCHAR(100) NULL,
  duration_seconds      INT UNSIGNED NULL,
  file_size_bytes       BIGINT UNSIGNED NULL,
  captions_path         VARCHAR(500) NULL,
  transcript            MEDIUMTEXT NULL,
  upload_status         ENUM('uploading','processing','ready','failed') NOT NULL DEFAULT 'uploading',
  processing_message    VARCHAR(500) NULL,
  review_status         ENUM('draft','pending_review','under_review','returned','approved','published',
                             'rejected','archived') NOT NULL DEFAULT 'draft',
  access_classification ENUM('internal','restricted','confidential') NOT NULL DEFAULT 'internal',
  review_comments       TEXT NULL,
  reviewed_by           INT UNSIGNED NULL,
  reviewed_at           DATETIME NULL,
  views_count           INT UNSIGNED NOT NULL DEFAULT 0,
  published_at          DATETIME NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_videos_stored_name (stored_file_name),
  KEY idx_videos_category (category_id),
  KEY idx_videos_dept (department_id),
  KEY idx_videos_uploader (uploaded_by),
  KEY idx_videos_status (upload_status, review_status),
  CONSTRAINT fk_videos_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_videos_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_videos_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_videos_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS video_tags (
  video_id INT UNSIGNED NOT NULL,
  tag_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (video_id, tag_id),
  KEY idx_video_tags_tag (tag_id),
  CONSTRAINT fk_video_tags_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
  CONSTRAINT fk_video_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user playback state: Continue Watching / resume / completed  (Spec 13.3, 14)
CREATE TABLE IF NOT EXISTS video_progress (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED NOT NULL,
  video_id            INT UNSIGNED NOT NULL,
  position_seconds    INT UNSIGNED NOT NULL DEFAULT 0,
  duration_seconds    INT UNSIGNED NULL,
  percent_watched     DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_watch_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  is_completed        TINYINT(1) NOT NULL DEFAULT 0,
  completed_at        DATETIME NULL,
  first_watched_at    DATETIME NULL,
  last_watched_at     DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_video_progress (user_id, video_id),
  KEY idx_video_progress_last (last_watched_at),
  CONSTRAINT fk_video_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_video_progress_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
  CONSTRAINT chk_video_progress_percent CHECK (percent_watched BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Watch Later is a personal list; removal never deletes the shared video  (Spec 14)
CREATE TABLE IF NOT EXISTS watch_later (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id   INT UNSIGNED NOT NULL,
  video_id  INT UNSIGNED NOT NULL,
  added_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_watch_later (user_id, video_id),
  KEY idx_watch_later_added (added_at),
  CONSTRAINT fk_watch_later_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_watch_later_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlists (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id  INT UNSIGNED NULL COMMENT 'NULL = organisational playlist',
  title          VARCHAR(150) NOT NULL,
  description    VARCHAR(500) NULL,
  visibility     ENUM('private','department','public') NOT NULL DEFAULT 'private',
  department_id  INT UNSIGNED NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_playlists_owner (owner_user_id),
  KEY idx_playlists_dept (department_id),
  CONSTRAINT fk_playlists_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_playlists_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlist_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  playlist_id INT UNSIGNED NOT NULL,
  video_id    INT UNSIGNED NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_playlist_video (playlist_id, video_id),
  KEY idx_playlist_items_video (video_id),
  CONSTRAINT fk_playlist_items_playlist FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE,
  CONSTRAINT fk_playlist_items_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shared review records for documents AND videos  (Spec 12.3, 13.4)
-- Polymorphic on purpose (one table, two content types), so no DB-level FK to
-- documents/videos; application layer must validate the target row exists.
CREATE TABLE IF NOT EXISTS reviews (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reviewable_type  ENUM('document','video','session') NOT NULL,
  reviewable_id    INT UNSIGNED NOT NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  decision         ENUM('pending','approved','rejected','returned') NOT NULL DEFAULT 'pending',
  comments         TEXT NULL,
  reviewed_at      DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_target (reviewable_type, reviewable_id),
  KEY idx_reviews_reviewer (reviewer_user_id),
  CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Slides, documents and recordings attached to a Knowledge Sharing Session  (Spec 11.2)
-- Placed after documents/videos because it references both.
CREATE TABLE IF NOT EXISTS session_materials (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id   INT UNSIGNED NOT NULL,
  material_type ENUM('document','video','link','other') NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  VARCHAR(500) NULL,
  document_id  INT UNSIGNED NULL,
  video_id     INT UNSIGNED NULL,
  external_url VARCHAR(500) NULL,
  file_path    VARCHAR(500) NULL,
  visibility   ENUM('registered_only','all_staff') NOT NULL DEFAULT 'registered_only',
  uploaded_by  INT UNSIGNED NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_session_materials_session (session_id),
  KEY idx_session_materials_document (document_id),
  KEY idx_session_materials_video (video_id),
  CONSTRAINT fk_session_materials_session FOREIGN KEY (session_id) REFERENCES knowledge_sharing_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_session_materials_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL,
  CONSTRAINT fk_session_materials_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE SET NULL,
  CONSTRAINT fk_session_materials_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION E -- FINANCE AND DISBURSEMENT  (Spec 10, 23.2)
-- Training approval, financial authorisation and disbursement are separate.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS training_financial_records (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id      INT UNSIGNED NOT NULL,
  approved_title      VARCHAR(255) NOT NULL COMMENT 'Programme title as approved by L&D',
  approved_amount     DECIMAL(14,2) NOT NULL,
  currency            VARCHAR(10) NOT NULL DEFAULT 'NGN',
  cost_centre         VARCHAR(60) NULL,
  budget_reference    VARCHAR(60) NULL,
  financial_status    ENUM('pending_review','authorized','rejected','partially_disbursed',
                           'disbursed','cancelled') NOT NULL DEFAULT 'pending_review',
  authorized_at       DATETIME NULL,
  authorized_by       INT UNSIGNED NULL,
  rejected_reason     VARCHAR(500) NULL,
  notes               TEXT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_financial_application (application_id),
  KEY idx_financial_status (financial_status),
  KEY idx_financial_authorizer (authorized_by),
  CONSTRAINT fk_financial_application FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE RESTRICT,
  CONSTRAINT fk_financial_authorizer FOREIGN KEY (authorized_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_financial_amount CHECK (approved_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partial disbursements supported; total released is derived from these rows.
CREATE TABLE IF NOT EXISTS training_disbursements (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  financial_record_id INT UNSIGNED NOT NULL,
  application_id      INT UNSIGNED NOT NULL,
  payment_reference   VARCHAR(100) NULL,
  amount              DECIMAL(14,2) NOT NULL,
  payment_date        DATE NULL,
  payment_method      ENUM('bank_transfer','cash','cheque','other') NOT NULL DEFAULT 'bank_transfer',
  evidence_file_path  VARCHAR(500) NULL,
  status              ENUM('pending','completed','failed','reversed') NOT NULL DEFAULT 'completed',
  notes               VARCHAR(500) NULL,
  recorded_by         INT UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_disbursement_record (financial_record_id),
  KEY idx_disbursement_application (application_id),
  KEY idx_disbursement_date (payment_date),
  CONSTRAINT fk_disbursement_record FOREIGN KEY (financial_record_id) REFERENCES training_financial_records (id) ON DELETE CASCADE,
  CONSTRAINT fk_disbursement_application FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_disbursement_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_disbursement_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION F -- POST-TRAINING REPORTS  (Spec 4.6, 7.2 E)
-- Placed here because it references applications and sessions.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS training_completion_reports (
  id                          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id              INT UNSIGNED NOT NULL,
  report_title                VARCHAR(255) NOT NULL,
  report_summary              TEXT NULL,
  report_file_path            VARCHAR(500) NULL,
  knowledge_sharing_activity  TEXT NULL,
  knowledge_sharing_completed TINYINT(1) NOT NULL DEFAULT 0,
  knowledge_sharing_session_id INT UNSIGNED NULL,
  status                      ENUM('pending','submitted','under_review','accepted','returned') NOT NULL DEFAULT 'pending',
  submitted_at                DATETIME NULL,
  reviewed_by                 INT UNSIGNED NULL,
  reviewed_at                 DATETIME NULL,
  review_comments             TEXT NULL,
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_completion_app (application_id),
  KEY idx_completion_status (status),
  KEY idx_completion_session (knowledge_sharing_session_id),
  CONSTRAINT fk_completion_app FOREIGN KEY (application_id) REFERENCES training_applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_completion_session FOREIGN KEY (knowledge_sharing_session_id) REFERENCES knowledge_sharing_sessions (id) ON DELETE SET NULL,
  CONSTRAINT fk_completion_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION G -- E-LEARNING AND COURSES  (Spec 15)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS courses (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code              VARCHAR(30) NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT NULL,
  category_id       INT UNSIGNED NULL,
  department_id     INT UNSIGNED NULL,
  instructor_user_id INT UNSIGNED NULL,
  difficulty_level  ENUM('beginner','intermediate','advanced') NULL,
  estimated_hours   DECIMAL(5,1) NULL,
  status            ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by        INT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_code (code),
  KEY idx_courses_category (category_id),
  KEY idx_courses_dept (department_id),
  CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_courses_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_courses_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_modules (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id           INT UNSIGNED NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         VARCHAR(1000) NULL,
  position            SMALLINT UNSIGNED NOT NULL,
  video_id            INT UNSIGNED NULL,
  document_id         INT UNSIGNED NULL,
  estimated_minutes   SMALLINT UNSIGNED NULL,
  is_mandatory        TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_module_position (course_id, position),
  KEY idx_course_modules_video (video_id),
  KEY idx_course_modules_document (document_id),
  CONSTRAINT fk_course_modules_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT fk_course_modules_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE SET NULL,
  CONSTRAINT fk_course_modules_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  course_id       INT UNSIGNED NOT NULL,
  status          ENUM('enrolled','in_progress','completed','dropped') NOT NULL DEFAULT 'enrolled',
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  enrolled_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at      DATETIME NULL,
  completed_at    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (user_id, course_id),
  KEY idx_enrollment_course (course_id),
  CONSTRAINT fk_enrollment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT chk_enrollment_progress CHECK (progress_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional assessments (Spec 15 -- to be expanded after core delivery)
CREATE TABLE IF NOT EXISTS quizzes (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id          INT UNSIGNED NOT NULL,
  module_id          INT UNSIGNED NULL,
  title              VARCHAR(200) NOT NULL,
  description        TEXT NULL,
  pass_mark          DECIMAL(5,2) NOT NULL DEFAULT 50,
  max_attempts       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  time_limit_minutes SMALLINT UNSIGNED NULL,
  status             ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by         INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quizzes_course (course_id),
  KEY idx_quizzes_module (module_id),
  CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_module FOREIGN KEY (module_id) REFERENCES course_modules (id) ON DELETE SET NULL,
  CONSTRAINT fk_quizzes_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_quizzes_pass_mark CHECK (pass_mark BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION H -- VIDEO CONFERENCING AND MEETINGS  (Spec 16)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meetings (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NULL,
  agenda              TEXT NULL,
  host_user_id        INT UNSIGNED NOT NULL,
  department_id       INT UNSIGNED NULL,
  start_at            DATETIME NOT NULL,
  duration_minutes    SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  provider            ENUM('jitsi','zoom','teams','other') NOT NULL DEFAULT 'jitsi',
  meeting_url         VARCHAR(500) NULL,
  access_code         VARCHAR(30) NULL,
  access_restriction  ENUM('public','department','invite_only') NOT NULL DEFAULT 'invite_only',
  recording_enabled   TINYINT(1) NOT NULL DEFAULT 0,
  status              ENUM('scheduled','live','ended','cancelled') NOT NULL DEFAULT 'scheduled',
  ended_at            DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_meetings_host (host_user_id),
  KEY idx_meetings_start (start_at),
  KEY idx_meetings_status (status),
  KEY idx_meetings_dept (department_id),
  CONSTRAINT fk_meetings_host FOREIGN KEY (host_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_meetings_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT chk_meetings_duration CHECK (duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_participants (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  meeting_id         INT UNSIGNED NOT NULL,
  user_id            INT UNSIGNED NOT NULL,
  participant_role   ENUM('host','moderator','participant') NOT NULL DEFAULT 'participant',
  invite_status      ENUM('invited','accepted','declined','revoked') NOT NULL DEFAULT 'invited',
  joined_at          DATETIME NULL,
  left_at            DATETIME NULL,
  attendance_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_meeting_participant (meeting_id, user_id),
  KEY idx_meeting_part_user (user_id),
  CONSTRAINT fk_meeting_part_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
  CONSTRAINT fk_meeting_part_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_recordings (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  meeting_id         INT UNSIGNED NOT NULL,
  title              VARCHAR(255) NOT NULL,
  file_path          VARCHAR(500) NULL,
  thumbnail_path     VARCHAR(500) NULL,
  duration_seconds   INT UNSIGNED NULL,
  file_size_bytes    BIGINT UNSIGNED NULL,
  recording_status   ENUM('processing','ready','failed','archived') NOT NULL DEFAULT 'processing',
  consent_obtained   TINYINT(1) NOT NULL DEFAULT 0,
  library_video_id   INT UNSIGNED NULL COMMENT 'Set when published to the Video Learning Centre',
  uploaded_by        INT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recording_meeting (meeting_id),
  KEY idx_recording_library (library_video_id),
  CONSTRAINT fk_recording_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
  CONSTRAINT fk_recording_library FOREIGN KEY (library_video_id) REFERENCES videos (id) ON DELETE SET NULL,
  CONSTRAINT fk_recording_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION I -- TECHNICAL SUPPORT TICKETING  (Spec 17)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS support_tickets (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_no       VARCHAR(30) NOT NULL,
  user_id            INT UNSIGNED NOT NULL,
  department_id      INT UNSIGNED NULL,
  subject            VARCHAR(255) NOT NULL,
  issue_category     ENUM('hardware','network','software','email','account_access','printing',
                          'conference_equipment','other') NOT NULL DEFAULT 'other',
  problem_description TEXT NOT NULL,
  priority           ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  assigned_to        INT UNSIGNED NULL,
  status             ENUM('open','assigned','in_progress','pending_user_response','resolved','closed')
                       NOT NULL DEFAULT 'open',
  resolution_notes   TEXT NULL,
  kb_document_id     INT UNSIGNED NULL COMMENT 'Knowledge base article produced from the solution',
  resolved_at        DATETIME NULL,
  closed_at          DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_reference (reference_no),
  KEY idx_tickets_requester (user_id),
  KEY idx_tickets_assignee (assigned_to),
  KEY idx_tickets_status (status),
  KEY idx_tickets_dept (department_id),
  KEY idx_tickets_kb (kb_document_id),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_kb FOREIGN KEY (kb_document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_comments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id       INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  comment         TEXT NOT NULL,
  is_internal     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = visible to support staff only',
  attachment_path VARCHAR(500) NULL,
  attachment_name VARCHAR(255) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_comments_ticket (ticket_id),
  CONSTRAINT fk_ticket_comments_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION J -- DISCUSSION FORUM  (Spec 18)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS discussions (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title            VARCHAR(255) NOT NULL,
  body             TEXT NOT NULL,
  author_user_id   INT UNSIGNED NOT NULL,
  department_id    INT UNSIGNED NULL,
  category_id      INT UNSIGNED NULL,
  is_pinned        TINYINT(1) NOT NULL DEFAULT 0,
  status           ENUM('open','locked','archived') NOT NULL DEFAULT 'open',
  accepted_reply_id INT UNSIGNED NULL,
  reply_count      INT UNSIGNED NOT NULL DEFAULT 0,
  view_count       INT UNSIGNED NOT NULL DEFAULT 0,
  last_activity_at DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_discussions_author (author_user_id),
  KEY idx_discussions_status (status),
  KEY idx_discussions_activity (last_activity_at),
  CONSTRAINT fk_discussions_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_discussions_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_discussions_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_replies (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  discussion_id     INT UNSIGNED NOT NULL,
  user_id           INT UNSIGNED NOT NULL,
  parent_reply_id   INT UNSIGNED NULL,
  body              TEXT NOT NULL,
  is_accepted_answer TINYINT(1) NOT NULL DEFAULT 0,
  status            ENUM('visible','hidden','removed') NOT NULL DEFAULT 'visible',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_replies_discussion (discussion_id),
  KEY idx_replies_user (user_id),
  CONSTRAINT fk_replies_discussion FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
  CONSTRAINT fk_replies_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_replies_parent FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE discussions
  ADD CONSTRAINT fk_discussions_accepted_reply FOREIGN KEY (accepted_reply_id) REFERENCES discussion_replies (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS discussion_tags (
  discussion_id INT UNSIGNED NOT NULL,
  tag_id        INT UNSIGNED NOT NULL,
  PRIMARY KEY (discussion_id, tag_id),
  KEY idx_discussion_tags_tag (tag_id),
  CONSTRAINT fk_discussion_tags_discussion FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
  CONSTRAINT fk_discussion_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_follows (
  discussion_id INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (discussion_id, user_id),
  KEY idx_follows_user (user_id),
  CONSTRAINT fk_follows_discussion FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
  CONSTRAINT fk_follows_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS discussion_reports (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  discussion_id    INT UNSIGNED NULL,
  reply_id         INT UNSIGNED NULL,
  reporter_user_id INT UNSIGNED NOT NULL,
  reason           ENUM('inaccurate','inappropriate','confidentiality','spam','other') NOT NULL DEFAULT 'other',
  details          VARCHAR(1000) NULL,
  status           ENUM('open','reviewed','dismissed','actioned') NOT NULL DEFAULT 'open',
  reviewed_by      INT UNSIGNED NULL,
  reviewed_at      DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_discussion (discussion_id),
  KEY idx_reports_reply (reply_id),
  KEY idx_reports_status (status),
  CONSTRAINT fk_reports_discussion FOREIGN KEY (discussion_id) REFERENCES discussions (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reply FOREIGN KEY (reply_id) REFERENCES discussion_replies (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_reports_target CHECK (discussion_id IS NOT NULL OR reply_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION K -- NOTIFICATIONS AND ANNOUNCEMENTS  (Spec 20)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  notification_type VARCHAR(60) NOT NULL COMMENT 'e.g. application_approved, session_reminder',
  title             VARCHAR(200) NOT NULL,
  message           TEXT NOT NULL,
  link              VARCHAR(500) NULL,
  priority          ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
  is_read           TINYINT(1) NOT NULL DEFAULT 0,
  read_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, is_read),
  KEY idx_notifications_created (created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  notification_type VARCHAR(60) NOT NULL,
  channel           ENUM('in_app','email','sms') NOT NULL DEFAULT 'in_app',
  is_enabled        TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_pref (user_id, notification_type, channel),
  CONSTRAINT fk_notification_pref_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title          VARCHAR(200) NOT NULL,
  body           TEXT NOT NULL,
  audience_type  ENUM('all','department','role') NOT NULL DEFAULT 'all',
  department_id  INT UNSIGNED NULL,
  role_key       VARCHAR(40) NULL,
  status         ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  published_by   INT UNSIGNED NULL,
  published_at   DATETIME NULL,
  expires_at     DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_status (status),
  KEY idx_announcements_dept (department_id),
  CONSTRAINT fk_announcements_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_announcements_publisher FOREIGN KEY (published_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION L -- SYSTEM: AUDIT, SETTINGS, AUTH, BACKUP  (Spec 20, 27, 29)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_logs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NULL,
  action       VARCHAR(80) NOT NULL COMMENT 'machine name of the action, e.g. application_approved',
  entity_type  VARCHAR(60) NULL,
  entity_id    INT UNSIGNED NULL,
  description  TEXT NULL,
  metadata     TEXT NULL COMMENT 'JSON payload of before/after values where applicable',
  ip_address   VARCHAR(45) NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_user (user_id, created_at),
  KEY idx_activity_entity (entity_type, entity_id),
  KEY idx_activity_action (action),
  KEY idx_activity_created (created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key   VARCHAR(80) NOT NULL,
  setting_value TEXT NULL,
  setting_type  ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  description   VARCHAR(255) NULL,
  updated_by    INT UNSIGNED NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_setting_key (setting_key),
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  token_hash   CHAR(64) NOT NULL COMMENT 'SHA-256 of the reset token; raw token never stored',
  expires_at   DATETIME NOT NULL,
  used_at      DATETIME NULL,
  requested_ip VARCHAR(45) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login rate limiting evidence  (Spec 27)
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier   VARCHAR(190) NOT NULL COMMENT 'email or username attempted',
  ip_address   VARCHAR(45) NULL,
  was_successful TINYINT(1) NOT NULL DEFAULT 0,
  user_agent   VARCHAR(255) NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_attempts_ip (ip_address, attempted_at),
  KEY idx_login_attempts_identifier (identifier, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_logs (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_type      ENUM('database','documents','videos','configuration','full') NOT NULL DEFAULT 'database',
  status           ENUM('running','completed','failed') NOT NULL DEFAULT 'running',
  started_at       DATETIME NOT NULL,
  finished_at      DATETIME NULL,
  file_path        VARCHAR(500) NULL,
  file_size_bytes  BIGINT UNSIGNED NULL,
  error_message    TEXT NULL,
  triggered_by     INT UNSIGNED NULL COMMENT 'NULL = scheduled job',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_backup_status (status),
  KEY idx_backup_started (started_at),
  CONSTRAINT fk_backup_triggered_by FOREIGN KEY (triggered_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Downloadable certificates  (Spec 4.2, 15)
CREATE TABLE IF NOT EXISTS certificates (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                INT UNSIGNED NOT NULL,
  certificate_no         VARCHAR(40) NOT NULL,
  title                  VARCHAR(200) NOT NULL,
  training_application_id INT UNSIGNED NULL,
  course_id              INT UNSIGNED NULL,
  issued_at              DATE NULL,
  file_path              VARCHAR(500) NULL,
  issued_by              INT UNSIGNED NULL,
  status                 ENUM('issued','revoked') NOT NULL DEFAULT 'issued',
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_certificate_no (certificate_no),
  KEY idx_certificates_user (user_id),
  KEY idx_certificates_application (training_application_id),
  KEY idx_certificates_course (course_id),
  CONSTRAINT fk_certificates_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_certificates_application FOREIGN KEY (training_application_id) REFERENCES training_applications (id) ON DELETE SET NULL,
  CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
  CONSTRAINT fk_certificates_issuer FOREIGN KEY (issued_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_certificates_source CHECK (training_application_id IS NOT NULL OR course_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- SECTION M -- REPORTING VIEWS  (Spec 22)
-- ----------------------------------------------------------------------------

-- Approved funding vs money actually released, per application
CREATE OR REPLACE VIEW v_training_financial_summary AS
SELECT
  ta.id                    AS application_id,
  ta.reference_no,
  ta.programme_title,
  sp.full_name             AS applicant_name,
  d.name                   AS department_name,
  ta.status                AS application_status,
  tfr.approved_amount,
  tfr.currency,
  tfr.financial_status,
  IFNULL(SUM(CASE WHEN td.status = 'completed' THEN td.amount END), 0) AS total_disbursed,
  tfr.approved_amount - IFNULL(SUM(CASE WHEN td.status = 'completed' THEN td.amount END), 0) AS outstanding_amount,
  COUNT(td.id)             AS disbursement_count
FROM training_applications ta
JOIN staff_profiles sp      ON sp.user_id = ta.applicant_user_id
JOIN departments d          ON d.id = ta.department_id
LEFT JOIN training_financial_records tfr ON tfr.application_id = ta.id
LEFT JOIN training_disbursements td      ON td.financial_record_id = tfr.id
GROUP BY ta.id, ta.reference_no, ta.programme_title, sp.full_name, d.name,
         ta.status, tfr.approved_amount, tfr.currency, tfr.financial_status;

-- Every application that is sitting in somebody's queue right now
CREATE OR REPLACE VIEW v_pending_approval_queue AS
SELECT
  ta.id                    AS application_id,
  ta.reference_no,
  ta.programme_title,
  sp.full_name             AS applicant_name,
  d.code                   AS department_code,
  d.name                   AS department_name,
  ta.status,
  ta.current_stage_order,
  ta.current_stage_key,
  tas.stage_label,
  ta.pending_reviewer_user_id,
  pr.full_name             AS pending_reviewer_name,
  DATEDIFF(NOW(), ta.updated_at) AS days_waiting
FROM training_applications ta
JOIN staff_profiles sp ON sp.user_id = ta.applicant_user_id
JOIN departments d     ON d.id = ta.department_id
LEFT JOIN training_approval_steps tas ON tas.stage_key = ta.current_stage_key
LEFT JOIN staff_profiles pr ON pr.user_id = ta.pending_reviewer_user_id
WHERE ta.status IN ('submitted','pending_principal_manager','pending_agm','pending_gm',
                    'pending_learning_development','pending_financial_review');

-- Registrations vs capacity, per Knowledge Sharing Session  (Spec 11.2)
CREATE OR REPLACE VIEW v_session_capacity AS
SELECT
  ks.id                              AS session_id,
  ks.title,
  ks.session_date,
  ks.start_time,
  ks.status,
  ks.max_attendance,
  SUM(CASE WHEN sr.status IN ('registered','attended') THEN 1 ELSE 0 END) AS registered_count,
  ks.max_attendance - SUM(CASE WHEN sr.status IN ('registered','attended') THEN 1 ELSE 0 END) AS seats_remaining
FROM knowledge_sharing_sessions ks
LEFT JOIN session_registrations sr ON sr.session_id = ks.id
GROUP BY ks.id, ks.title, ks.session_date, ks.start_time, ks.status, ks.max_attendance;

-- Flat permission lookup used by the PHP authorisation layer
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT
  ur.user_id,
  r.role_key,
  ur.department_id,
  ur.expires_at
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE r.is_active = 1;
