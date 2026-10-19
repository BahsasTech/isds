-- ============================================================================
-- LSDS -- DEMO / SAMPLE DATA SEED
-- ----------------------------------------------------------------------------
-- Populates the live database with realistic-looking records so every screen
-- in the admin console has content to display.
--
-- Pre-requisites:
--   1. schema.sql                 (creates the tables)
--   2. seed_reference_data.sql    (roles, approval steps, categories, settings)
--   3. bin/install.php --demo     (creates the admin + role user accounts)
--
-- This file is RE-RUNNABLE: it wipes the content tables and rebuilds the demo
-- dataset. Reference data (roles, approval steps, categories, tags,
-- departments, system settings) is preserved.
--
-- Load with:
--   mysql -u root lsds_db < database/seed_demo_data.sql
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 0. Wipe content tables (order does not matter with FK checks disabled)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE training_approval_actions;
TRUNCATE TABLE training_disbursements;
TRUNCATE TABLE training_financial_records;
TRUNCATE TABLE training_completion_reports;
TRUNCATE TABLE training_cost_items;
TRUNCATE TABLE training_application_documents;
TRUNCATE TABLE training_applications;
TRUNCATE TABLE session_materials;
TRUNCATE TABLE session_feedback;
TRUNCATE TABLE session_attendance;
TRUNCATE TABLE session_registrations;
TRUNCATE TABLE knowledge_sharing_sessions;
TRUNCATE TABLE document_tags;
TRUNCATE TABLE document_versions;
TRUNCATE TABLE documents;
TRUNCATE TABLE video_tags;
TRUNCATE TABLE video_progress;
TRUNCATE TABLE watch_later;
TRUNCATE TABLE playlist_items;
TRUNCATE TABLE playlists;
TRUNCATE TABLE videos;
TRUNCATE TABLE quizzes;
TRUNCATE TABLE enrollments;
TRUNCATE TABLE course_modules;
TRUNCATE TABLE courses;
TRUNCATE TABLE certificates;
TRUNCATE TABLE meeting_recordings;
TRUNCATE TABLE meeting_participants;
TRUNCATE TABLE meetings;
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE support_tickets;
TRUNCATE TABLE discussion_reports;
TRUNCATE TABLE discussion_follows;
TRUNCATE TABLE discussion_tags;
TRUNCATE TABLE discussion_replies;
TRUNCATE TABLE discussions;
TRUNCATE TABLE notifications;
TRUNCATE TABLE notification_preferences;
TRUNCATE TABLE announcements;
TRUNCATE TABLE activity_logs;
TRUNCATE TABLE reviews;
TRUNCATE TABLE backup_logs;
TRUNCATE TABLE delegation_records;
TRUNCATE TABLE login_attempts;

-- ---------------------------------------------------------------------------
-- 1. Reference additions: departments, tags
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO departments (id, code, name, description) VALUES
  (7, 'LEG', 'Legal Services',            'Legal advisory, contracts and litigation'),
  (8, 'COM', 'Corporate Communications',  'Corporate communications and media relations'),
  (9, 'PR',  'Public Relations',          'Public relations and stakeholder engagement');

INSERT IGNORE INTO tags (id, name, slug) VALUES
  (3, 'Cybersecurity',        'cybersecurity'),
  (4, 'AWS',                  'aws'),
  (5, 'Leadership',           'leadership'),
  (6, 'Data Analytics',       'data-analytics'),
  (7, 'Safety',               'safety'),
  (8, 'Procurement',          'procurement'),
  (9, 'Policy',               'policy'),
  (10, 'Cloud',               'cloud'),
  (11, 'Networking',          'networking'),
  (12, 'Compliance',          'compliance'),
  (13, 'Records Management',  'records-management'),
  (14, 'Customer Service',    'customer-service');

-- ---------------------------------------------------------------------------
-- 2. Staff users (ids 12-26), roles and profiles.
--    Password hash is copied from an existing demo account (user 2) so these
--    accounts can also log in with the demo password (Demo@1234).
-- ---------------------------------------------------------------------------
DELETE FROM user_roles WHERE user_id > 11;
DELETE FROM staff_profiles WHERE user_id > 11;
DELETE FROM department_approvers WHERE user_id > 11 OR assigned_by > 11;
DELETE FROM users WHERE id > 11;

SET @pw := (SELECT password_hash FROM users WHERE id = 2);

INSERT INTO users (id, username, email, password_hash, account_status, must_change_password, created_by, password_changed_at, last_login_at) VALUES
  (12, 't.bakare',     'tunde.bakare@lsds.gov.ng',    @pw, 'active', 0, 1, NOW(), '2026-10-15 08:21:00'),
  (13, 'h.mohammed',   'hauwa.mohammed@lsds.gov.ng',  @pw, 'active', 0, 1, NOW(), '2026-10-15 08:40:00'),
  (14, 's.alabi',      'segun.alabi@lsds.gov.ng',     @pw, 'active', 0, 1, NOW(), '2026-10-14 16:05:00'),
  (15, 'b.ojo',        'blessing.ojo@lsds.gov.ng',    @pw, 'active', 0, 1, NOW(), '2026-10-14 14:22:00'),
  (16, 'n.adeyemi',    'ngozi.adeyemi@lsds.gov.ng',   @pw, 'active', 0, 1, NOW(), '2026-10-13 15:30:00'),
  (17, 'i.sani',       'ibrahim.sani@lsds.gov.ng',    @pw, 'active', 0, 1, NOW(), '2026-10-14 11:48:00'),
  (18, 'g.adamu',      'grace.adamu@lsds.gov.ng',     @pw, 'active', 0, 1, NOW(), '2026-10-09 09:05:00'),
  (19, 'k.olawale',    'kemi.olawale@lsds.gov.ng',    @pw, 'active', 0, 1, NOW(), '2026-10-03 12:10:00'),
  (20, 'e.nwosu',      'emeka.nwosu@lsds.gov.ng',     @pw, 'active', 0, 1, NOW(), '2026-10-10 10:15:00'),
  (21, 'b.suleiman',   'bala.suleiman@lsds.gov.ng',   @pw, 'active', 0, 1, NOW(), '2026-10-08 13:40:00'),
  (22, 'a.grema',      'amina.grema@lsds.gov.ng',     @pw, 'active', 0, 1, NOW(), '2026-10-11 08:20:00'),
  (23, 'm.okafor',     'mary.okafor@lsds.gov.ng',     @pw, 'active', 0, 1, NOW(), '2026-10-02 15:45:00'),
  (24, 'j.eze',        'john.eze@lsds.gov.ng',        @pw, 'active', 0, 1, NOW(), '2026-09-30 11:00:00'),
  (25, 'f.bello',      'fatima.bello@lsds.gov.ng',    @pw, 'active', 0, 1, NOW(), '2026-09-14 10:00:00'),
  (26, 'a.yusuf',      'abubakar.yusuf@lsds.gov.ng',  @pw, 'active', 0, 1, NOW(), '2026-08-15 09:30:00');

INSERT INTO user_roles (user_id, role_id, department_id) VALUES
  (12, 2, NULL), (13, 2, NULL), (14, 2, NULL), (15, 2, NULL), (16, 2, NULL),
  (17, 2, NULL), (18, 2, NULL), (19, 2, NULL), (20, 2, NULL), (21, 2, NULL),
  (22, 2, NULL), (23, 2, NULL), (24, 2, NULL), (25, 2, NULL), (26, 2, NULL);

INSERT INTO staff_profiles (user_id, full_name, pn, oracle_number, phone, department_id, designation, grade_level, verified_by, verified_at) VALUES
  (12, 'Tunde Bakare',     'PN000012', '000012', '+2348010000012', 2, 'Network Security Engineer', 'GL 09', 1, NOW()),
  (13, 'Hauwa Mohammed',   'PN000013', '000013', '+2348010000013', 3, 'Management Accountant',     'GL 09', 1, NOW()),
  (14, 'Segun Alabi',      'PN000014', '000014', '+2348010000014', 5, 'Operations Officer',        'GL 08', 1, NOW()),
  (15, 'Blessing Ojo',     'PN000015', '000015', '+2348010000015', 8, 'Communications Officer',    'GL 08', 1, NOW()),
  (16, 'Ngozi Adeyemi',    'PN000016', '000016', '+2348010000016', 5, 'Administrative Officer',    'GL 08', 1, NOW()),
  (17, 'Ibrahim Sani',     'PN000017', '000017', '+2348010000017', 7, 'Legal Officer',             'GL 09', 1, NOW()),
  (18, 'Grace Adamu',      'PN000018', '000018', '+2348010000018', 4, 'Records Officer',           'GL 07', 1, NOW()),
  (19, 'Kemi Olawale',     'PN000019', '000019', '+2348010000019', 9, 'Public Relations Officer',  'GL 08', 1, NOW()),
  (20, 'Emeka Nwosu',      'PN000020', '000020', '+2348010000020', 3, 'Internal Audit Officer',    'GL 09', 1, NOW()),
  (21, 'Bala Suleiman',    'PN000021', '000021', '+2348010000021', 2, 'Network Engineer',          'GL 09', 1, NOW()),
  (22, 'Amina Grema',      'PN000022', '000022', '+2348010000022', 7, 'Legal Officer',             'GL 08', 1, NOW()),
  (23, 'Mary Okafor',      'PN000023', '000023', '+2348010000023', 3, 'Finance Officer',           'GL 08', 1, NOW()),
  (24, 'John Eze',         'PN000024', '000024', '+2348010000024', 4, 'Human Resource Officer',    'GL 08', 1, NOW()),
  (25, 'Fatima Bello',     'PN000025', '000025', '+2348010000025', 2, 'Systems Administrator',     'GL 10', 1, NOW()),
  (26, 'Abubakar Yusuf',   'PN000026', '000026', '+2348010000026', 5, 'Logistics Officer',         'GL 07', 1, NOW());

-- ---------------------------------------------------------------------------
-- 3. Training applications across the whole workflow
-- ---------------------------------------------------------------------------
INSERT INTO training_applications
  (id, reference_no, applicant_user_id, department_id, application_type, scope, programme_title,
   training_provider, country, venue, start_date, end_date, estimated_total_cost, requested_amount,
   currency, funding_justification, status, current_stage_order, current_stage_key,
   pending_reviewer_user_id, submission_count, submitted_at, decided_at) VALUES
  (1,  'LSDS/TR/2026/2036', 12, 2, 'professional_certification', 'international', 'Certified Information Systems Security Professional (CISSP)', 'ISC2', 'United States', 'Orlando, Florida', '2026-11-10', '2026-11-14', 3000000, 2850000, 'NGN', 'Required to lead the network security function and meet ISO 27001 obligations.', 'pending_financial_review', 5, 'finance_review', 7, 1, '2026-10-06 09:12:00', NULL),
  (2,  'LSDS/TR/2026/2037', 13, 3, 'professional_workshop', 'national', 'Leadership and Change Management', 'Lagos Business School', 'Nigeria', 'Lagos', '2026-11-17', '2026-11-19', 500000, 450000, 'NGN', 'Strengthen change management capability within the finance directorate.', 'pending_gm', 3, 'gm', 5, 1, '2026-10-07 08:40:00', NULL),
  (3,  'LSDS/TR/2026/2038', 14, 5, 'technical_seminar', 'national', 'Occupational Health and Safety Compliance', 'Safety First Consult', 'Nigeria', 'Abuja', '2026-11-05', '2026-11-06', 350000, 320000, 'NGN', 'Mandatory compliance training for operations supervisors.', 'pending_agm', 2, 'agm', 4, 1, '2026-10-08 16:05:00', NULL),
  (4,  'LSDS/TR/2026/2039', 15, 8, 'professional_workshop', 'national', 'Data Analytics with Power BI', 'Datacraft Nigeria', 'Nigeria', 'Abuja', '2026-11-24', '2026-11-26', 560000, 510000, 'NGN', 'Improve corporate reporting with interactive dashboards.', 'pending_principal_manager', 1, 'principal_manager', 3, 1, '2026-10-09 14:22:00', NULL),
  (5,  'LSDS/TR/2026/2040', 17, 7, 'national_conference', 'national', 'Advanced Contract Negotiation', 'Nigerian Bar Association', 'Nigeria', 'Abuja', '2026-12-01', '2026-12-02', 290000, 265000, 'NGN', 'Enhance contract negotiation for major procurement deals.', 'pending_financial_review', 5, 'finance_review', 7, 1, '2026-10-05 11:48:00', NULL),
  (6,  'LSDS/TR/2026/2041', 16, 5, 'professional_certification', 'international', 'Cloud Infrastructure with AWS', 'Amazon Web Services', 'South Africa', 'Cape Town', '2026-11-30', '2026-12-04', 1500000, 1420000, 'NGN', 'Build in-house cloud capability and reduce vendor dependency.', 'financially_approved', 6, 'disbursement', 7, 1, '2026-09-28 15:30:00', '2026-10-14 09:30:00'),
  (7,  'LSDS/TR/2026/2042', 20, 3, 'technical_seminar', 'national', 'IT Audit and Risk Assurance', 'ISACA Abuja Chapter', 'Nigeria', 'Abuja', '2026-11-19', '2026-11-20', 680000, 640000, 'NGN', 'Strengthen internal audit of information systems.', 'pending_principal_manager', 1, 'principal_manager', 3, 1, '2026-10-10 10:15:00', NULL),
  (8,  'LSDS/TR/2026/2043', 18, 4, 'professional_workshop', 'national', 'Records Management and Data Protection', 'InfoGuard Ltd', 'Nigeria', 'Abuja', '2026-11-11', '2026-11-12', 320000, 295000, 'NGN', 'Align records handling with the Nigeria Data Protection Act.', 'pending_agm', 2, 'agm', 4, 1, '2026-10-09 09:05:00', NULL),
  (9,  'LSDS/TR/2026/2044', 21, 2, 'technical_seminar', 'national', 'Zero Trust Network Architecture', 'SecureNet Systems', 'Nigeria', 'Lagos', '2026-12-08', '2026-12-09', 820000, 780000, 'NGN', 'Modernise perimeter security with zero trust principles.', 'pending_gm', 3, 'gm', 5, 1, '2026-10-08 13:40:00', NULL),
  (10, 'LSDS/TR/2026/2045', 22, 7, 'professional_workshop', 'national', 'Public Procurement and Contract Law', 'BPP Academy', 'Nigeria', 'Abuja', '2026-11-25', '2026-11-26', 390000, 360000, 'NGN', 'Ensure compliance with the Public Procurement Act.', 'pending_principal_manager', 1, 'principal_manager', 3, 1, '2026-10-11 08:20:00', NULL),
  (11, 'LSDS/TR/2026/2046', 19, 9, 'professional_workshop', 'national', 'Customer Service Excellence', 'ServicePro Consulting', 'Nigeria', 'Abuja', '2026-11-18', '2026-11-19', 230000, 210000, 'NGN', 'Improve stakeholder engagement at service points.', 'pending_learning_development', 4, 'learning_development', 6, 1, '2026-10-03 12:10:00', NULL),
  (12, 'LSDS/TR/2026/2047', 23, 3, 'academic_conference', 'national', 'Public Financial Management Reform', 'ICAN', 'Nigeria', 'Abuja', '2026-12-15', '2026-12-17', 580000, 540000, 'NGN', 'Support rollout of the new financial management framework.', 'pending_learning_development', 4, 'learning_development', 6, 1, '2026-10-02 15:45:00', NULL),
  (13, 'LSDS/TR/2026/2048', 24, 4, 'professional_certification', 'international', 'CIPD Level 5 in Human Resource Management', 'CIPD', 'United Kingdom', 'London', '2027-01-12', '2027-01-16', 1750000, 1650000, 'NGN', 'Professionalise the HR advisory function.', 'pending_financial_review', 5, 'finance_review', 7, 1, '2026-09-30 11:00:00', NULL),
  (14, 'LSDS/TR/2026/2049', 25, 2, 'professional_certification', 'international', 'AWS Certified Solutions Architect', 'Amazon Web Services', 'United Arab Emirates', 'Dubai', '2026-09-14', '2026-09-18', 1350000, 1250000, 'NGN', 'Certify the cloud platform team.', 'disbursed', 6, 'disbursement', 7, 1, '2026-08-20 10:00:00', '2026-09-25 14:00:00'),
  (15, 'LSDS/TR/2026/2050', 26, 5, 'technical_seminar', 'national', 'Fleet and Logistics Management', 'NAFOC', 'Nigeria', 'Kaduna', '2026-09-08', '2026-09-09', 300000, 280000, 'NGN', 'Optimise fleet utilisation and maintenance costs.', 'disbursed', 6, 'disbursement', 7, 1, '2026-08-15 09:30:00', '2026-09-26 10:30:00'),
  (16, 'LSDS/TR/2026/2051', 2, 2, 'professional_workshop', 'national', 'Cybersecurity Awareness for Staff', 'SecureNet Systems', 'Nigeria', 'Abuja', '2026-08-05', '2026-08-06', 200000, 180000, 'NGN', 'Reduce phishing and social engineering incidents.', 'completed', 6, 'disbursement', NULL, 1, '2026-07-20 08:00:00', '2026-08-07 16:00:00'),
  (17, 'LSDS/TR/2026/2052', 6, 6, 'professional_workshop', 'national', 'Instructional Design Fundamentals', 'LearnTech Academy', 'Nigeria', 'Lagos', '2026-07-14', '2026-07-16', 260000, 240000, 'NGN', 'Improve quality of e-learning content.', 'completed', 6, 'disbursement', NULL, 1, '2026-06-28 09:15:00', '2026-07-17 12:00:00'),
  (18, 'LSDS/TR/2026/2053', 9, 6, 'professional_workshop', 'national', 'Knowledge Management Masterclass', 'KM Institute', 'Nigeria', 'Abuja', '2026-12-03', '2026-12-04', 350000, 320000, 'NGN', 'Advance the knowledge repository initiative.', 'financially_approved', 6, 'disbursement', 7, 1, '2026-09-22 14:30:00', '2026-10-12 11:20:00'),
  (19, 'LSDS/TR/2026/2054', 13, 3, 'professional_workshop', 'national', 'Advanced Excel for Financial Analysis', 'Datacraft Nigeria', 'Nigeria', 'Abuja', '2026-10-14', '2026-10-15', 160000, 150000, 'NGN', 'Improve financial modelling skills.', 'rejected', 1, 'principal_manager', NULL, 1, '2026-09-25 10:40:00', '2026-10-01 09:10:00'),
  (20, 'LSDS/TR/2026/2055', 14, 5, 'technical_seminar', 'national', 'Environmental Compliance Workshop', 'Green Africa Initiative', 'Nigeria', 'Port Harcourt', '2026-11-26', '2026-11-27', 210000, 190000, 'NGN', 'Meet environmental regulatory requirements.', 'returned_for_correction', 1, 'principal_manager', 3, 1, '2026-10-07 11:25:00', NULL),
  (21, 'LSDS/TR/2026/2056', 15, 8, 'professional_workshop', 'national', 'Digital Media Strategy', 'MediaHub Africa', 'Nigeria', 'Lagos', '2026-12-09', '2026-12-10', 280000, 260000, 'NGN', 'Strengthen the corporate digital presence.', 'pending_agm', 2, 'agm', 4, 1, '2026-10-06 13:50:00', NULL),
  (22, 'LSDS/TR/2026/2057', 17, 7, 'international_conference', 'international', 'International Anti-Corruption Conference', 'Transparency International', 'Germany', 'Berlin', '2027-02-02', '2027-02-05', 2300000, 2150000, 'NGN', 'Represent the agency at the global anti-corruption forum.', 'pending_gm', 3, 'gm', 5, 1, '2026-10-04 09:00:00', NULL),
  (23, 'LSDS/TR/2026/2058', 18, 4, 'professional_workshop', 'national', 'Employee Wellness and Wellbeing', 'Wellbeing First', 'Nigeria', 'Abuja', '2026-12-01', '2026-12-02', 190000, 175000, 'NGN', 'Improve staff wellbeing and reduce absenteeism.', 'pending_principal_manager', 1, 'principal_manager', 3, 1, '2026-10-11 15:10:00', NULL),
  (24, 'LSDS/TR/2026/2059', 10, 2, 'technical_seminar', 'national', 'Network Monitoring Tools', 'SecureNet Systems', 'Nigeria', 'Abuja', '2026-11-27', '2026-11-28', 160000, 145000, 'NGN', 'Build proactive network monitoring capability.', 'pending_financial_review', 5, 'finance_review', 7, 1, '2026-10-05 10:30:00', NULL);

-- ---------------------------------------------------------------------------
-- 4. Approval history (submitted + each completed review stage)
-- ---------------------------------------------------------------------------
INSERT INTO training_approval_actions
  (application_id, step_id, stage_key, reviewer_user_id, reviewer_role_key, decision, comments, acted_at) VALUES
  -- app 1 -> awaiting finance review
  (1, NULL, 'submission', 12, 'staff', 'submitted', 'Application submitted for review.', '2026-10-06 09:12:00'),
  (1, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Relevant to unit objectives. Recommended.', '2026-10-06 13:10:00'),
  (1, 2, 'agm', 4, 'agm', 'approved', 'Approved. Proceed.', '2026-10-07 09:25:00'),
  (1, 3, 'gm', 5, 'gm', 'approved', 'Endorsed for L&D review.', '2026-10-08 11:40:00'),
  (1, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Meets the training policy. Forwarded to finance.', '2026-10-10 10:05:00'),
  -- app 2 -> awaiting gm
  (2, NULL, 'submission', 13, 'staff', 'submitted', 'Application submitted for review.', '2026-10-07 08:40:00'),
  (2, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Supports the leadership pipeline.', '2026-10-07 15:20:00'),
  (2, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-09 10:15:00'),
  -- app 3 -> awaiting agm
  (3, NULL, 'submission', 14, 'staff', 'submitted', 'Application submitted for review.', '2026-10-08 16:05:00'),
  (3, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Compliance-driven. Recommended.', '2026-10-09 09:30:00'),
  -- app 4 -> awaiting principal manager
  (4, NULL, 'submission', 15, 'staff', 'submitted', 'Application submitted for review.', '2026-10-09 14:22:00'),
  -- app 5
  (5, NULL, 'submission', 17, 'staff', 'submitted', 'Application submitted for review.', '2026-10-05 11:48:00'),
  (5, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Relevant to procurement work.', '2026-10-05 16:00:00'),
  (5, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-06 10:30:00'),
  (5, 3, 'gm', 5, 'gm', 'approved', 'Endorsed for L&D review.', '2026-10-07 14:10:00'),
  (5, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Forwarded to finance.', '2026-10-09 11:00:00'),
  -- app 6 -> financially approved
  (6, NULL, 'submission', 16, 'staff', 'submitted', 'Application submitted for review.', '2026-09-28 15:30:00'),
  (6, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Cloud skills are a priority.', '2026-09-29 10:00:00'),
  (6, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-09-30 09:40:00'),
  (6, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-10-02 12:20:00'),
  (6, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Aligned with the digital transformation plan.', '2026-10-06 09:15:00'),
  (6, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised. Partial release approved.', '2026-10-14 09:30:00'),
  -- app 7
  (7, NULL, 'submission', 20, 'staff', 'submitted', 'Application submitted for review.', '2026-10-10 10:15:00'),
  -- app 8
  (8, NULL, 'submission', 18, 'staff', 'submitted', 'Application submitted for review.', '2026-10-09 09:05:00'),
  (8, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-09 14:30:00'),
  -- app 9
  (9, NULL, 'submission', 21, 'staff', 'submitted', 'Application submitted for review.', '2026-10-08 13:40:00'),
  (9, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-09 08:50:00'),
  (9, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-10 11:20:00'),
  -- app 10
  (10, NULL, 'submission', 22, 'staff', 'submitted', 'Application submitted for review.', '2026-10-11 08:20:00'),
  -- app 11
  (11, NULL, 'submission', 19, 'staff', 'submitted', 'Application submitted for review.', '2026-10-03 12:10:00'),
  (11, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-04 09:15:00'),
  (11, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-05 10:40:00'),
  (11, 3, 'gm', 5, 'gm', 'approved', 'Endorsed for L&D review.', '2026-10-07 15:30:00'),
  -- app 12
  (12, NULL, 'submission', 23, 'staff', 'submitted', 'Application submitted for review.', '2026-10-02 15:45:00'),
  (12, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-03 09:50:00'),
  (12, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-04 11:10:00'),
  (12, 3, 'gm', 5, 'gm', 'approved', 'Endorsed for L&D review.', '2026-10-06 14:00:00'),
  -- app 13
  (13, NULL, 'submission', 24, 'staff', 'submitted', 'Application submitted for review.', '2026-09-30 11:00:00'),
  (13, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-01 10:20:00'),
  (13, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-03 09:30:00'),
  (13, 3, 'gm', 5, 'gm', 'approved', 'Endorsed for L&D review.', '2026-10-07 16:10:00'),
  (13, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Forwarded to finance.', '2026-10-09 11:45:00'),
  -- app 14 -> disbursed
  (14, NULL, 'submission', 25, 'staff', 'submitted', 'Application submitted for review.', '2026-08-20 10:00:00'),
  (14, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-08-21 09:00:00'),
  (14, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-08-24 10:00:00'),
  (14, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-08-28 11:00:00'),
  (14, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Approved.', '2026-09-02 09:30:00'),
  (14, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised.', '2026-09-10 14:00:00'),
  -- app 15 -> disbursed
  (15, NULL, 'submission', 26, 'staff', 'submitted', 'Application submitted for review.', '2026-08-15 09:30:00'),
  (15, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-08-17 09:00:00'),
  (15, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-08-20 10:00:00'),
  (15, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-08-25 11:00:00'),
  (15, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Approved.', '2026-08-28 09:30:00'),
  (15, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised.', '2026-09-12 14:00:00'),
  -- app 16 -> completed
  (16, NULL, 'submission', 2, 'staff', 'submitted', 'Application submitted for review.', '2026-07-20 08:00:00'),
  (16, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-07-21 09:00:00'),
  (16, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-07-22 10:00:00'),
  (16, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-07-24 11:00:00'),
  (16, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Approved.', '2026-07-27 09:30:00'),
  (16, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised.', '2026-07-29 14:00:00'),
  -- app 17 -> completed
  (17, NULL, 'submission', 6, 'staff', 'submitted', 'Application submitted for review.', '2026-06-28 09:15:00'),
  (17, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-06-29 09:00:00'),
  (17, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-06-30 10:00:00'),
  (17, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-07-02 11:00:00'),
  (17, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Approved.', '2026-07-03 09:30:00'),
  (17, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised.', '2026-07-07 14:00:00'),
  -- app 18 -> financially approved
  (18, NULL, 'submission', 9, 'staff', 'submitted', 'Application submitted for review.', '2026-09-22 14:30:00'),
  (18, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-09-23 09:00:00'),
  (18, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-09-25 10:00:00'),
  (18, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-09-29 11:00:00'),
  (18, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Approved.', '2026-10-02 09:30:00'),
  (18, 5, 'finance_review', 7, 'finance_officer', 'approved', 'Funding authorised.', '2026-10-12 11:20:00'),
  -- app 19 -> rejected
  (19, NULL, 'submission', 13, 'staff', 'submitted', 'Application submitted for review.', '2026-09-25 10:40:00'),
  (19, 1, 'principal_manager', 3, 'principal_manager', 'rejected', 'Budget already committed for this quarter. Reapply next cycle.', '2026-10-01 09:10:00'),
  -- app 20 -> returned for correction
  (20, NULL, 'submission', 14, 'staff', 'submitted', 'Application submitted for review.', '2026-10-07 11:25:00'),
  (20, 1, 'principal_manager', 3, 'principal_manager', 'returned', 'Please attach the provider quotation and a detailed cost breakdown.', '2026-10-08 10:00:00'),
  -- app 21
  (21, NULL, 'submission', 15, 'staff', 'submitted', 'Application submitted for review.', '2026-10-06 13:50:00'),
  (21, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-07 09:15:00'),
  -- app 22
  (22, NULL, 'submission', 17, 'staff', 'submitted', 'Application submitted for review.', '2026-10-04 09:00:00'),
  (22, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-05 09:30:00'),
  (22, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-07 10:00:00'),
  -- app 23
  (23, NULL, 'submission', 18, 'staff', 'submitted', 'Application submitted for review.', '2026-10-11 15:10:00'),
  -- app 24
  (24, NULL, 'submission', 10, 'staff', 'submitted', 'Application submitted for review.', '2026-10-05 10:30:00'),
  (24, 1, 'principal_manager', 3, 'principal_manager', 'approved', 'Recommended.', '2026-10-06 09:00:00'),
  (24, 2, 'agm', 4, 'agm', 'approved', 'Approved.', '2026-10-07 10:00:00'),
  (24, 3, 'gm', 5, 'gm', 'approved', 'Endorsed.', '2026-10-08 11:00:00'),
  (24, 4, 'learning_development', 6, 'ld_officer', 'approved', 'Forwarded to finance.', '2026-10-09 09:30:00');

-- ---------------------------------------------------------------------------
-- 5. Cost breakdowns
-- ---------------------------------------------------------------------------
INSERT INTO training_cost_items (application_id, item_type, description, amount, currency) VALUES
  (1, 'registration_tuition', 'CISSP exam and tuition', 2200000, 'NGN'),
  (1, 'transportation', 'Return airfare to Orlando', 450000, 'NGN'),
  (1, 'accommodation', 'Hotel accommodation (4 nights)', 200000, 'NGN'),
  (2, 'registration_tuition', 'Programme fees', 350000, 'NGN'),
  (2, 'daily_allowance', 'Daily allowance', 100000, 'NGN'),
  (3, 'registration_tuition', 'Seminar fees', 250000, 'NGN'),
  (3, 'transportation', 'Local transport', 70000, 'NGN'),
  (4, 'registration_tuition', 'Workshop fees', 380000, 'NGN'),
  (4, 'daily_allowance', 'Daily allowance', 130000, 'NGN'),
  (5, 'registration_tuition', 'Conference registration', 200000, 'NGN'),
  (5, 'accommodation', 'Accommodation (2 nights)', 65000, 'NGN'),
  (6, 'registration_tuition', 'AWS training and exam', 900000, 'NGN'),
  (6, 'transportation', 'Return airfare to Cape Town', 350000, 'NGN'),
  (6, 'accommodation', 'Accommodation (4 nights)', 170000, 'NGN'),
  (13, 'registration_tuition', 'CIPD programme fees', 1200000, 'NGN'),
  (13, 'transportation', 'Return airfare to London', 300000, 'NGN'),
  (13, 'accommodation', 'Accommodation (4 nights)', 150000, 'NGN');

-- ---------------------------------------------------------------------------
-- 6. Application supporting documents
-- ---------------------------------------------------------------------------
INSERT INTO training_application_documents
  (application_id, doc_type, original_file_name, stored_file_name, file_path, mime_type, file_size_bytes, uploaded_by, scan_status) VALUES
  (1, 'programme_brochure', 'cissp-brochure.pdf', 'app1_cissp_brochure.pdf', 'storage/applications/1/app1_cissp_brochure.pdf', 'application/pdf', 245760, 12, 'clean'),
  (1, 'cost_breakdown', 'cissp-costs.xlsx', 'app1_cissp_costs.xlsx', 'storage/applications/1/app1_cissp_costs.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 18432, 12, 'clean'),
  (4, 'provider_quotation', 'powerbi-quote.pdf', 'app4_powerbi_quote.pdf', 'storage/applications/4/app4_powerbi_quote.pdf', 'application/pdf', 131072, 15, 'clean'),
  (6, 'invitation_letter', 'aws-invitation.pdf', 'app6_aws_invitation.pdf', 'storage/applications/6/app6_aws_invitation.pdf', 'application/pdf', 98304, 16, 'clean'),
  (6, 'programme_brochure', 'aws-brochure.pdf', 'app6_aws_brochure.pdf', 'storage/applications/6/app6_aws_brochure.pdf', 'application/pdf', 210944, 16, 'clean'),
  (13, 'provider_quotation', 'cipd-quote.pdf', 'app13_cipd_quote.pdf', 'storage/applications/13/app13_cipd_quote.pdf', 'application/pdf', 154624, 24, 'clean');

-- ---------------------------------------------------------------------------
-- 7. Finance: records and disbursements
-- ---------------------------------------------------------------------------
INSERT INTO training_financial_records
  (id, application_id, approved_title, approved_amount, currency, cost_centre, budget_reference, financial_status, authorized_at, authorized_by, notes) VALUES
  (1,  1,  'Certified Information Systems Security Professional (CISSP)', 2850000, 'NGN', 'CC-ICT-2026', 'BUD-2026-ICT-014', 'pending_review',        NULL,                   NULL, 'Awaiting finance review.'),
  (2,  5,  'Advanced Contract Negotiation',                               265000,  'NGN', 'CC-LEG-2026', 'BUD-2026-LEG-006', 'pending_review',        NULL,                   NULL, 'Awaiting finance review.'),
  (3,  6,  'Cloud Infrastructure with AWS',                               1400000, 'NGN', 'CC-OPS-2026', 'BUD-2026-OPS-011', 'partially_disbursed',   '2026-10-14 09:30:00',  7,    'First tranche released.'),
  (4,  13, 'CIPD Level 5 in Human Resource Management',                   1650000, 'NGN', 'CC-HR-2026',  'BUD-2026-HR-009',  'pending_review',        NULL,                   NULL, 'Awaiting finance review.'),
  (5,  14, 'AWS Certified Solutions Architect',                           1250000, 'NGN', 'CC-ICT-2026', 'BUD-2026-ICT-007', 'disbursed',             '2026-09-10 14:00:00',  7,    'Fully disbursed.'),
  (6,  15, 'Fleet and Logistics Management',                              280000,  'NGN', 'CC-OPS-2026', 'BUD-2026-OPS-005', 'disbursed',             '2026-09-12 14:00:00',  7,    'Fully disbursed.'),
  (7,  16, 'Cybersecurity Awareness for Staff',                           180000,  'NGN', 'CC-ICT-2026', 'BUD-2026-ICT-003', 'disbursed',             '2026-07-29 14:00:00',  7,    'Fully disbursed.'),
  (8,  17, 'Instructional Design Fundamentals',                           240000,  'NGN', 'CC-LD-2026',  'BUD-2026-LD-004',  'disbursed',             '2026-07-07 14:00:00',  7,    'Fully disbursed.'),
  (9,  18, 'Knowledge Management Masterclass',                            320000,  'NGN', 'CC-LD-2026',  'BUD-2026-LD-008',  'authorized',            '2026-10-12 11:20:00',  7,    'Authorised, awaiting disbursement.'),
  (10, 24, 'Network Monitoring Tools',                                    145000,  'NGN', 'CC-ICT-2026', 'BUD-2026-ICT-016', 'pending_review',        NULL,                   NULL, 'Awaiting finance review.');

INSERT INTO training_disbursements
  (financial_record_id, application_id, payment_reference, amount, payment_date, payment_method, status, recorded_by, notes) VALUES
  (3, 6,  'PAY-2026-0031', 700000,  '2026-10-14', 'bank_transfer', 'completed', 7, 'First tranche (50 percent).'),
  (5, 14, 'PAY-2026-0022', 1250000, '2026-09-25', 'bank_transfer', 'completed', 7, 'Full payment.'),
  (6, 15, 'PAY-2026-0019', 280000,  '2026-09-26', 'bank_transfer', 'completed', 7, 'Full payment.'),
  (7, 16, 'PAY-2026-0014', 180000,  '2026-08-07', 'bank_transfer', 'completed', 7, 'Full payment.'),
  (8, 17, 'PAY-2026-0009', 240000,  '2026-07-17', 'bank_transfer', 'completed', 7, 'Full payment.');

-- ---------------------------------------------------------------------------
-- 8. Post-training completion reports
-- ---------------------------------------------------------------------------
INSERT INTO training_completion_reports
  (application_id, report_title, report_summary, knowledge_sharing_activity, knowledge_sharing_completed, status, submitted_at, reviewed_by, reviewed_at, review_comments) VALUES
  (16, 'Cybersecurity Awareness Training - Completion Report',
   'Twelve ICT staff completed the two-day awareness programme. Phishing simulation scores improved by 40 percent.',
   'A summary session was delivered to the wider ICT directorate.', 1, 'accepted', '2026-08-12 10:00:00', 6, '2026-08-15 09:00:00', 'Report accepted. Good knowledge transfer.'),
  (17, 'Instructional Design Fundamentals - Completion Report',
   'The L&D officer completed the programme and produced a reusable storyboard template now used for all e-learning modules.',
   'Internal brown-bag session delivered to the L&D team.', 1, 'submitted', '2026-07-22 11:30:00', NULL, NULL, NULL);

-- ---------------------------------------------------------------------------
-- 9. Knowledge sharing sessions
-- ---------------------------------------------------------------------------
INSERT INTO knowledge_sharing_sessions
  (id, title, description, topic, session_date, start_time, end_time, venue, online_meeting_url, presenter_name, presenter_user_id, organizing_department_id, target_audience, registration_deadline, max_attendance, status, published_at) VALUES
  (1,  'Zero Trust Network Architecture', 'An overview of zero trust principles and how they apply to the agency network.', 'Information Security', '2026-10-18', '10:00:00', '12:00:00', 'Auditorium, Block C', 'https://meet.lsds.gov.ng/zero-trust', 'Bala Suleiman', 21, 2, 'ICT staff and interested officers', '2026-10-17', 50,  'published', '2026-10-02 09:00:00'),
  (2,  'New Public Procurement Guidelines', 'Walkthrough of the revised procurement thresholds and approval matrix.', 'Procurement', '2026-10-21', '14:00:00', '16:00:00', 'Online', 'https://meet.lsds.gov.ng/procurement', 'Amina Grema', 22, 7, 'All staff involved in procurement', '2026-10-20', 100, 'published', '2026-10-03 10:00:00'),
  (3,  'Incident Response Tabletop Exercise', 'A simulated security incident to test the response playbook.', 'Information Security', '2026-10-24', '09:30:00', '11:30:00', 'ICT Training Room', NULL, 'Emeka Nwosu', 20, 3, 'Incident response team', '2026-10-22', 25,  'published', '2026-10-05 11:00:00'),
  (4,  'Records Management and Data Protection', 'Practical guidance on records retention and data protection obligations.', 'Records Management', '2026-10-29', '11:00:00', '13:00:00', 'Online', 'https://meet.lsds.gov.ng/records', 'Grace Adamu', 18, 4, 'All staff', '2026-10-27', 60,  'published', '2026-10-06 14:15:00'),
  (5,  'Customer Service Excellence', 'Service standards and handling difficult stakeholder interactions.', 'Customer Service', '2026-11-04', '13:00:00', '15:00:00', 'Auditorium, Block C', 'https://meet.lsds.gov.ng/service', 'Kemi Olawale', 19, 9, 'Front-desk and support staff', '2026-11-02', 40,  'draft', NULL),
  (6,  'Cloud Security Fundamentals', 'Securing workloads in the cloud: identity, network and data controls.', 'Cloud', '2026-09-15', '10:00:00', '12:00:00', 'Online', 'https://meet.lsds.gov.ng/cloud-sec', 'Fatima Bello', 25, 2, 'ICT staff', '2026-09-13', 80,  'completed', '2026-08-25 09:00:00'),
  (7,  'Data Analytics with Power BI', 'Building dashboards from agency datasets.', 'Data Analytics', '2026-09-05', '09:00:00', '13:00:00', 'ICT Training Room', NULL, 'Hauwa Mohammed', 13, 3, 'Finance and planning staff', '2026-09-03', 45,  'completed', '2026-08-20 10:00:00'),
  (8,  'Occupational Safety Awareness', 'Workplace safety practices and emergency procedures.', 'Safety', '2026-08-20', '14:00:00', '16:00:00', 'Operations Hall', NULL, 'Segun Alabi', 14, 5, 'Operations staff', '2026-08-18', 60,  'completed', '2026-08-05 09:00:00'),
  (9,  'Leadership Essentials', 'Foundational leadership skills for new managers.', 'Leadership', '2026-11-12', '10:00:00', '12:00:00', 'Auditorium, Block C', 'https://meet.lsds.gov.ng/leadership', 'Tunde Adeyemi', 5, 6, 'New managers and supervisors', '2026-11-10', 70,  'published', '2026-10-01 12:00:00'),
  (10, 'Records Digitisation Clinic', 'Hands-on scanning and metadata capture clinic.', 'Records Management', '2026-07-10', '11:00:00', '13:00:00', 'Records Office', NULL, 'Grace Musa', 6, 6, 'Records officers', '2026-07-08', 30,  'completed', '2026-06-25 09:00:00');

INSERT INTO session_registrations (session_id, user_id, status, registered_at) VALUES
  (1, 2, 'registered', '2026-10-02 09:30:00'),
  (1, 10, 'registered', '2026-10-02 10:00:00'),
  (1, 12, 'registered', '2026-10-03 08:15:00'),
  (1, 13, 'registered', '2026-10-03 09:40:00'),
  (1, 15, 'registered', '2026-10-04 11:00:00'),
  (1, 21, 'registered', '2026-10-04 12:30:00'),
  (1, 25, 'registered', '2026-10-05 09:00:00'),
  (2, 13, 'registered', '2026-10-03 10:30:00'),
  (2, 17, 'registered', '2026-10-04 09:00:00'),
  (2, 22, 'registered', '2026-10-04 10:00:00'),
  (2, 23, 'registered', '2026-10-05 11:00:00'),
  (3, 10, 'registered', '2026-10-05 11:30:00'),
  (3, 20, 'registered', '2026-10-05 12:00:00'),
  (4, 2, 'registered', '2026-10-06 14:30:00'),
  (4, 18, 'registered', '2026-10-06 15:00:00'),
  (4, 24, 'registered', '2026-10-07 09:00:00'),
  (6, 2, 'attended', '2026-08-25 09:30:00'),
  (6, 10, 'attended', '2026-08-25 09:45:00'),
  (6, 21, 'attended', '2026-08-26 10:00:00'),
  (6, 25, 'attended', '2026-08-26 10:15:00'),
  (7, 13, 'attended', '2026-08-20 10:30:00'),
  (7, 23, 'attended', '2026-08-20 11:00:00'),
  (8, 14, 'attended', '2026-08-05 09:30:00'),
  (8, 16, 'attended', '2026-08-05 10:00:00'),
  (8, 26, 'attended', '2026-08-06 09:00:00'),
  (9, 3, 'registered', '2026-10-01 12:30:00'),
  (9, 4, 'registered', '2026-10-01 13:00:00'),
  (9, 5, 'registered', '2026-10-02 09:00:00'),
  (10, 6, 'attended', '2026-06-25 09:30:00'),
  (10, 18, 'attended', '2026-06-25 10:00:00');

INSERT INTO session_attendance (session_id, user_id, check_in_at, check_out_at, attendance_status, recorded_by) VALUES
  (6, 2, '2026-09-15 09:55:00', '2026-09-15 12:05:00', 'present', 25),
  (6, 10, '2026-09-15 10:02:00', '2026-09-15 12:05:00', 'present', 25),
  (6, 21, '2026-09-15 10:15:00', '2026-09-15 12:05:00', 'late', 25),
  (6, 25, '2026-09-15 09:50:00', '2026-09-15 12:05:00', 'present', 25),
  (7, 13, '2026-09-05 08:55:00', '2026-09-05 13:00:00', 'present', 13),
  (7, 23, '2026-09-05 09:05:00', '2026-09-05 13:00:00', 'present', 13),
  (8, 14, '2026-08-20 13:55:00', '2026-08-20 16:00:00', 'present', 14),
  (8, 16, '2026-08-20 14:05:00', '2026-08-20 16:00:00', 'present', 14),
  (8, 26, '2026-08-20 14:20:00', '2026-08-20 16:00:00', 'late', 14),
  (10, 6, '2026-07-10 10:55:00', '2026-07-10 13:00:00', 'present', 6),
  (10, 18, '2026-07-10 11:00:00', '2026-07-10 13:00:00', 'present', 6);

INSERT INTO session_feedback (session_id, user_id, rating, comments, submitted_at) VALUES
  (6, 2, 5, 'Very practical and relevant to our daily work.', '2026-09-15 12:30:00'),
  (6, 10, 4, 'Good session, would like more hands-on labs.', '2026-09-15 13:00:00'),
  (6, 21, 4, 'Clear delivery.', '2026-09-15 14:00:00'),
  (7, 13, 5, 'Excellent use of real agency data.', '2026-09-05 14:00:00'),
  (7, 23, 4, 'Helpful templates shared.', '2026-09-05 15:00:00'),
  (8, 14, 4, 'Informative refresher.', '2026-08-20 16:30:00'),
  (8, 16, 5, 'Well organised.', '2026-08-20 17:00:00'),
  (10, 6, 5, 'Great hands-on clinic.', '2026-07-10 13:30:00');

-- ---------------------------------------------------------------------------
-- 10. Knowledge repository: documents
-- ---------------------------------------------------------------------------
INSERT INTO documents
  (id, title, description, category_id, department_id, owner_user_id, file_name, stored_file_name, file_path, mime_type, file_size_bytes, current_version_no, access_classification, review_status, submitted_at, published_at, reviewed_by, reviewed_at) VALUES
  (1,  'Information Security Policy',            'The agency information security policy and acceptable use rules.', 5, 2, 25, 'information-security-policy.pdf', 'doc1_info_sec_policy.pdf', 'storage/documents/doc1_info_sec_policy.pdf', 'application/pdf', 524288, 2, 'internal', 'published', '2026-08-01 09:00:00', '2026-08-05 10:00:00', 6, '2026-08-04 14:00:00'),
  (2,  'Network Design Standard',                'Reference architecture and cabling standards for the agency network.', 2, 2, 21, 'network-design-standard.pdf', 'doc2_network_standard.pdf', 'storage/documents/doc2_network_standard.pdf', 'application/pdf', 786432, 1, 'internal', 'published', '2026-07-10 09:00:00', '2026-07-15 11:00:00', 6, '2026-07-14 10:00:00'),
  (3,  'Standard Operating Procedure - Helpdesk', 'How the helpdesk receives, triages and resolves support tickets.', 7, 2, 10, 'sop-helpdesk.docx', 'doc3_sop_helpdesk.docx', 'storage/documents/doc3_sop_helpdesk.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 65536, 3, 'internal', 'published', '2026-06-15 09:00:00', '2026-06-20 09:00:00', 6, '2026-06-19 15:00:00'),
  (4,  'Data Protection Guidelines',              'Guidance on handling personal data in line with the NDPA.', 8, 4, 18, 'data-protection-guidelines.pdf', 'doc4_data_protection.pdf', 'storage/documents/doc4_data_protection.pdf', 'application/pdf', 430080, 1, 'internal', 'under_review', '2026-10-05 09:00:00', NULL, NULL, NULL),
  (5,  'Procurement Manual',                      'End-to-end procurement process and approval thresholds.', 8, 7, 22, 'procurement-manual.pdf', 'doc5_procurement_manual.pdf', 'storage/documents/doc5_procurement_manual.pdf', 'application/pdf', 921600, 2, 'internal', 'published', '2026-05-10 09:00:00', '2026-05-18 10:00:00', 6, '2026-05-17 11:00:00'),
  (6,  'Incident Response Playbook',              'Step-by-step response to security incidents.', 5, 2, 20, 'incident-response-playbook.pdf', 'doc6_ir_playbook.pdf', 'storage/documents/doc6_ir_playbook.pdf', 'application/pdf', 512000, 1, 'restricted', 'submitted_for_review', '2026-10-08 09:00:00', NULL, NULL, NULL),
  (7,  'Cloud Adoption Strategy',                 'The agency roadmap for migrating services to the cloud.', 4, 2, 25, 'cloud-adoption-strategy.pdf', 'doc7_cloud_strategy.pdf', 'storage/documents/doc7_cloud_strategy.pdf', 'application/pdf', 393216, 1, 'internal', 'approved', '2026-09-20 09:00:00', NULL, 6, '2026-09-28 10:00:00'),
  (8,  'Records Retention Schedule',              'Retention periods for agency records by category.', 7, 4, 18, 'records-retention-schedule.xlsx', 'doc8_retention_schedule.xlsx', 'storage/documents/doc8_retention_schedule.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 40960, 1, 'internal', 'draft', NULL, NULL, NULL, NULL),
  (9,  'Firewall Configuration Guide',            'Baseline firewall rules and change procedure.', 2, 2, 21, 'firewall-config-guide.pdf', 'doc9_firewall_guide.pdf', 'storage/documents/doc9_firewall_guide.pdf', 'application/pdf', 350208, 1, 'restricted', 'published', '2026-06-01 09:00:00', '2026-06-06 10:00:00', 6, '2026-06-05 11:00:00'),
  (10, 'Customer Service Charter',                'Service standards and response times.', 11, 9, 19, 'customer-service-charter.pdf', 'doc10_service_charter.pdf', 'storage/documents/doc10_service_charter.pdf', 'application/pdf', 245760, 1, 'internal', 'archived', '2025-11-01 09:00:00', '2025-11-10 10:00:00', 6, '2025-11-09 11:00:00');

INSERT INTO document_versions (document_id, version_no, file_name, stored_file_name, file_path, mime_type, file_size_bytes, change_summary, author_user_id) VALUES
  (1, 1, 'information-security-policy.pdf', 'doc1_info_sec_policy_v1.pdf', 'storage/documents/versions/doc1_v1.pdf', 'application/pdf', 500000, 'Initial issue.', 25),
  (1, 2, 'information-security-policy.pdf', 'doc1_info_sec_policy.pdf', 'storage/documents/doc1_info_sec_policy.pdf', 'application/pdf', 524288, 'Added remote working controls.', 25),
  (3, 1, 'sop-helpdesk.docx', 'doc3_sop_helpdesk_v1.docx', 'storage/documents/versions/doc3_v1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 60000, 'Initial issue.', 10),
  (3, 2, 'sop-helpdesk.docx', 'doc3_sop_helpdesk_v2.docx', 'storage/documents/versions/doc3_v2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 63000, 'Updated escalation matrix.', 10),
  (3, 3, 'sop-helpdesk.docx', 'doc3_sop_helpdesk.docx', 'storage/documents/doc3_sop_helpdesk.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 65536, 'Added SLA targets.', 10);

INSERT INTO document_tags (document_id, tag_id) VALUES
  (1, 1), (1, 3), (1, 9),
  (2, 11), (2, 1),
  (3, 1), (3, 12),
  (4, 9), (4, 13),
  (5, 8), (5, 9),
  (6, 3), (6, 12),
  (7, 4), (7, 10),
  (8, 13), (8, 9),
  (9, 11), (9, 3),
  (10, 14);

-- ---------------------------------------------------------------------------
-- 11. Knowledge repository: videos
-- ---------------------------------------------------------------------------
INSERT INTO videos
  (id, title, description, category_id, department_id, uploaded_by, language, stored_file_name, file_name, file_path, mime_type, duration_seconds, file_size_bytes, upload_status, review_status, access_classification, views_count, published_at) VALUES
  (1, 'Zero Trust in Practice',            'Recorded walkthrough of a zero trust implementation.', 5, 2, 21, 'English', 'vid1_zero_trust.mp4', 'zero-trust.mp4', 'storage/videos/vid1_zero_trust.mp4', 'video/mp4', 2700, 314572800, 'ready', 'published', 'internal', 342, '2026-09-01 10:00:00'),
  (2, 'Cloud Cost Optimisation',           'Techniques for reducing cloud spend.',                 10, 2, 25, 'English', 'vid2_cloud_cost.mp4', 'cloud-cost.mp4', 'storage/videos/vid2_cloud_cost.mp4', 'video/mp4', 1800, 209715200, 'ready', 'published', 'internal', 198, '2026-09-10 10:00:00'),
  (3, 'Data Storytelling with Power BI',   'Turning numbers into a narrative.',                    6, 3, 13, 'English', 'vid3_data_story.mp4', 'data-storytelling.mp4', 'storage/videos/vid3_data_story.mp4', 'video/mp4', 2400, 262144000, 'ready', 'published', 'internal', 421, '2026-08-15 10:00:00'),
  (4, 'Incident Response Walkthrough',     'Tabletop walkthrough of a simulated breach.',          5, 2, 20, 'English', 'vid4_incident_response.mp4', 'incident-response.mp4', 'storage/videos/vid4_incident_response.mp4', 'video/mp4', 3300, 377487360, 'ready', 'approved', 'restricted', 87, NULL),
  (5, 'Records Digitisation Basics',       'Scanning workflows and metadata standards.',           11, 4, 18, 'English', 'vid5_digitisation.mp4', 'digitisation-basics.mp4', 'storage/videos/vid5_digitisation.mp4', 'video/mp4', 1500, 157286400, 'ready', 'pending_review', 'internal', 12, NULL),
  (6, 'Customer Service Scenarios',        'Role-play examples of handling difficult cases.',      11, 9, 19, 'English', 'vid6_service_scenarios.mp4', 'service-scenarios.mp4', 'storage/videos/vid6_service_scenarios.mp4', 'video/mp4', 2100, 230686720, 'ready', 'draft', 'internal', 0, NULL),
  (7, 'Network Monitoring Tools Demo',     'Demonstration of the agency monitoring stack.',        2, 2, 10, 'English', 'vid7_monitoring.mp4', 'monitoring-demo.mp4', 'storage/videos/vid7_monitoring.mp4', 'video/mp4', 1950, 220200960, 'ready', 'published', 'internal', 156, '2026-07-20 10:00:00'),
  (8, 'Leadership: Giving Feedback',       'Practical feedback models for managers.',              9, 6, 5, 'English', 'vid8_giving_feedback.mp4', 'giving-feedback.mp4', 'storage/videos/vid8_giving_feedback.mp4', 'video/mp4', 1650, 188743680, 'ready', 'published', 'internal', 274, '2026-09-05 10:00:00');

INSERT INTO video_tags (video_id, tag_id) VALUES
  (1, 1), (1, 11), (1, 3),
  (2, 4), (2, 10),
  (3, 6), (3, 1),
  (4, 3), (4, 12),
  (5, 13), (5, 1),
  (6, 14),
  (7, 11), (7, 1),
  (8, 5);

INSERT INTO video_progress (user_id, video_id, position_seconds, duration_seconds, percent_watched, total_watch_seconds, is_completed, completed_at, first_watched_at, last_watched_at) VALUES
  (2, 1, 2700, 2700, 100.00, 2900, 1, '2026-09-12 14:00:00', '2026-09-12 13:30:00', '2026-09-12 14:00:00'),
  (2, 3, 1200, 2400, 50.00, 1250, 0, NULL, '2026-09-20 10:00:00', '2026-09-20 10:25:00'),
  (10, 7, 1950, 1950, 100.00, 2100, 1, '2026-07-25 11:00:00', '2026-07-25 09:00:00', '2026-07-25 11:00:00'),
  (13, 3, 2400, 2400, 100.00, 2500, 1, '2026-08-20 15:00:00', '2026-08-19 15:00:00', '2026-08-20 15:00:00'),
  (15, 8, 800, 1650, 48.48, 820, 0, NULL, '2026-10-01 09:00:00', '2026-10-01 09:15:00'),
  (21, 1, 2700, 2700, 100.00, 2850, 1, '2026-09-15 10:00:00', '2026-09-14 10:00:00', '2026-09-15 10:00:00'),
  (25, 2, 900, 1800, 50.00, 950, 0, NULL, '2026-09-18 11:00:00', '2026-09-18 11:20:00');

INSERT INTO watch_later (user_id, video_id, added_at) VALUES
  (2, 4, '2026-10-01 09:00:00'),
  (2, 8, '2026-10-02 09:00:00'),
  (13, 2, '2026-10-03 09:00:00'),
  (15, 5, '2026-10-04 09:00:00'),
  (25, 1, '2026-10-05 09:00:00');

INSERT INTO playlists (id, owner_user_id, title, description, visibility, department_id) VALUES
  (1, NULL, 'Information Security Essentials', 'Core security videos for all staff.', 'public', 2),
  (2, 6, 'L&D Onboarding', 'Videos used during staff onboarding.', 'department', 6);

INSERT INTO playlist_items (playlist_id, video_id, position) VALUES
  (1, 1, 1),
  (1, 4, 2),
  (2, 8, 1),
  (2, 2, 2);

-- ---------------------------------------------------------------------------
-- 12. E-learning: courses, modules, quizzes, enrollments, certificates
-- ---------------------------------------------------------------------------
INSERT INTO courses (id, code, title, description, category_id, department_id, instructor_user_id, difficulty_level, estimated_hours, status, created_by) VALUES
  (1, 'SEC-101', 'Information Security Awareness',    'Mandatory annual security awareness course for all staff.', 5, 2, 25, 'beginner',     2.0, 'published', 1),
  (2, 'CLD-201', 'AWS Cloud Fundamentals',            'Introduction to cloud computing on AWS.',                  10, 2, 25, 'beginner',     6.0, 'published', 1),
  (3, 'DAT-210', 'Data Analytics with Power BI',      'Building dashboards and reports with Power BI.',           6, 3, 13, 'intermediate', 8.0, 'published', 1),
  (4, 'REC-120', 'Records Management and Data Protection', 'Records lifecycle and data protection essentials.',    7, 4, 18, 'beginner',     3.0, 'published', 1),
  (5, 'PRC-300', 'Public Procurement Essentials',     'Procurement law, thresholds and process.',                 8, 7, 22, 'intermediate', 5.0, 'draft',     1),
  (6, 'LDR-150', 'Leadership Essentials',             'Foundational leadership and people management.',           9, 6, 5,  'intermediate', 4.0, 'published', 1);

INSERT INTO course_modules (course_id, title, description, position, video_id, document_id, estimated_minutes, is_mandatory) VALUES
  (1, 'Phishing and Social Engineering', 'Recognising and reporting phishing attempts.', 1, 1, 1, 45, 1),
  (1, 'Password and Access Hygiene',     'Strong passwords and multi-factor authentication.', 2, NULL, 1, 30, 1),
  (2, 'Cloud Concepts',                  'Regions, availability zones and core services.', 1, 2, 7, 60, 1),
  (2, 'Identity and Access Management',  'IAM users, roles and policies.', 2, 2, 7, 60, 1),
  (3, 'Getting Started with Power BI',   'Connecting data and building visuals.', 1, 3, NULL, 90, 1),
  (3, 'DAX Fundamentals',                'Measures, calculated columns and time intelligence.', 2, 3, NULL, 120, 1),
  (4, 'Records Lifecycle',               'Creation, retention and disposal of records.', 1, 5, 8, 60, 1),
  (5, 'Procurement Law',                 'Legal framework and thresholds.', 1, NULL, 5, 90, 1),
  (6, 'Feedback and Coaching',           'Giving effective feedback.', 1, 8, NULL, 60, 1);

INSERT INTO quizzes (course_id, module_id, title, description, pass_mark, max_attempts, time_limit_minutes, status, created_by) VALUES
  (1, 1, 'Phishing Awareness Quiz', 'Assess recognition of phishing indicators.', 70.00, 2, 20, 'published', 25),
  (2, 3, 'Cloud Concepts Quiz',     'Check understanding of core cloud concepts.', 70.00, 2, 25, 'published', 25),
  (3, 5, 'Power BI Basics Quiz',    'Assessment of Power BI fundamentals.',       60.00, 1, 30, 'published', 13);

INSERT INTO enrollments (user_id, course_id, status, progress_percent, enrolled_at, started_at, completed_at) VALUES
  (2,  1, 'completed',   100.00, '2026-08-01 09:00:00', '2026-08-01 09:10:00', '2026-08-03 12:00:00'),
  (10, 1, 'completed',   100.00, '2026-08-01 09:05:00', '2026-08-01 09:20:00', '2026-08-04 10:00:00'),
  (13, 3, 'completed',   100.00, '2026-08-19 09:00:00', '2026-08-19 09:30:00', '2026-08-22 15:00:00'),
  (15, 6, 'in_progress',  50.00, '2026-10-01 09:00:00', '2026-10-01 09:15:00', NULL),
  (21, 2, 'completed',   100.00, '2026-09-01 09:00:00', '2026-09-01 09:05:00', '2026-09-10 16:00:00'),
  (25, 2, 'in_progress',  60.00, '2026-09-02 09:00:00', '2026-09-02 09:30:00', NULL),
  (18, 4, 'completed',   100.00, '2026-07-01 09:00:00', '2026-07-01 09:10:00', '2026-07-04 11:00:00'),
  (23, 3, 'enrolled',      0.00, '2026-10-10 09:00:00', NULL, NULL);

INSERT INTO certificates (user_id, certificate_no, title, training_application_id, course_id, issued_at, file_path, issued_by, status) VALUES
  (2,  'LSDS-CERT-2026-0001', 'Information Security Awareness',     NULL, 1, '2026-08-04', 'storage/certificates/LSDS-CERT-2026-0001.pdf', 6, 'issued'),
  (10, 'LSDS-CERT-2026-0002', 'Information Security Awareness',     NULL, 1, '2026-08-05', 'storage/certificates/LSDS-CERT-2026-0002.pdf', 6, 'issued'),
  (13, 'LSDS-CERT-2026-0003', 'Data Analytics with Power BI',       NULL, 3, '2026-08-23', 'storage/certificates/LSDS-CERT-2026-0003.pdf', 6, 'issued'),
  (21, 'LSDS-CERT-2026-0004', 'AWS Cloud Fundamentals',             NULL, 2, '2026-09-11', 'storage/certificates/LSDS-CERT-2026-0004.pdf', 6, 'issued'),
  (18, 'LSDS-CERT-2026-0005', 'Records Management and Data Protection', NULL, 4, '2026-07-05', 'storage/certificates/LSDS-CERT-2026-0005.pdf', 6, 'issued'),
  (25, 'LSDS-CERT-2026-0006', 'AWS Certified Solutions Architect',  14, NULL, '2026-09-26', 'storage/certificates/LSDS-CERT-2026-0006.pdf', 6, 'issued');

-- ---------------------------------------------------------------------------
-- 13. Meetings
-- ---------------------------------------------------------------------------
INSERT INTO meetings (id, title, description, agenda, host_user_id, department_id, start_at, duration_minutes, provider, meeting_url, access_code, access_restriction, recording_enabled, status, ended_at) VALUES
  (1, 'ICT Weekly Stand-up',            'Weekly coordination for the ICT team.',            'Sprint progress; incidents; capacity.', 5, 2, '2026-10-19 09:00:00', 30, 'teams',  'https://teams.lsds.gov.ng/ict-standup', 'ICT24', 'department', 0, 'scheduled', NULL),
  (2, 'Training Committee Meeting',      'Monthly meeting of the training committee.',        'Approvals pipeline; budget; calendar.', 6, 6, '2026-10-22 11:00:00', 60, 'jitsi',  'https://meet.lsds.gov.ng/training-committee', NULL, 'invite_only', 1, 'scheduled', NULL),
  (3, 'Security Incident Review',        'Post-incident review of the September incident.',   'Timeline; root cause; actions.', 20, 3, '2026-10-15 14:00:00', 45, 'zoom',   'https://zoom.lsds.gov.ng/incident-review', 'SEC99', 'invite_only', 1, 'ended', '2026-10-15 14:47:00'),
  (4, 'Cloud Migration Planning',        'Planning the next wave of cloud migration.',        'Workloads; dependencies; timelines.', 25, 2, '2026-10-25 15:00:00', 90, 'jitsi',  'https://meet.lsds.gov.ng/cloud-migration', NULL, 'department', 1, 'scheduled', NULL),
  (5, 'Procurement Review Board',        'Review of pending procurement submissions.',        'Thresholds; approvals; compliance.', 22, 7, '2026-10-14 10:00:00', 120, 'teams', 'https://teams.lsds.gov.ng/procurement-board', 'PRB10', 'invite_only', 1, 'ended', '2026-10-14 11:55:00'),
  (6, 'All-Staff Town Hall',             'Quarterly all-staff briefing.',                     'Performance; announcements; Q&A.', 1, 1, '2026-11-06 10:00:00', 60, 'zoom',   'https://zoom.lsds.gov.ng/town-hall', 'TOWN26', 'public', 1, 'scheduled', NULL);

INSERT INTO meeting_participants (meeting_id, user_id, participant_role, invite_status, joined_at, left_at, attendance_seconds) VALUES
  (1, 5, 'host', 'accepted', NULL, NULL, 0),
  (1, 2, 'participant', 'accepted', NULL, NULL, 0),
  (1, 10, 'participant', 'invited', NULL, NULL, 0),
  (1, 21, 'participant', 'accepted', NULL, NULL, 0),
  (1, 25, 'participant', 'invited', NULL, NULL, 0),
  (2, 6, 'host', 'accepted', NULL, NULL, 0),
  (2, 9, 'participant', 'accepted', NULL, NULL, 0),
  (2, 3, 'participant', 'invited', NULL, NULL, 0),
  (2, 4, 'participant', 'invited', NULL, NULL, 0),
  (3, 20, 'host', 'accepted', '2026-10-15 14:00:00', '2026-10-15 14:47:00', 2820),
  (3, 2, 'participant', 'accepted', '2026-10-15 14:02:00', '2026-10-15 14:47:00', 2700),
  (3, 10, 'participant', 'accepted', '2026-10-15 14:05:00', '2026-10-15 14:45:00', 2400),
  (3, 8, 'moderator', 'accepted', '2026-10-15 14:01:00', '2026-10-15 14:47:00', 2760),
  (4, 25, 'host', 'accepted', NULL, NULL, 0),
  (4, 2, 'participant', 'invited', NULL, NULL, 0),
  (4, 21, 'participant', 'invited', NULL, NULL, 0),
  (5, 22, 'host', 'accepted', '2026-10-14 10:00:00', '2026-10-14 11:55:00', 6900),
  (5, 17, 'participant', 'accepted', '2026-10-14 10:03:00', '2026-10-14 11:55:00', 6720),
  (5, 7, 'participant', 'accepted', '2026-10-14 10:05:00', '2026-10-14 11:50:00', 6300),
  (6, 1, 'host', 'accepted', NULL, NULL, 0),
  (6, 5, 'moderator', 'accepted', NULL, NULL, 0);

INSERT INTO meeting_recordings (meeting_id, title, file_path, duration_seconds, file_size_bytes, recording_status, consent_obtained, library_video_id, uploaded_by) VALUES
  (3, 'Security Incident Review - Recording', 'storage/recordings/meeting3_review.mp4', 2820, 393216000, 'ready', 1, 4, 20),
  (5, 'Procurement Review Board - Recording', 'storage/recordings/meeting5_board.mp4', 6900, 943718400, 'ready', 1, NULL, 22);

-- ---------------------------------------------------------------------------
-- 14. Technical support tickets
-- ---------------------------------------------------------------------------
INSERT INTO support_tickets (id, reference_no, user_id, department_id, subject, issue_category, problem_description, priority, assigned_to, status, resolution_notes, resolved_at, closed_at) VALUES
  (1, 'TK-2026-0417', 13, 3, 'Cannot access shared finance drive', 'network', 'The shared finance drive is not mapping on login since this morning.', 'high', 10, 'resolved', 'Re-mapped the network drive and reset the cached credentials.', '2026-10-14 11:00:00', '2026-10-14 15:00:00'),
  (2, 'TK-2026-0418', 15, 8, 'Printer not responding', 'printing', 'The department printer shows offline and jobs are stuck in the queue.', 'medium', 10, 'in_progress', NULL, NULL, NULL),
  (3, 'TK-2026-0419', 17, 7, 'Outlook not receiving mail', 'email', 'Outlook has not received new mail since yesterday afternoon.', 'high', 10, 'assigned', NULL, NULL, NULL),
  (4, 'TK-2026-0420', 18, 4, 'Request for new user account', 'account_access', 'New records officer requires an account and access to the repository.', 'low', 25, 'pending_user_response', NULL, NULL, NULL),
  (5, 'TK-2026-0421', 21, 2, 'Laptop overheating', 'hardware', 'The laptop fan runs constantly and the machine shuts down under load.', 'medium', 10, 'open', NULL, NULL, NULL),
  (6, 'TK-2026-0422', 23, 3, 'Software licence expired', 'software', 'The accounting package reports an expired licence.', 'high', 25, 'in_progress', NULL, NULL, NULL),
  (7, 'TK-2026-0423', 20, 3, 'Conference room projector fault', 'conference_equipment', 'The projector in meeting room 2 shows no signal.', 'medium', 10, 'resolved', 'Replaced the HDMI cable and reseated the input.', '2026-10-10 09:30:00', '2026-10-10 12:00:00'),
  (8, 'TK-2026-0424', 14, 5, 'VPN connection dropping', 'network', 'The VPN disconnects every few minutes when working remotely.', 'critical', 10, 'closed', 'Updated the VPN client and reissued the profile.', '2026-10-05 13:00:00', '2026-10-06 09:00:00');

INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal) VALUES
  (1, 10, 'Investigating the drive mapping policy on your workstation.', 0),
  (1, 13, 'Thank you, it is working now.', 0),
  (1, 10, 'Root cause: stale Kerberos ticket. Added to KB.', 1),
  (2, 10, 'Checking the print spooler service on the print server.', 0),
  (3, 10, 'Recreating your Outlook profile. Please back up local items.', 0),
  (4, 18, 'Please also grant read access to the retention schedule.', 0),
  (5, 21, 'Machine is with the support desk for cleaning and thermal paste.', 0),
  (6, 25, 'Licence renewal quote requested from the vendor.', 0),
  (7, 20, 'Resolved by replacing the display cable.', 0),
  (8, 10, 'Closed after a week of stable connectivity.', 0);

-- ---------------------------------------------------------------------------
-- 15. Discussion forum
-- ---------------------------------------------------------------------------
INSERT INTO discussions (id, title, body, author_user_id, department_id, category_id, is_pinned, status, reply_count, view_count, last_activity_at, created_at) VALUES
  (1, 'Welcome to the LSDS Knowledge Forum', 'Use this space to ask questions, share resources and discuss training and knowledge topics. Please keep discussions professional and on topic.', 11, 4, 1, 1, 'open', 3, 412, '2026-10-10 11:00:00', '2026-08-01 09:00:00'),
  (2, 'Tips for the CISSP examination', 'For colleagues preparing for CISSP, what study resources did you find most useful?', 12, 2, 5, 0, 'open', 2, 156, '2026-10-09 14:30:00', '2026-10-05 10:00:00'),
  (3, 'Best practices for records retention', 'How are other departments handling retention of email correspondence?', 18, 4, 7, 0, 'open', 2, 98, '2026-10-08 09:45:00', '2026-10-03 11:00:00'),
  (4, 'AWS re:Invent takeaways', 'Sharing the key announcements from AWS re:Invent relevant to our services.', 25, 2, 4, 1, 'open', 1, 233, '2026-10-07 16:20:00', '2026-09-30 09:00:00'),
  (5, 'Power BI dashboard templates', 'A thread to share reusable Power BI template files.', 13, 3, 6, 0, 'open', 1, 120, '2026-10-06 13:10:00', '2026-09-28 10:00:00'),
  (6, 'Procurement thresholds clarification', 'Clarification on the revised thresholds and when a review board is required.', 22, 7, 8, 0, 'locked', 2, 175, '2026-09-25 11:30:00', '2026-09-20 09:00:00'),
  (7, 'Security awareness month ideas', 'Ideas for activities during security awareness month.', 20, 3, 5, 0, 'open', 1, 64, '2026-10-11 08:50:00', '2026-10-09 09:00:00'),
  (8, 'Archived: office relocation logistics', 'Historical thread on the 2025 office relocation. Locked for reference.', 4, 5, 1, 0, 'archived', 0, 40, '2025-06-15 10:00:00', '2025-05-01 09:00:00');

INSERT INTO discussion_replies (id, discussion_id, user_id, parent_reply_id, body, is_accepted_answer, status, created_at) VALUES
  (1, 1, 9, NULL, 'Welcome everyone. Please review the posting guidelines before you start.', 0, 'visible', '2026-08-01 10:00:00'),
  (2, 1, 2, NULL, 'Glad this exists. Looking forward to the knowledge sharing sessions.', 0, 'visible', '2026-08-02 09:15:00'),
  (3, 1, 11, 1, 'Pinned the guidelines for visibility.', 0, 'visible', '2026-08-03 08:30:00'),
  (4, 2, 21, NULL, 'The official ISC2 study guide plus the Kelly Handerhan videos were excellent.', 1, 'visible', '2026-10-06 09:00:00'),
  (5, 2, 12, NULL, 'Thank you, I will start with the official guide.', 0, 'visible', '2026-10-09 14:30:00'),
  (6, 3, 6, NULL, 'We apply a seven-year retention rule for correspondence. Happy to share the schedule.', 1, 'visible', '2026-10-04 10:00:00'),
  (7, 3, 18, NULL, 'That would be helpful, please share the link to the schedule.', 0, 'visible', '2026-10-08 09:45:00'),
  (8, 4, 10, NULL, 'The new monitoring service looks very relevant to our stack.', 0, 'visible', '2026-10-07 16:20:00'),
  (9, 5, 23, NULL, 'Uploading a finance dashboard template that you can adapt.', 0, 'visible', '2026-10-06 13:10:00'),
  (10, 6, 17, NULL, 'Review board is required above the threshold stated in the manual.', 0, 'visible', '2026-09-22 09:00:00'),
  (11, 6, 22, NULL, 'Agreed, and the manual section 4.3 covers the exceptions.', 0, 'visible', '2026-09-25 11:30:00'),
  (12, 7, 25, NULL, 'We could run a phishing simulation and a lunchtime security quiz.', 0, 'visible', '2026-10-11 08:50:00');

UPDATE discussions SET accepted_reply_id = 4 WHERE id = 2;
UPDATE discussions SET accepted_reply_id = 6 WHERE id = 3;

INSERT INTO discussion_tags (discussion_id, tag_id) VALUES
  (1, 1), (1, 2),
  (2, 3), (2, 1),
  (3, 13), (3, 9),
  (4, 4), (4, 10),
  (5, 6), (5, 1),
  (6, 8), (6, 9),
  (7, 3), (7, 1);

INSERT INTO discussion_follows (discussion_id, user_id) VALUES
  (1, 2), (1, 9), (1, 11),
  (2, 12), (2, 21),
  (3, 18),
  (4, 10), (4, 25),
  (5, 23),
  (7, 20);

INSERT INTO discussion_reports (discussion_id, reply_id, reporter_user_id, reason, details, status, reviewed_by, reviewed_at) VALUES
  (1, NULL, 8, 'inaccurate', 'The pinned guidelines reference an outdated policy number.', 'reviewed', 11, '2026-09-01 09:00:00'),
  (6, 11, 10, 'other', 'Request to merge this clarification into the policy document.', 'dismissed', 11, '2026-09-26 09:00:00');

-- ---------------------------------------------------------------------------
-- 16. Notifications
-- ---------------------------------------------------------------------------
INSERT INTO notifications (user_id, notification_type, title, message, link, priority, is_read, read_at, created_at) VALUES
  (3, 'application_awaiting_review', 'Application awaiting your review', 'LSDS/TR/2026/2039 needs Principal Manager review.', '/applications/4', 'high', 0, NULL, '2026-10-15 09:05:00'),
  (4, 'application_awaiting_review', 'Application awaiting your review', 'LSDS/TR/2026/2038 needs Assistant General Manager review.', '/applications/3', 'normal', 0, NULL, '2026-10-15 09:05:00'),
  (5, 'application_awaiting_review', 'Application awaiting your review', 'LSDS/TR/2026/2037 needs General Manager review.', '/applications/2', 'normal', 0, NULL, '2026-10-15 09:05:00'),
  (6, 'application_awaiting_review', 'Application awaiting L&D review', 'LSDS/TR/2026/2046 needs Learning and Development review.', '/applications/11', 'normal', 0, NULL, '2026-10-15 09:05:00'),
  (7, 'application_awaiting_review', 'Applications awaiting finance review', 'Two applications are awaiting financial review.', '/financial', 'high', 0, NULL, '2026-10-15 09:05:00'),
  (12, 'decision', 'Your application is moving forward', 'LSDS/TR/2026/2036 passed L&D review and is with finance.', '/applications/1', 'normal', 1, '2026-10-11 09:00:00', '2026-10-10 10:05:00'),
  (16, 'finance', 'Funding authorized', 'LSDS/TR/2026/2041 was financially approved.', '/applications/6', 'high', 1, '2026-10-14 10:00:00', '2026-10-14 09:31:00'),
  (2, 'session_reminder', 'Session starts in 3 days', 'Zero Trust Network Architecture on 18 October.', '/sessions/1', 'normal', 0, NULL, '2026-10-15 07:00:00'),
  (10, 'ticket_escalated', 'Support ticket escalated', 'TK-2026-0417 was marked high priority.', '/tickets/1', 'high', 0, NULL, '2026-10-14 16:20:00'),
  (14, 'decision', 'Application returned for correction', 'LSDS/TR/2026/2055 was returned. Please review the comments.', '/applications/20', 'high', 0, NULL, '2026-10-08 10:00:00'),
  (13, 'decision', 'Application rejected', 'LSDS/TR/2026/2054 was not approved this cycle.', '/applications/19', 'normal', 1, '2026-10-02 09:00:00', '2026-10-01 09:10:00'),
  (1, 'system', 'Nightly backup completed', 'The nightly database backup completed successfully.', '/backups', 'low', 1, '2026-10-16 06:30:00', '2026-10-16 03:15:00');

INSERT INTO notification_preferences (user_id, notification_type, channel, is_enabled) VALUES
  (1, 'application_awaiting_review', 'in_app', 1),
  (1, 'system', 'email', 1),
  (2, 'session_reminder', 'in_app', 1),
  (2, 'session_reminder', 'email', 1),
  (3, 'application_awaiting_review', 'in_app', 1),
  (3, 'application_awaiting_review', 'email', 1),
  (7, 'application_awaiting_review', 'in_app', 1),
  (7, 'finance', 'in_app', 1),
  (10, 'ticket_escalated', 'in_app', 1);

-- ---------------------------------------------------------------------------
-- 17. Announcements
-- ---------------------------------------------------------------------------
INSERT INTO announcements (title, body, audience_type, department_id, role_key, status, published_by, published_at, expires_at) VALUES
  ('2027 Training Budget Planning Begins', 'Departments are invited to submit training needs for the 2027 fiscal year. Consolidated plans are due to Learning and Development by 30 November 2026.', 'all', NULL, NULL, 'published', 6, '2026-10-13 09:00:00', '2026-11-30 23:59:59'),
  ('Mandatory Information Security Refresher', 'All staff must complete the annual information security refresher course before 15 December 2026. Completion is tracked automatically.', 'all', NULL, NULL, 'published', 25, '2026-10-10 10:30:00', '2026-12-15 23:59:59'),
  ('New Knowledge Sharing Venue', 'Knowledge sharing sessions now hold in the newly refurbished Auditorium (Block C, 2nd Floor) with hybrid streaming.', 'all', NULL, NULL, 'published', 9, '2026-10-06 14:15:00', NULL),
  ('ICT Maintenance Window', 'The ICT directorate will carry out scheduled maintenance on Saturday 25 October between 08:00 and 12:00. Some services may be unavailable.', 'department', 2, NULL, 'published', 25, '2026-10-12 08:00:00', '2026-10-25 12:00:00'),
  ('Draft: End-of-Year Recognition Awards', 'Draft announcement for the end-of-year staff recognition awards. Pending approval before publication.', 'all', NULL, NULL, 'draft', 9, NULL, NULL);

-- ---------------------------------------------------------------------------
-- 18. Delegations
-- ---------------------------------------------------------------------------
INSERT INTO delegation_records (delegator_user_id, delegate_user_id, department_id, position, start_at, end_at, reason, status, approved_by) VALUES
  (3, 13, 3, 'principal_manager', '2026-10-01 00:00:00', '2026-10-31 23:59:59', 'Annual leave cover for the Principal Manager.', 'active', 1);

-- ---------------------------------------------------------------------------
-- 19. Backups
-- ---------------------------------------------------------------------------
INSERT INTO backup_logs (backup_type, status, started_at, finished_at, file_path, file_size_bytes, error_message, triggered_by) VALUES
  ('database',      'completed', '2026-10-16 03:00:00', '2026-10-16 03:14:00', 'storage/backups/lsds_db_2026-10-16.sql.gz', 52428800, NULL, NULL),
  ('documents',     'completed', '2026-10-16 03:15:00', '2026-10-16 03:41:00', 'storage/backups/documents_2026-10-16.tar.gz', 314572800, NULL, NULL),
  ('database',      'completed', '2026-10-15 03:00:00', '2026-10-15 03:13:00', 'storage/backups/lsds_db_2026-10-15.sql.gz', 51380224, NULL, NULL),
  ('full',          'failed',    '2026-10-14 02:00:00', '2026-10-14 02:06:00', NULL, NULL, 'Insufficient disk space on the backup volume.', 1),
  ('configuration', 'completed', '2026-10-13 03:30:00', '2026-10-13 03:31:00', 'storage/backups/config_2026-10-13.zip', 1048576, NULL, 1);

-- ---------------------------------------------------------------------------
-- 20. Activity log (recent audit trail)
-- ---------------------------------------------------------------------------
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at) VALUES
  (12, 'application_submitted',  'training_application', 1,  'Submitted LSDS/TR/2026/2036 for review.', '10.20.1.15', 'Mozilla/5.0', '2026-10-06 09:12:00'),
  (3,  'application_approved',   'training_application', 1,  'Approved LSDS/TR/2026/2036 at Principal Manager stage.', '10.20.1.4', 'Mozilla/5.0', '2026-10-06 13:10:00'),
  (4,  'application_approved',   'training_application', 1,  'Approved LSDS/TR/2026/2036 at AGM stage.', '10.20.1.5', 'Mozilla/5.0', '2026-10-07 09:25:00'),
  (5,  'application_approved',   'training_application', 1,  'Approved LSDS/TR/2026/2036 at GM stage.', '10.20.1.6', 'Mozilla/5.0', '2026-10-08 11:40:00'),
  (6,  'application_approved',   'training_application', 1,  'Approved LSDS/TR/2026/2036 at L&D stage.', '10.20.1.7', 'Mozilla/5.0', '2026-10-10 10:05:00'),
  (7,  'funding_authorized',     'training_application', 6,  'Authorised funding for LSDS/TR/2026/2041.', '10.20.1.8', 'Mozilla/5.0', '2026-10-14 09:30:00'),
  (7,  'disbursement_recorded',  'training_disbursement', 1, 'Recorded disbursement PAY-2026-0031 for LSDS/TR/2026/2041.', '10.20.1.8', 'Mozilla/5.0', '2026-10-14 09:35:00'),
  (13, 'application_submitted',  'training_application', 19, 'Submitted LSDS/TR/2026/2054 for review.', '10.20.1.16', 'Mozilla/5.0', '2026-09-25 10:40:00'),
  (3,  'application_rejected',   'training_application', 19, 'Rejected LSDS/TR/2026/2054.', '10.20.1.4', 'Mozilla/5.0', '2026-10-01 09:10:00'),
  (3,  'application_returned',   'training_application', 20, 'Returned LSDS/TR/2026/2055 for correction.', '10.20.1.4', 'Mozilla/5.0', '2026-10-08 10:00:00'),
  (25, 'document_uploaded',      'document', 1,  'Uploaded new version of Information Security Policy.', '10.20.1.20', 'Mozilla/5.0', '2026-08-01 09:00:00'),
  (25, 'document_published',     'document', 1,  'Published Information Security Policy.', '10.20.1.20', 'Mozilla/5.0', '2026-08-05 10:00:00'),
  (21, 'video_uploaded',         'video', 1,  'Uploaded video Zero Trust in Practice.', '10.20.1.21', 'Mozilla/5.0', '2026-08-30 09:00:00'),
  (21, 'video_published',        'video', 1,  'Published video Zero Trust in Practice.', '10.20.1.21', 'Mozilla/5.0', '2026-09-01 10:00:00'),
  (25, 'course_published',       'course', 2, 'Published course AWS Cloud Fundamentals.', '10.20.1.20', 'Mozilla/5.0', '2026-09-01 09:00:00'),
  (10, 'ticket_resolved',        'support_ticket', 1, 'Resolved ticket TK-2026-0417.', '10.20.1.22', 'Mozilla/5.0', '2026-10-14 15:00:00'),
  (20, 'meeting_ended',          'meeting', 3, 'Ended meeting Security Incident Review.', '10.20.1.23', 'Mozilla/5.0', '2026-10-15 14:47:00'),
  (18, 'session_published',      'session', 4, 'Published session Records Management and Data Protection.', '10.20.1.18', 'Mozilla/5.0', '2026-10-06 14:15:00'),
  (20, 'discussion_created',     'discussion', 7, 'Created discussion Security awareness month ideas.', '10.20.1.23', 'Mozilla/5.0', '2026-10-09 09:00:00'),
  (1,  'settings_updated',       'system_setting', NULL, 'Updated system settings.', '10.20.1.2', 'Mozilla/5.0', '2026-10-01 08:00:00'),
  (1,  'backup_completed',       'backup', 1, 'Nightly database backup completed.', '127.0.0.1', 'lsds-cron/1.0', '2026-10-16 03:14:00'),
  (1,  'user_created',           'user', 12, 'Created staff account for Tunde Bakare.', '10.20.1.2', 'Mozilla/5.0', '2026-09-01 08:30:00'),
  (1,  'role_assigned',          'user_role', 12, 'Assigned Staff role to Tunde Bakare.', '10.20.1.2', 'Mozilla/5.0', '2026-09-01 08:31:00'),
  (9,  'announcement_published', 'announcement', 3, 'Published announcement New Knowledge Sharing Venue.', '10.20.1.10', 'Mozilla/5.0', '2026-10-06 14:15:00'),
  (11, 'discussion_locked',      'discussion', 6, 'Locked discussion Procurement thresholds clarification.', '10.20.1.11', 'Mozilla/5.0', '2026-09-26 09:00:00');

-- ---------------------------------------------------------------------------
-- 21. Login attempt evidence (rate-limiting demo)
-- ---------------------------------------------------------------------------
INSERT INTO login_attempts (identifier, ip_address, was_successful, user_agent, attempted_at) VALUES
  ('admin@lsds.gov.ng', '10.20.1.2', 1, 'Mozilla/5.0', '2026-10-16 08:01:00'),
  ('tunde.bakare@lsds.gov.ng', '10.20.1.15', 1, 'Mozilla/5.0', '2026-10-16 08:05:00'),
  ('hauwa.mohammed@lsds.gov.ng', '10.20.1.16', 1, 'Mozilla/5.0', '2026-10-16 08:10:00'),
  ('unknown@example.com', '203.0.113.44', 0, 'curl/8.0', '2026-10-16 08:12:00'),
  ('finance@lsds.gov.ng', '10.20.1.8', 1, 'Mozilla/5.0', '2026-10-16 08:20:00');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- End of demo data seed.
-- ============================================================================
