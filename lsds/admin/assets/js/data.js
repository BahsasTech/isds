/* ============================================================================
 * LSDS Admin - Shared mock dataset
 * ----------------------------------------------------------------------------
 * Builds a realistic, deterministic dataset that mirrors the MySQL schema:
 * departments, roles, users and training applications (with cost items,
 * documents, approval history, financial records and disbursements).
 * Used only while LSDS.config.useMock is true. Exposes window.LSDS.data.
 * ========================================================================== */
(function (window) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.toISOString(); }
  function ago(days, hour) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour == null ? 9 + (days % 8) : hour, (days * 7) % 60, 0, 0);
    return iso(d);
  }
  function ahead(days, hour) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour == null ? 9 : hour, 0, 0, 0);
    return iso(d);
  }
  function dateOnly(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(isoStr, n) {
    var d = new Date(isoStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function money(n) { return Math.round(n / 500) * 500; }

  /* --- Organisation ------------------------------------------------------- */
  var departments = [
    { id: 1, code: 'ICT', name: 'Information & Communication Technology', head: 'Engr. Bala Suleiman', staff_count: 24, approvers: { principal_manager: 'Hauwa Mohammed', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 2, code: 'FIN', name: 'Finance & Accounts', head: 'Fatima Yusuf', staff_count: 18, approvers: { principal_manager: 'Hauwa Mohammed', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 3, code: 'OPS', name: 'Operations', head: 'Segun Alabi', staff_count: 32, approvers: { principal_manager: 'Kemi Olawale', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 4, code: 'LEG', name: 'Legal Services', head: 'Barr. Amina Grema', staff_count: 11, approvers: { principal_manager: 'Amina Grema', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 5, code: 'HRM', name: 'Human Resources', head: 'Ibrahim Sani', staff_count: 21, approvers: { principal_manager: 'Chinedu Okafor', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 6, code: 'PRC', name: 'Procurement', head: 'Yusuf Garba', staff_count: 14, approvers: { principal_manager: 'Yusuf Garba', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 7, code: 'COM', name: 'Corporate Communications', head: 'Blessing Ojo', staff_count: 9, approvers: { principal_manager: 'Blessing Ojo', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } },
    { id: 8, code: 'AUD', name: 'Internal Audit', head: 'Emeka Nwosu', staff_count: 7, approvers: { principal_manager: 'Emeka Nwosu', agm: 'Segun Alabi', gm: 'Ibrahim Sani' } }
  ];
  function dept(code) {
    for (var i = 0; i < departments.length; i++) if (departments[i].code === code) return departments[i].name;
    return code;
  }

  /* --- Roles (mirrors seed_reference_data.sql) ---------------------------- */
  var roleDefs = [
    ['sysadmin', 'System Administrator', 'Manages platform configuration, accounts, departments and system settings.'],
    ['staff', 'Staff Member / Applicant', 'Applies for training and conferences; uses the knowledge repository.'],
    ['principal_manager', 'Principal Manager', 'First designated departmental reviewer of training applications.'],
    ['agm', 'Assistant General Manager', 'Second departmental reviewer; reviews the Principal Manager recommendation.'],
    ['gm', 'General Manager', 'Final departmental reviewer; forwards approved recommendations to L&D.'],
    ['ld_officer', 'Learning and Development Officer', 'Evaluates programme relevance, eligibility and policy compliance.'],
    ['finance_officer', 'Finance Officer', 'Reviews funding requests, records authorization and disbursements.'],
    ['auditor', 'Auditor / Management', 'Read-only oversight of applications, expenditure and audit logs.'],
    ['knowledge_manager', 'Knowledge Manager', 'Reviews and publishes documents and videos.'],
    ['support_technician', 'Support Technician', 'Handles technical support tickets and knowledge base solutions.'],
    ['forum_moderator', 'Discussion Forum Moderator', 'Reviews reported discussion content and maintains forum quality.']
  ];

  /* --- People ------------------------------------------------------------- */
  /* [name, email, roles[], designation, deptCode, status, pn, oracle, lastLoginDays] */
  var peopleDefs = [
    ['Aisha Bello', 'admin@lsds.gov.ng', ['sysadmin'], 'System Administrator', 'ICT', 'active', 'PN-10001', 'OR-88012', 0],
    ['Chinedu Okafor', 'ld.officer@lsds.gov.ng', ['ld_officer', 'knowledge_manager'], 'Learning & Development Officer', 'HRM', 'active', 'PN-10042', 'OR-88031', 0],
    ['Fatima Yusuf', 'finance@lsds.gov.ng', ['finance_officer'], 'Finance Officer', 'FIN', 'active', 'PN-10077', 'OR-88044', 0],
    ['Emeka Nwosu', 'auditor@lsds.gov.ng', ['auditor'], 'Internal Auditor', 'AUD', 'active', 'PN-10093', 'OR-88055', 2],
    ['Ngozi Adeyemi', 'staff@lsds.gov.ng', ['staff'], 'Administrative Officer', 'OPS', 'active', 'PN-10120', 'OR-88071', 1],
    ['Hauwa Mohammed', 'hauwa.mohammed@lsds.gov.ng', ['principal_manager', 'staff'], 'Principal Manager', 'ICT', 'active', 'PN-10011', 'OR-88002', 0],
    ['Segun Alabi', 'segun.alabi@lsds.gov.ng', ['agm', 'staff'], 'Assistant General Manager', 'OPS', 'active', 'PN-10009', 'OR-88001', 0],
    ['Ibrahim Sani', 'ibrahim.sani@lsds.gov.ng', ['gm', 'staff'], 'General Manager', 'HRM', 'active', 'PN-10005', 'OR-88000', 0],
    ['Blessing Ojo', 'blessing.ojo@lsds.gov.ng', ['staff'], 'Communications Officer', 'COM', 'active', 'PN-10155', 'OR-88090', 3],
    ['Tunde Bakare', 'tunde.bakare@lsds.gov.ng', ['staff'], 'Network Engineer', 'ICT', 'active', 'PN-10162', 'OR-88104', 0],
    ['Grace Adamu', 'grace.adamu@lsds.gov.ng', ['knowledge_manager', 'staff'], 'Records Officer', 'HRM', 'active', 'PN-10188', 'OR-88120', 1],
    ['Kemi Olawale', 'kemi.olawale@lsds.gov.ng', ['principal_manager', 'staff'], 'Customer Service Officer', 'OPS', 'active', 'PN-10201', 'OR-88133', 4],
    ['Bala Suleiman', 'bala.suleiman@lsds.gov.ng', ['support_technician'], 'ICT Support Lead', 'ICT', 'active', 'PN-10210', 'OR-88140', 0],
    ['Amina Grema', 'amina.grema@lsds.gov.ng', ['forum_moderator', 'staff'], 'Legal Officer', 'LEG', 'active', 'PN-10228', 'OR-88155', 2],
    ['Yusuf Garba', 'yusuf.garba@lsds.gov.ng', ['staff'], 'Procurement Officer', 'PRC', 'active', 'PN-10244', 'OR-88166', 5],
    ['Ada Eze', 'ada.eze@lsds.gov.ng', ['staff'], 'Human Resources Officer', 'HRM', 'suspended', 'PN-10260', 'OR-88178', 21],
    ['Paul Okonkwo', 'paul.okonkwo@lsds.gov.ng', ['staff'], 'Operations Officer', 'OPS', 'active', 'PN-10273', 'OR-88190', 8]
  ];

  function buildUsers() {
    return peopleDefs.map(function (p, i) {
      var name = p[0];
      return {
        id: i + 1,
        name: name,
        email: p[1],
        username: p[1].split('@')[0],
        roles: p[2].slice(),
        designation: p[3],
        department: dept(p[4]),
        department_code: p[4],
        account_status: p[5],
        pn: p[6],
        oracle_number: p[7],
        phone: '+234 80' + (30000000 + i * 13713) % 90000000,
        last_login_at: p[8] === 0 ? ago(0, 8 + (i % 6)) : ago(p[8], 10),
        created_at: ago(220 - i * 6, 11),
        must_change_password: false
      };
    });
  }

  function roleLabel(key) {
    for (var i = 0; i < roleDefs.length; i++) if (roleDefs[i][0] === key) return roleDefs[i][1];
    return key;
  }

  /* --- Programme catalogue ------------------------------------------------ */
  /* [title, provider, country, venue, type, scope, cost] */
  var programmes = [
    ['Certified Information Systems Security Professional (CISSP)', '(ISC)\u00b2', 'United States', 'Las Vegas, NV', 'professional_certification', 'international', 2850000],
    ['Leadership and Change Management', 'Lagos Business School', 'Nigeria', 'Lagos', 'professional_workshop', 'national', 450000],
    ['Cloud Infrastructure with AWS', 'Amazon Web Services', 'United Arab Emirates', 'Dubai', 'professional_certification', 'international', 1420000],
    ['Data Analytics with Power BI', 'Microsoft Partner Network', 'Nigeria', 'Abuja', 'professional_workshop', 'national', 510000],
    ['Occupational Health and Safety Compliance', 'Safety First Consulting', 'Nigeria', 'Kaduna', 'technical_seminar', 'national', 320000],
    ['Advanced Contract Negotiation', 'Nigerian Institute of Advanced Legal Studies', 'Nigeria', 'Abuja', 'national_conference', 'national', 265000],
    ['Zero Trust Network Architecture', 'Cisco Systems', 'United Kingdom', 'London', 'technical_seminar', 'international', 1980000],
    ['Project Management Professional (PMP) Certification', 'Project Management Institute', 'Nigeria', 'Lagos', 'professional_certification', 'national', 780000],
    ['Digital Records Management', 'National Archives of Nigeria', 'Nigeria', 'Abuja', 'professional_workshop', 'national', 210000],
    ['Cybersecurity Awareness for Executives', 'Deloitte Academy', 'Nigeria', 'Lagos', 'technical_seminar', 'national', 150000],
    ['Public Procurement Best Practices', 'Bureau of Public Procurement', 'Nigeria', 'Abuja', 'professional_workshop', 'national', 195000],
    ['Public Financial Management and Modelling', 'CFA Society', 'South Africa', 'Johannesburg', 'academic_conference', 'international', 1250000]
  ];

  var APPLICANT_IDS = [5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 6, 7, 8, 3, 5, 10, 11, 12];
  var STATUS_CYCLE = [
    'pending_principal_manager', 'pending_agm', 'pending_gm', 'pending_learning_development',
    'pending_financial_review', 'financially_approved', 'disbursed', 'completed',
    'pending_principal_manager', 'rejected', 'returned_for_correction', 'pending_gm',
    'disbursed', 'pending_financial_review', 'completed', 'pending_agm',
    'financially_approved', 'pending_learning_development'
  ];

  /* Workflow definition (mirrors training_approval_steps) */
  var stages = [
    { order: 0, key: 'submitted', label: 'Submitted', role: 'staff' },
    { order: 1, key: 'principal_manager', label: 'Principal Manager Review', role: 'principal_manager' },
    { order: 2, key: 'agm', label: 'Assistant General Manager Review', role: 'agm' },
    { order: 3, key: 'gm', label: 'General Manager Review', role: 'gm' },
    { order: 4, key: 'learning_development', label: 'Learning and Development Review', role: 'ld_officer' },
    { order: 5, key: 'finance_review', label: 'Financial Review', role: 'finance_officer' },
    { order: 6, key: 'disbursement', label: 'Disbursement', role: 'finance_officer' }
  ];

  var REVIEWER_BY_ROLE = { principal_manager: 6, agm: 7, gm: 8, ld_officer: 2, finance_officer: 3 };

  var STAGE_FOR_STATUS = {
    draft: 0,
    submitted: 1,
    pending_principal_manager: 1,
    pending_agm: 2,
    pending_gm: 3,
    pending_learning_development: 4,
    pending_financial_review: 5,
    financially_approved: 6,
    pending_disbursement: 6,
    disbursed: 6,
    partially_disbursed: 6,
    completed: 7,
    rejected: 3,
    returned_for_correction: 2
  };

  function narrative(p) {
    return {
      objectives: 'Equip the participant with current, practical skills in ' + p[0].toLowerCase() +
        ', aligned to the department\u2019s mandate and the organisation\u2019s capability development plan.',
      skills: ['Technical proficiency', 'Regulatory awareness', 'Problem solving', 'Stakeholder communication', 'Reporting'],
      relevance: 'Directly supports ongoing responsibilities and improves delivery quality within the department.',
      benefits: 'Improved service delivery, reduced external consultancy spend and stronger internal capability.',
      funding: 'Funding is requested in line with the approved training policy and the departmental budget provision for the year.',
      sharing: 'On return, the participant will deliver a knowledge-sharing session and produce a written report with recommendations.'
    };
  }

  function splitCosts(total) {
    var parts = [
      ['registration_tuition', 0.50],
      ['transportation', 0.15],
      ['accommodation', 0.20],
      ['daily_allowance', 0.10],
      ['other', 0.05]
    ];
    return parts.map(function (p) {
      return { item_type: p[0], amount: money(total * p[1]), currency: 'NGN', description: null };
    });
  }

  function buildDocuments(app, user) {
    var docs = [
      ['invitation_letter', 'Invitation_Letter.pdf'],
      ['programme_brochure', 'Programme_Brochure.pdf'],
      ['provider_quotation', 'Provider_Quotation.pdf'],
      ['cost_breakdown', 'Cost_Breakdown.xlsx']
    ];
    return docs.map(function (d, i) {
      return {
        doc_type: d[0],
        original_file_name: d[1],
        mime_type: d[0] === 'cost_breakdown' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
        file_size_bytes: 180000 + i * 92000 + (app.id % 40) * 1000,
        scan_status: 'clean',
        uploaded_by: user.id,
        created_at: app.submitted_at
      };
    });
  }

  function buildApprovalActions(app, applicant, usersById) {
    var actions = [];
    var reviewerFor = function (stageKey) {
      var id = REVIEWER_BY_ROLE[stageKey];
      return usersById[id] ? usersById[id].name : roleLabel(stageKey);
    };
    if (app.status === 'draft') return actions;

    actions.push({
      stage_key: 'submitted', decision: 'submitted', reviewer_user_id: applicant.id,
      reviewer_name: applicant.name, reviewer_role_key: 'staff',
      comments: 'Application submitted for review.', is_visible_to_applicant: 1,
      acted_at: app.submitted_at
    });

    var target = STAGE_FOR_STATUS[app.status] || 1;
    var completedThrough = target - 1;
    if (app.status === 'financially_approved' || app.status === 'disbursed' || app.status === 'completed' || app.status === 'partially_disbursed') {
      completedThrough = 5;
    }
    if (app.status === 'rejected' || app.status === 'returned_for_correction') completedThrough = target - 1;

    var reviewStageKeys = ['principal_manager', 'agm', 'gm', 'learning_development', 'finance_review'];
    for (var s = 1; s <= completedThrough && s <= 5; s++) {
      actions.push({
        stage_key: reviewStageKeys[s - 1],
        decision: 'approved',
        reviewer_user_id: REVIEWER_BY_ROLE[reviewStageKeys[s - 1]],
        reviewer_name: reviewerFor(reviewStageKeys[s - 1]),
        reviewer_role_key: reviewStageKeys[s - 1],
        comments: 'Reviewed and approved. Documentation is complete and the programme is relevant to the department.',
        is_visible_to_applicant: 1,
        acted_at: ago(Math.max(1, (18 - app.id + 300) % 14), 11)
      });
    }

    if (app.status === 'rejected') {
      actions.push({
        stage_key: reviewStageKeys[target - 1] || 'gm', decision: 'rejected', reviewer_user_id: 7,
        reviewer_name: reviewerFor(reviewStageKeys[target - 1] || 'gm'), reviewer_role_key: 'agm',
        comments: 'Not approved at this time \u2014 the programme does not align with current departmental priorities. Please resubmit for the next planning cycle.',
        is_visible_to_applicant: 1, acted_at: ago(2, 14)
      });
    } else if (app.status === 'returned_for_correction') {
      actions.push({
        stage_key: reviewStageKeys[target - 1] || 'agm', decision: 'returned', reviewer_user_id: 6,
        reviewer_name: reviewerFor(reviewStageKeys[target - 1] || 'agm'), reviewer_role_key: 'principal_manager',
        comments: 'Please attach a detailed cost breakdown and confirm the registration deadline before resubmission.',
        is_visible_to_applicant: 1, acted_at: ago(1, 15)
      });
    }
    return actions;
  }

  function buildFinancial(app) {
    var authorized = ['financially_approved', 'disbursed', 'completed', 'partially_disbursed', 'pending_disbursement'].indexOf(app.status) !== -1;
    if (!authorized) return null;
    return {
      approved_title: app.programme_title,
      approved_amount: money(app.requested_amount * 0.98),
      currency: app.currency,
      cost_centre: 'CC-' + (100 + (app.id % 60)),
      budget_reference: 'BUD/2026/' + (3000 + app.id),
      financial_status: app.status === 'disbursed' || app.status === 'completed' ? 'disbursed' : (app.status === 'partially_disbursed' ? 'partially_disbursed' : 'authorized'),
      authorized_at: ago(4, 12),
      authorized_by_name: 'Fatima Yusuf'
    };
  }

  function buildDisbursements(app, fin) {
    if (!fin) return [];
    if (app.status === 'disbursed' || app.status === 'completed') {
      var first = money(fin.approved_amount * 0.6);
      var second = fin.approved_amount - first;
      return [
        { payment_reference: 'PAY/' + app.id + '/2026-A', amount: first, payment_date: dateOnly(Date.now() - 12 * 86400000), payment_method: 'bank_transfer', status: 'completed', recorded_by_name: 'Fatima Yusuf' },
        { payment_reference: 'PAY/' + app.id + '/2026-B', amount: second, payment_date: dateOnly(Date.now() - 4 * 86400000), payment_method: 'bank_transfer', status: 'completed', recorded_by_name: 'Fatima Yusuf' }
      ];
    }
    return [];
  }

  function buildApplications() {
    var users = buildUsers();
    var usersById = {};
    users.forEach(function (u) { usersById[u.id] = u; });

    return STATUS_CYCLE.map(function (status, i) {
      var prog = programmes[i % programmes.length];
      var applicant = usersById[APPLICANT_IDS[i]];
      var id = 2024 + i;
      var cost = money(prog[6] + (i % 4) * 15000);
      var submitted = ago(16 - (i % 15), 9 + (i % 7));
      var start = dateOnly(Date.parse(ahead(25 + i * 2, 9)));
      var n = narrative(prog);

      var app = {
        id: id,
        reference_no: 'LSDS/TR/2026/' + id,
        applicant_user_id: applicant.id,
        applicant_name: applicant.name,
        applicant_designation: applicant.designation,
        applicant_email: applicant.email,
        department_id: departments.filter(function (d) { return d.code === applicant.department_code; })[0].id,
        department: applicant.department,
        department_code: applicant.department_code,
        supervisor_name: reviewerNameForDept(usersById, applicant.department_code, 'principal_manager'),
        application_type: prog[4],
        scope: prog[5],
        programme_title: prog[0],
        training_provider: prog[1],
        country: prog[2],
        venue: prog[3],
        programme_website: 'https://example.org/' + prog[0].toLowerCase().replace(/[^a-z]+/g, '-').slice(0, 30),
        start_date: start,
        end_date: addDays(start, 3 + (i % 3)),
        registration_deadline: dateOnly(Date.parse(ahead(10 + i, 9))),
        programme_objectives: n.objectives,
        skills_to_acquire: n.skills,
        relevance_to_duties: n.relevance,
        departmental_benefits: n.benefits,
        estimated_total_cost: money(cost * 1.1),
        requested_amount: cost,
        currency: 'NGN',
        funding_justification: n.funding,
        post_training_knowledge_sharing: n.sharing,
        post_training_report_plan: 'A written report with actionable recommendations will be submitted within two weeks of completion.',
        expected_organizational_benefits: n.benefits,
        status: status,
        current_stage_order: STAGE_FOR_STATUS[status] || 0,
        submitted_at: submitted,
        updated_at: ago((i % 6), 10 + (i % 5)),
        created_at: ago(18 - (i % 15), 9)
      };

      app.current_stage_key = stageKeyForStatus(status);
      app.pending_reviewer_name = pendingReviewerName(status, usersById);
      app.cost_items = splitCosts(app.requested_amount);
      app.documents = buildDocuments(app, applicant);
      app.approval_actions = buildApprovalActions({ id: id, status: status, submitted_at: submitted, requested_amount: cost, programme_title: prog[0] }, applicant, usersById);
      app.financial = buildFinancial(app);
      app.disbursements = buildDisbursements(app, app.financial);
      return app;
    });
  }

  function reviewerNameForDept(usersById, deptCode, position) {
    var d = departments.filter(function (x) { return x.code === deptCode; })[0];
    return d ? d.approvers[position] : null;
  }

  function stageKeyForStatus(status) {
    var map = {
      pending_principal_manager: 'principal_manager', pending_agm: 'agm', pending_gm: 'gm',
      pending_learning_development: 'learning_development', pending_financial_review: 'finance_review',
      financially_approved: 'disbursement', pending_disbursement: 'disbursement',
      disbursed: 'disbursement', completed: 'disbursement', submitted: 'principal_manager'
    };
    return map[status] || null;
  }

  function pendingReviewerName(status, usersById) {
    var key = stageKeyForStatus(status);
    if (!key) return null;
    var id = REVIEWER_BY_ROLE[key];
    return usersById[id] ? usersById[id].name : null;
  }

  function buildRoles(users) {
    return roleDefs.map(function (r, i) {
      return {
        id: i + 1, role_key: r[0], role_name: r[1], description: r[2], is_active: true,
        users_count: users.filter(function (u) { return u.roles.indexOf(r[0]) !== -1; }).length
      };
    });
  }

  /* --- Knowledge sharing sessions ---------------------------------------- */
  /* [title, topic, presenter, deptCode, status, dayOffset, start, end, mode,
   *  max, registered, attended, avgRating, feedbackCount] */
  var sessionDefs = [
    ['Zero Trust Network Architecture', 'Network security', 'Bala Suleiman', 'ICT', 'published', 3, '10:00', '12:00', 'Hybrid', 50, 42, 0, 0, 0],
    ['New Public Procurement Guidelines', 'Procurement policy', 'Yusuf Garba', 'PRC', 'published', 6, '14:00', '16:00', 'Online', 100, 88, 0, 0, 0],
    ['Incident Response Tabletop Exercise', 'Cyber incident response', 'Emeka Nwosu', 'AUD', 'published', 9, '09:30', '12:30', 'In-person', 25, 19, 0, 0, 0],
    ['Records Management & Data Protection', 'Information governance', 'Grace Adamu', 'HRM', 'published', 14, '11:00', '12:30', 'Online', 60, 61, 0, 0, 0],
    ['Customer Service Excellence', 'Service delivery', 'Kemi Olawale', 'OPS', 'draft', 20, '13:00', '15:00', 'Hybrid', 40, 12, 0, 0, 0],
    ['Data Analytics with Power BI', 'Business intelligence', 'Tunde Bakare', 'ICT', 'completed', -12, '10:00', '13:00', 'Hybrid', 45, 45, 41, 4.7, 30],
    ['Leadership and Change Management', 'Leadership development', 'Chinedu Okafor', 'HRM', 'completed', -25, '09:00', '16:00', 'In-person', 30, 30, 28, 4.5, 24],
    ['Cybersecurity Awareness for Executives', 'Executive briefing', 'Emeka Nwosu', 'AUD', 'completed', -40, '14:00', '16:00', 'Online', 80, 74, 70, 4.3, 51],
    ['Public Financial Management and Modelling', 'Financial modelling', 'Fatima Yusuf', 'FIN', 'postponed', -5, '10:00', '12:00', 'Hybrid', 35, 22, 0, 0, 0],
    ['Cloud Infrastructure with AWS', 'Cloud computing', 'Bala Suleiman', 'ICT', 'cancelled', -8, '09:00', '17:00', 'Online', 40, 8, 0, 0, 0]
  ];

  function buildSessions(users) {
    var ids = {};
    users.forEach(function (u) { ids[u.name] = u.id; });
    return sessionDefs.map(function (d, i) {
      var max = d[9], registered = d[10], attended = d[11];
      var date = dateOnly(Date.now() + d[5] * 86400000);
      var online = d[8] !== 'In-person';
      return {
        id: 501 + i,
        title: d[0],
        topic: d[1],
        description: d[0] + ' \u2014 a knowledge sharing session delivered by ' + d[2] +
          ', covering ' + d[1].toLowerCase() + ' and its practical application within the organisation.',
        session_date: date,
        start_time: d[6],
        end_time: d[7],
        mode: d[8],
        venue: online ? null : 'Auditorium, Block C (2nd Floor)',
        online_meeting_url: online ? 'https://meet.example.org/lsds/' + (501 + i) : null,
        presenter_name: d[2],
        presenter_user_id: ids[d[2]] || null,
        organizing_department: dept(d[3]),
        department_code: d[3],
        target_audience: d[3] === 'ICT' ? 'ICT Directorate' : 'All Staff',
        registration_deadline: dateOnly(Date.parse(date) - 2 * 86400000),
        max_attendance: max,
        registered: registered,
        attended: attended,
        avg_rating: d[12],
        feedback_count: d[13],
        fill_pct: max ? Math.round((registered / max) * 100) : 0,
        status: d[4],
        created_by: 2,
        published_at: d[4] === 'draft' ? null : ago(12 - (i % 6), 9),
        created_at: ago(30 - i, 10),
        updated_at: ago(i % 5, 11)
      };
    });
  }

  /* --- Derived ledger collections ---------------------------------------- */
  function buildFinancialRecords(applications) {
    return applications.filter(function (a) { return a.financial; }).map(function (a, i) {
      var disbursed = (a.disbursements || []).reduce(function (s, d) { return s + d.amount; }, 0);
      return {
        id: 900 + i,
        application_id: a.id,
        reference_no: a.reference_no,
        applicant_name: a.applicant_name,
        department: a.department,
        department_code: a.department_code,
        programme_title: a.programme_title,
        approved_title: a.financial.approved_title,
        approved_amount: a.financial.approved_amount,
        currency: a.financial.currency,
        cost_centre: a.financial.cost_centre,
        budget_reference: a.financial.budget_reference,
        financial_status: a.financial.financial_status,
        authorized_at: a.financial.authorized_at,
        authorized_by_name: a.financial.authorized_by_name,
        disbursed_total: disbursed,
        outstanding: a.financial.approved_amount - disbursed,
        created_at: a.financial.authorized_at,
        updated_at: a.updated_at
      };
    });
  }

  function buildDisbursementList(applications) {
    var list = [], n = 0;
    applications.forEach(function (a) {
      (a.disbursements || []).forEach(function (d) {
        n++;
        list.push({
          id: 1200 + n,
          application_id: a.id,
          reference_no: a.reference_no,
          applicant_name: a.applicant_name,
          department: a.department,
          programme_title: a.programme_title,
          payment_reference: d.payment_reference,
          amount: d.amount,
          payment_date: d.payment_date,
          payment_method: d.payment_method,
          status: d.status,
          recorded_by_name: d.recorded_by_name
        });
      });
    });
    return list.sort(function (x, y) { return new Date(y.payment_date) - new Date(x.payment_date); });
  }

  /* --- Knowledge repository: categories, tags, documents, videos ---------- */
  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function nameId(users) { var m = {}; users.forEach(function (u) { m[u.name] = u.id; }); return m; }
  function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString(); }
  function mimeFor(ext) {
    return ext === 'pdf' ? 'application/pdf'
      : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/octet-stream';
  }

  var categoryDefs = [
    ['HR Policies', 'Human resources policies and guidelines', 'document'],
    ['ICT Procedures', 'ICT operational procedures and standards', 'document'],
    ['Finance Guidelines', 'Financial management and procurement guidance', 'document'],
    ['Training Reports', 'Post-training and completion reports', 'document'],
    ['Compliance', 'Regulatory and compliance references', 'document'],
    ['Security Awareness', 'Information security learning content', 'video'],
    ['Leadership Talks', 'Recorded leadership and management sessions', 'video'],
    ['Systems Tutorials', 'How-to tutorials for internal systems', 'video'],
    ['Training & Development', 'Training opportunities and applications', 'any'],
    ['Technical Help', 'Peer support for technical issues', 'any'],
    ['Knowledge Sharing', 'Insights from training and conferences', 'any'],
    ['Announcements', 'Official forum announcements', 'any']
  ];
  var tagDefs = [
    ['Policy', 'policy'], ['Procedure', 'procedure'], ['Security', 'security'], ['Onboarding', 'onboarding'],
    ['Compliance', 'compliance'], ['Records', 'records'], ['Finance', 'finance'], ['Leadership', 'leadership'],
    ['Tutorial', 'tutorial'], ['Conference', 'conference'], ['ICT', 'ict'], ['HR', 'hr']
  ];

  function buildCategories() {
    return categoryDefs.map(function (c, i) {
      return { id: i + 1, name: c[0], slug: slugify(c[0]), description: c[1], entity_type: c[2], is_active: true };
    });
  }
  function buildTags() {
    return tagDefs.map(function (t, i) { return { id: i + 1, name: t[0], slug: t[1] }; });
  }
  function catBySlug(cats, slug) {
    for (var i = 0; i < cats.length; i++) if (cats[i].slug === slug) return cats[i];
    return null;
  }

  /* Documents:
   * [title, category, dept, owner, access, status, version, sizeKB, ext,
   *  createdDaysAgo, reviewDueDays|null, expiryDays|null, tags[]] */
  var documentDefs = [
    ['Staff Training Policy 2026', 'HR Policies', 'HRM', 'Ibrahim Sani', 'internal', 'published', 3, 420, 'pdf', 40, null, 300, ['policy', 'hr']],
    ['National Training Application Procedure', 'HR Policies', 'HRM', 'Chinedu Okafor', 'internal', 'published', 2, 215, 'pdf', 35, null, 240, ['procedure', 'hr']],
    ['Information Security Standard', 'ICT Procedures', 'ICT', 'Bala Suleiman', 'restricted', 'published', 4, 560, 'pdf', 28, null, 180, ['security', 'ict']],
    ['Public Procurement Guidelines 2026', 'Finance Guidelines', 'PRC', 'Yusuf Garba', 'internal', 'published', 1, 685, 'pdf', 22, null, 365, ['procedure', 'finance']],
    ['Records Retention Schedule', 'Compliance', 'HRM', 'Grace Adamu', 'internal', 'published', 2, 340, 'pdf', 18, null, 500, ['records', 'compliance']],
    ['Post-Training Report Template', 'Training Reports', 'HRM', 'Chinedu Okafor', 'internal', 'published', 1, 96, 'docx', 60, null, null, ['records']],
    ['Disbursement and Payment Procedure', 'Finance Guidelines', 'FIN', 'Fatima Yusuf', 'restricted', 'published', 2, 305, 'pdf', 16, null, 300, ['finance', 'procedure']],
    ['ICT Acceptable Use Policy', 'ICT Procedures', 'ICT', 'Bala Suleiman', 'internal', 'published', 1, 248, 'pdf', 50, null, 365, ['ict', 'policy']],
    ['Business Continuity Plan', 'Compliance', 'AUD', 'Emeka Nwosu', 'confidential', 'under_review', 1, 720, 'pdf', 9, 6, null, ['compliance']],
    ['Customer Service Charter', 'Compliance', 'OPS', 'Kemi Olawale', 'internal', 'submitted_for_review', 1, 180, 'pdf', 7, 10, null, ['policy']],
    ['Records Management Handbook', 'Compliance', 'HRM', 'Grace Adamu', 'internal', 'returned', 2, 410, 'pdf', 12, 5, null, ['records']],
    ['Draft Travel Policy', 'HR Policies', 'HRM', 'Ada Eze', 'internal', 'draft', 1, 150, 'docx', 5, null, null, ['policy']]
  ];

  function buildDocumentLibrary(users, cats, tags) {
    var uid = nameId(users);
    var tagByName = {};
    tags.forEach(function (t) { tagByName[t.slug] = t.name; });
    return documentDefs.map(function (d, i) {
      var cat = catBySlug(cats, slugify(d[1]));
      var status = d[5], reviewed = ['published', 'approved', 'archived', 'superseded', 'returned'].indexOf(status) !== -1;
      var base = d[0].replace(/[^A-Za-z0-9]+/g, '_');
      return {
        id: 1300 + i,
        title: d[0],
        description: d[0] + ' \u2014 maintained under ' + (cat ? cat.name : 'general') + '.',
        category: cat ? cat.name : null, category_id: cat ? cat.id : null,
        department: dept(d[2]), department_code: d[2],
        owner_user_id: uid[d[3]] || null, owner_name: d[3],
        file_name: base + '.' + d[8],
        stored_file_name: base + '_v' + d[6] + '.' + d[8],
        mime_type: mimeFor(d[8]),
        file_size_bytes: d[7] * 1024,
        current_version_no: d[6],
        access_classification: d[4],
        review_status: status,
        tags: (d[12] || []).map(function (s) { return tagByName[s] || s; }),
        published_at: status === 'published' ? ago(Math.max(1, d[9] - 2), 9) : null,
        submitted_at: d[9] != null && reviewed ? ago(d[9], 10) : null,
        reviewed_by_name: reviewed ? 'Chinedu Okafor' : null,
        reviewed_at: reviewed ? ago(Math.max(1, d[9] - 1), 12) : null,
        review_comments: status === 'returned'
          ? 'Please update the retention period in section 4 and resubmit.'
          : (reviewed ? 'Reviewed and approved for publication.' : null),
        review_due_date: d[10] != null ? dateOnly(Date.now() + d[10] * 86400000) : null,
        expiry_date: d[11] != null ? dateOnly(Date.now() + d[11] * 86400000) : null,
        created_at: ago(d[9], 10),
        updated_at: ago(Math.min(d[9], i % 6), 11)
      };
    });
  }

  /* Videos:
   * [title, category, dept, uploader, review_status, upload_status, durationSec,
   *  views, createdDaysAgo, access, tags[]] */
  var videoDefs = [
    ['Understanding the Training Approval Workflow', 'Leadership Talks', 'HRM', 'Chinedu Okafor', 'published', 'ready', 824, 412, 20, 'internal', ['tutorial']],
    ['Information Security Awareness', 'Security Awareness', 'ICT', 'Bala Suleiman', 'published', 'ready', 1260, 935, 33, 'internal', ['security']],
    ['Power BI Essentials for Reporting', 'Systems Tutorials', 'ICT', 'Tunde Bakare', 'published', 'ready', 1845, 677, 15, 'internal', ['tutorial']],
    ['Leadership Conversations: Change Management', 'Leadership Talks', 'HRM', 'Ibrahim Sani', 'published', 'ready', 2410, 523, 28, 'internal', ['leadership']],
    ['Records Management and Data Protection', 'Security Awareness', 'HRM', 'Grace Adamu', 'published', 'ready', 1520, 388, 10, 'internal', ['records']],
    ['Incident Response Walkthrough', 'Systems Tutorials', 'AUD', 'Emeka Nwosu', 'pending_review', 'ready', 1130, 54, 4, 'restricted', ['security']],
    ['New Employee Onboarding', 'Systems Tutorials', 'HRM', 'Grace Adamu', 'draft', 'processing', 0, 12, 2, 'internal', ['onboarding']],
    ['Legacy Portal Usage (Archived)', 'Systems Tutorials', 'ICT', 'Tunde Bakare', 'archived', 'ready', 960, 204, 180, 'internal', ['tutorial']]
  ];

  function buildVideoLibrary(users, cats, tags) {
    var uid = nameId(users);
    var tagByName = {};
    tags.forEach(function (t) { tagByName[t.slug] = t.name; });
    return videoDefs.map(function (v, i) {
      var cat = catBySlug(cats, slugify(v[1]));
      var base = slugify(v[0]);
      return {
        id: 1500 + i,
        title: v[0],
        description: v[0] + ' \u2014 recorded session available for on-demand viewing.',
        category: cat ? cat.name : null, category_id: cat ? cat.id : null,
        department: dept(v[2]), department_code: v[2],
        uploaded_by: uid[v[3]] || null, uploader_name: v[3],
        language: 'English',
        duration_seconds: v[6],
        views_count: v[7],
        upload_status: v[5],
        review_status: v[4],
        access_classification: v[9],
        tags: (v[10] || []).map(function (s) { return tagByName[s] || s; }),
        file_name: base + '.mp4',
        stored_file_name: base + '.mp4',
        mime_type: 'video/mp4',
        file_size_bytes: v[6] * 220000,
        published_at: v[4] === 'published' ? ago(Math.max(1, v[8] - 1), 9) : null,
        created_at: ago(v[8], 10),
        updated_at: ago(Math.min(v[8], i % 5), 11)
      };
    });
  }

  /* --- Discussion forum ---------------------------------------------------- */
  /* [title, category, author, dept, status, pinned, views, createdDaysAgo, replies[author, body, accepted, hoursAgo]] */
  var discussionDefs = [
    ['Best practices for the new training approval workflow', 'Training & Development', 'Chinedu Okafor', 'HRM', 'open', true, 182, 6, [
      ['Hauwa Mohammed', 'The Principal Manager step now needs a completed cost breakdown before the application moves on.', false, 120],
      ['Fatima Yusuf', 'Finance review is much faster when the provider quotation is attached up front.', true, 96],
      ['Tunde Bakare', 'Thanks both \u2014 that matches what I experienced this week.', false, 48]
    ]],
    ['Cloud certifications: is AWS still worth it in 2026?', 'Training & Development', 'Tunde Bakare', 'ICT', 'open', false, 143, 4, [
      ['Bala Suleiman', 'For our infrastructure roadmap, cloud skills remain a priority. Attach the roadmap to the request.', false, 70],
      ['Emeka Nwosu', 'From an audit angle, keep the provider quotation and syllabus for evidence.', false, 30]
    ]],
    ['Issue: cannot attach documents over 5MB', 'Technical Help', 'Ngozi Adeyemi', 'OPS', 'open', false, 96, 2, [
      ['Bala Suleiman', 'Please compress the PDF and retry, or raise a support ticket with the file attached to email.', false, 20]
    ]],
    ['Summary of the CISSP programme (October cohort)', 'Knowledge Sharing', 'Tunde Bakare', 'ICT', 'open', false, 210, 9, [
      ['Hauwa Mohammed', 'Excellent write-up. Please deliver a short session for the team.', false, 100],
      ['Grace Adamu', 'Could you also share the study checklist?', false, 40]
    ]],
    ['How do I request a new Oracle account?', 'Technical Help', 'Paul Okonkwo', 'OPS', 'open', false, 64, 1, [
      ['Bala Suleiman', 'Raise a ticket under "Account Access" and your line manager will approve it.', true, 10]
    ]],
    ['Reminder: knowledge sharing sessions move to the Auditorium', 'Announcements', 'Chinedu Okafor', 'HRM', 'open', true, 320, 12, []],
    ['Procurement guidelines update \u2014 what changed', 'Training & Development', 'Yusuf Garba', 'PRC', 'locked', false, 118, 7, [
      ['Ibrahim Sani', 'Thread locked: the updated guidelines are published in the Knowledge Repository.', false, 60]
    ]],
    ['Old forum post about the 2024 budget', 'Knowledge Sharing', 'Emeka Nwosu', 'AUD', 'archived', false, 42, 120, []]
  ];

  function buildForumThreads(users, cats) {
    var uid = nameId(users);
    var replyIdSeq = 3000;
    return discussionDefs.map(function (d, i) {
      var cat = catBySlug(cats, slugify(d[1]));
      var created = ago(d[7], 9);
      var replies = (d[8] || []).map(function (r) {
        replyIdSeq++;
        return {
          id: replyIdSeq, user_id: uid[r[0]] || null, author_name: r[0],
          body: r[1], is_accepted_answer: r[2] ? 1 : 0, status: 'visible', created_at: hoursAgo(r[3])
        };
      });
      var accepted = replies.filter(function (r) { return r.is_accepted_answer; })[0];
      var lastActivity = replies.length ? replies[replies.length - 1].created_at : created;
      return {
        id: 1700 + i,
        title: d[0], body: d[0] + '. Share your thoughts, questions and experience with colleagues.',
        author_user_id: uid[d[2]] || null, author_name: d[2],
        category: cat ? cat.name : d[1], category_id: cat ? cat.id : null,
        department: dept(d[3]), department_code: d[3],
        is_pinned: d[5] ? 1 : 0,
        status: d[4],
        reply_count: replies.length,
        view_count: d[6],
        accepted_reply_id: accepted ? accepted.id : null,
        last_activity_at: lastActivity,
        created_at: created,
        updated_at: lastActivity,
        replies: replies
      };
    });
  }

  /* --- Support tickets ----------------------------------------------------- */
  /* [subject, requester, dept, category, priority, status, assignee, createdDaysAgo, description, resolution, comments[author, body, internal, hoursAgo]] */
  var ticketDefs = [
    ['Laptop will not boot after update', 'Ngozi Adeyemi', 'OPS', 'hardware', 'high', 'in_progress', 'Bala Suleiman', 3,
      'The laptop shows a black screen after the latest Windows update and will not reach the login screen.', null, [
      ['Bala Suleiman', 'Attempting a recovery from the most recent restore point. Will update once verified.', true, 40],
      ['Ngozi Adeyemi', 'Thank you \u2014 please let me know if I should bring it in.', false, 30]
    ]],
    ['Cannot access shared drive', 'Yusuf Garba', 'PRC', 'network', 'medium', 'assigned', 'Bala Suleiman', 2,
      'The Finance shared drive appears offline and mapped folders are missing.', null, [
      ['Bala Suleiman', 'Checking the file server health and your group membership.', true, 18]
    ]],
    ['Password reset for Oracle', 'Paul Okonkwo', 'OPS', 'account_access', 'medium', 'resolved', 'Bala Suleiman', 8,
      'Locked out of the account after too many failed attempts.', 'Password reset and MFA re-enrolled. Access verified with the user.', [
      ['Bala Suleiman', 'Reset completed. Please enrol MFA on first login.', false, 100]
    ]],
    ['Projector in Auditorium not projecting', 'Blessing Ojo', 'COM', 'conference_equipment', 'high', 'open', null, 1,
      'The HDMI signal from the podium is not detected by the projector.', null, []],
    ['Excel closes unexpectedly', 'Kemi Olawale', 'OPS', 'software', 'low', 'pending_user_response', 'Bala Suleiman', 5,
      'Excel crashes when opening large files.', null, [
      ['Bala Suleiman', 'Please confirm the exact file and whether it happens on other machines.', true, 22]
    ]],
    ['Printer shows offline on 3rd floor', 'Grace Adamu', 'HRM', 'printing', 'low', 'closed', 'Bala Suleiman', 14,
      'The 3rd floor printer shows offline for all users.', 'Replaced the network cable and restarted the print spooler.', [
      ['Bala Suleiman', 'Resolved \u2014 printer is back online.', false, 200]
    ]],
    ['Email not syncing on mobile', 'Amina Grema', 'LEG', 'email', 'medium', 'in_progress', 'Bala Suleiman', 4,
      'Emails since yesterday are not appearing on the phone.', null, [
      ['Bala Suleiman', 'Re-checking the mobile device policy assignment.', true, 14]
    ]],
    ['VPN disconnects frequently', 'Tunde Bakare', 'ICT', 'network', 'high', 'assigned', 'Bala Suleiman', 2,
      'VPN drops every few minutes when working from home.', null, [
      ['Bala Suleiman', 'Collecting logs to identify the disconnection pattern.', true, 10]
    ]],
    ['Software installation request: Visio', 'Ada Eze', 'HRM', 'software', 'low', 'open', null, 6,
      'Requesting Microsoft Visio for process mapping work.', null, []],
    ['Account access for new staff', 'Blessing Ojo', 'COM', 'account_access', 'medium', 'resolved', 'Bala Suleiman', 10,
      'A new staff member needs system accounts provisioned.', 'Accounts created and credentials shared securely.', [
      ['Bala Suleiman', 'All requested accounts have been created.', false, 150]
    ]]
  ];

  function buildTicketList(users) {
    var uid = nameId(users);
    var seq = 400;
    return ticketDefs.map(function (t, i) {
      seq += 3;
      var status = t[5];
      var resolved = status === 'resolved' || status === 'closed';
      var commentSeq = 5000;
      var comments = (t[10] || []).map(function (c) {
        commentSeq++;
        return { id: commentSeq, user_id: uid[c[0]] || null, author_name: c[0], comment: c[1], is_internal: c[2] ? 1 : 0, created_at: hoursAgo(c[3]) };
      });
      return {
        id: 1900 + i,
        reference_no: 'TK-2026-0' + (400 + i),
        user_id: uid[t[1]] || null, requester_name: t[1],
        department: dept(t[2]), department_code: t[2],
        subject: t[0],
        issue_category: t[3],
        problem_description: t[8],
        priority: t[4],
        assigned_to: t[6] ? (uid[t[6]] || null) : null, assignee_name: t[6] || null,
        status: status,
        resolution_notes: t[9],
        resolved_at: resolved ? ago(Math.max(1, t[7] - 1), 15) : null,
        closed_at: status === 'closed' ? ago(Math.max(1, t[7] - 1), 16) : null,
        comments: comments,
        created_at: ago(t[7], 9),
        updated_at: ago(i % Math.max(1, t[7]), 11)
      };
    });
  }

  /* --- E-Learning courses -------------------------------------------------- */
  /* [code, title, category, dept, instructor, difficulty, hours, status, enrolled, completed] */
  var courseDefs = [
    ['CSE-101', 'Information Security Awareness', 'Security Awareness', 'ICT', 'Bala Suleiman', 'beginner', 2.5, 'published', 148, 132],
    ['CSE-102', 'Data Protection and Records Management', 'Compliance', 'HRM', 'Grace Adamu', 'beginner', 3, 'published', 96, 71],
    ['CSE-201', 'Leadership and Change Management', 'Leadership Talks', 'HRM', 'Ibrahim Sani', 'intermediate', 6, 'published', 54, 38],
    ['CSE-202', 'Power BI for Reporting', 'Systems Tutorials', 'ICT', 'Tunde Bakare', 'intermediate', 5, 'published', 42, 29],
    ['CSE-301', 'Public Procurement Essentials', 'Finance Guidelines', 'PRC', 'Yusuf Garba', 'beginner', 4, 'published', 63, 50],
    ['CSE-302', 'Public Financial Management', 'Finance Guidelines', 'FIN', 'Fatima Yusuf', 'advanced', 8, 'draft', 0, 0],
    ['CSE-401', 'Zero Trust Network Fundamentals', 'Systems Tutorials', 'ICT', 'Bala Suleiman', 'advanced', 7, 'published', 21, 9],
    ['CSE-402', 'Occupational Health and Safety', 'Compliance', 'OPS', 'Kemi Olawale', 'beginner', 3, 'archived', 88, 80]
  ];

  function buildCourseModules(course, i) {
    var titles = ['Introduction and objectives', 'Core concepts', 'Practical application', 'Case studies', 'Assessment and next steps'];
    var count = 3 + (i % 3);
    var mods = [];
    for (var m = 0; m < count; m++) {
      mods.push({
        id: course.id * 100 + m + 1,
        position: m + 1,
        title: titles[m] || ('Module ' + (m + 1)),
        description: 'Module ' + (m + 1) + ' of ' + course.title + '.',
        estimated_minutes: 20 + ((i + m) * 7) % 45,
        is_mandatory: m < Math.max(2, count - 1) ? 1 : 0
      });
    }
    return mods;
  }

  function buildCourseCatalog(users, cats) {
    var uid = nameId(users);
    var catByName = {};
    cats.forEach(function (c) { catByName[c.name] = c; });
    return courseDefs.map(function (c, i) {
      var cat = catByName[c[2]];
      var total = c[8];
      var completed = c[9];
      var inProgress = total ? Math.round((total - completed) * 0.6) : 0;
      var enrolled = Math.max(0, total - completed - inProgress);
      var course = {
        id: 2100 + i,
        code: c[0],
        title: c[1],
        description: c[1] + ' \u2014 a self-paced e-learning course for staff development.',
        category: cat ? cat.name : c[2],
        category_id: cat ? cat.id : null,
        department: dept(c[3]),
        department_code: c[3],
        instructor_user_id: uid[c[4]] || null,
        instructor_name: c[4],
        difficulty_level: c[5],
        estimated_hours: c[6],
        status: c[7],
        created_at: ago(120 - i * 5, 10),
        updated_at: ago(20 - (i % 15), 11)
      };
      course.modules = buildCourseModules(course, i);
      course.enrollment_summary = {
        total: total, enrolled: enrolled, in_progress: inProgress,
        completed: completed, completion_rate: total ? Math.round((completed / total) * 100) : 0
      };
      return course;
    });
  }

  /* --- Meetings ------------------------------------------------------------ */
  /* [title, host, dept, dayOffset, hour, durationMin, provider, status, access, recordingEnabled, participantCount] */
  var meetingDefs = [
    ['Q4 Training Committee Review', 'Chinedu Okafor', 'HRM', 1, 10, 60, 'teams', 'scheduled', 'invite_only', 1, 8],
    ['Cybersecurity Awareness Briefing', 'Bala Suleiman', 'ICT', 0, 14, 45, 'jitsi', 'live', 'department', 1, 15],
    ['Finance and Disbursement Sync', 'Fatima Yusuf', 'FIN', -1, 9, 30, 'zoom', 'ended', 'invite_only', 1, 6],
    ['New Staff Orientation', 'Grace Adamu', 'HRM', 3, 11, 90, 'teams', 'scheduled', 'public', 0, 20],
    ['Procurement Policy Walkthrough', 'Yusuf Garba', 'PRC', 2, 13, 60, 'jitsi', 'scheduled', 'department', 1, 10],
    ['Audit Findings Debrief', 'Emeka Nwosu', 'AUD', -3, 15, 60, 'teams', 'ended', 'invite_only', 1, 5],
    ['Records Digitisation Planning', 'Grace Adamu', 'HRM', -7, 10, 45, 'zoom', 'ended', 'invite_only', 0, 7],
    ['Leadership Town Hall', 'Ibrahim Sani', 'HRM', 5, 9, 120, 'teams', 'scheduled', 'public', 1, 40],
    ['Legacy System Migration (cancelled)', 'Tunde Bakare', 'ICT', -2, 16, 60, 'other', 'cancelled', 'invite_only', 0, 9]
  ];

  function buildMeetings(users) {
    var uid = nameId(users);
    var week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    return meetingDefs.map(function (m, i) {
      var start = ahead(m[3], m[4]);
      var attendees = [];
      for (var a = 0; a < m[10] && a < users.length; a++) {
        var u = users[(i * 3 + a + 1) % users.length];
        var role = u.name === m[1] ? 'host' : (u.roles.indexOf('ld_officer') !== -1 ? 'moderator' : 'participant');
        attendees.push({
          user_id: u.id, name: u.name, designation: u.designation, department: u.department,
          participant_role: role,
          invite_status: m[7] === 'ended' ? 'accepted' : (a % 5 === 0 ? 'invited' : a % 7 === 0 ? 'declined' : 'accepted'),
          attendance_seconds: m[7] === 'ended' ? 600 + (a * 137) % 3000 : 0
        });
      }
      var meeting = {
        id: 2300 + i,
        title: m[0],
        description: m[0] + ' \u2014 virtual meeting for the ' + dept(m[2]) + ' team.',
        agenda: '1. Welcome and introductions\n2. ' + m[0] + '\n3. Discussion\n4. Action points and close',
        host_user_id: uid[m[1]] || null,
        host_name: m[1],
        department: dept(m[2]),
        department_code: m[2],
        start_at: start,
        duration_minutes: m[5],
        provider: m[6],
        meeting_url: 'https://meet.lsds.gov.ng/' + m[6] + '/' + (1000 + i),
        access_code: m[8] === 'invite_only' ? 'LSDS' + (300 + i) : null,
        access_restriction: m[8],
        recording_enabled: m[9] ? 1 : 0,
        status: m[7],
        ended_at: m[7] === 'ended' ? ahead(m[3], m[4] + Math.ceil(m[5] / 60)) : null,
        participants: attendees,
        participant_count: attendees.length,
        created_at: ago(Math.abs(m[3]) + 5 + i, 10),
        updated_at: ago(1 + (i % 4), 11)
      };
      meeting.recordings = [];
      if (m[9] && m[7] === 'ended') {
        meeting.recordings.push({
          id: meeting.id * 10 + 1, title: m[0] + ' \u2014 Recording',
          duration_seconds: m[5] * 60, file_size_bytes: m[5] * 60 * 180000,
          recording_status: 'ready', consent_obtained: 1, uploaded_by_name: m[1],
          created_at: meeting.ended_at
        });
      } else if (m[9] && m[7] === 'live') {
        meeting.recordings.push({
          id: meeting.id * 10 + 1, title: m[0] + ' \u2014 Recording',
          duration_seconds: null, file_size_bytes: null,
          recording_status: 'processing', consent_obtained: 1, uploaded_by_name: m[1],
          created_at: start
        });
      }
      return meeting;
    });
  }

  /* --- Approval workflow configuration ------------------------------------- */
  var workflowDefs = [
    [0, 'submitted', 'Submitted', 'staff', 'department', 0, 0, 'Application is captured and awaits departmental review.'],
    [1, 'principal_manager', 'Principal Manager Review', 'principal_manager', 'department', 1, 1, 'First-line departmental review of relevance and eligibility.'],
    [2, 'agm', 'Assistant General Manager Review', 'agm', 'department', 1, 1, 'Second departmental review; endorses or returns the request.'],
    [3, 'gm', 'General Manager Review', 'gm', 'department', 1, 1, 'Final departmental approval before forwarding to L&D.'],
    [4, 'learning_development', 'Learning and Development Review', 'ld_officer', 'organization', 1, 1, 'Evaluates programme fit, policy compliance and knowledge-sharing plans.'],
    [5, 'finance_review', 'Financial Review', 'finance_officer', 'organization', 1, 1, 'Confirms budget availability and authorizes funding.'],
    [6, 'disbursement', 'Disbursement', 'finance_officer', 'organization', 1, 1, 'Records payment and closes the financial leg of the workflow.']
  ];

  function buildWorkflow(users) {
    var uid = nameId(users);
    var steps = workflowDefs.map(function (w) {
      return {
        stage_order: w[0], stage_key: w[1], stage_label: w[2], required_role_key: w[3],
        role_label: roleLabel(w[3]), scope: w[4], is_mandatory: w[5] ? 1 : 0,
        allow_delegate: w[6] ? 1 : 0, is_active: 1, description: w[7]
      };
    });
    var approvers = [];
    var positions = [['principal_manager', 'Principal Manager'], ['agm', 'Assistant General Manager'], ['gm', 'General Manager']];
    departments.forEach(function (d) {
      positions.forEach(function (p, pi) {
        var name = d.approvers[p[0]];
        approvers.push({
          id: d.id * 10 + pi,
          department: d.name, department_code: d.code,
          position: p[0], position_label: p[1],
          user_id: uid[name] || null, approver_name: name,
          is_active: !(d.code === 'COM' && pi === 1),
          start_date: dateOnly(Date.now() - (200 - pi * 15) * 86400000),
          notes: pi === 2 ? 'Organisation-wide role.' : null
        });
      });
    });
    var delegations = [
      { id: 1, delegator_name: 'Ibrahim Sani', delegate_name: 'Segun Alabi', department: dept('HRM'), department_code: 'HRM', position: 'gm', start_at: ago(3, 8), end_at: ahead(4, 18), reason: 'Annual leave cover.', status: 'active' },
      { id: 2, delegator_name: 'Fatima Yusuf', delegate_name: 'Chinedu Okafor', department: dept('FIN'), department_code: 'FIN', position: 'finance', start_at: ago(10, 8), end_at: ago(2, 18), reason: 'Official travel.', status: 'expired' },
      { id: 3, delegator_name: 'Hauwa Mohammed', delegate_name: 'Kemi Olawale', department: dept('ICT'), department_code: 'ICT', position: 'principal_manager', start_at: ahead(2, 8), end_at: ahead(9, 18), reason: 'Conference attendance.', status: 'pending' }
    ];
    return { steps: steps, approvers: approvers, delegations: delegations };
  }

  /* --- System settings ----------------------------------------------------- */
  /* [key, value, type, description, group] */
  var settingDefs = [
    ['organization_name', 'Corporate Services Group', 'string', 'Displayed across the portal and in emails.', 'General'],
    ['organisation_short_name', 'CSG', 'string', 'Short name used in references and badges.', 'General'],
    ['support_email', 'support@lsds.gov.ng', 'string', 'Sender address for system notifications.', 'General'],
    ['default_currency', 'NGN', 'string', 'Currency used for all training costs.', 'General'],
    ['application_reference_prefix', 'LSDS/TR', 'string', 'Prefix for generated application references.', 'Applications'],
    ['max_attachment_size_mb', '10', 'integer', 'Maximum upload size for a single document (MB).', 'Applications'],
    ['auto_assign_supervisor', 'true', 'boolean', 'Assign the department approver automatically on submission.', 'Applications'],
    ['allow_self_application', 'true', 'boolean', 'Allow staff to submit their own training requests.', 'Applications'],
    ['notify_on_submission', 'true', 'boolean', 'Email the first approver when an application is submitted.', 'Notifications'],
    ['notify_on_decision', 'true', 'boolean', 'Email the applicant on every decision.', 'Notifications'],
    ['session_reminder_hours', '24', 'integer', 'Hours before a session to send a reminder.', 'Notifications'],
    ['password_min_length', '8', 'integer', 'Minimum password length.', 'Security'],
    ['password_require_symbol', 'true', 'boolean', 'Require at least one symbol in passwords.', 'Security'],
    ['session_timeout_minutes', '30', 'integer', 'Idle time before a user is signed out.', 'Security'],
    ['max_login_attempts', '5', 'integer', 'Failed attempts before an account is temporarily locked.', 'Security'],
    ['mfa_required_roles', '["sysadmin","finance_officer"]', 'json', 'Roles that must use multi-factor authentication.', 'Security'],
    ['document_retention_years', '5', 'integer', 'Default retention period for knowledge documents.', 'File storage'],
    ['video_retention_years', '3', 'integer', 'Default retention period for recorded videos.', 'File storage'],
    ['backup_schedule', 'daily 02:00', 'string', 'Cron-style schedule for automated backups.', 'File storage']
  ];

  function buildSettings() {
    return settingDefs.map(function (s, i) {
      return {
        id: 3001 + i, setting_key: s[0], setting_value: s[1], setting_type: s[2],
        description: s[3], setting_group: s[4], updated_at: ago(5 + (i % 30), 11)
      };
    });
  }

  /* --- Audit logs ---------------------------------------------------------- */
  var auditTemplates = [
    ['user_login', 'auth', 'Signed in to the admin portal'],
    ['application_submitted', 'training_application', 'Submitted a training application'],
    ['application_approved', 'training_application', 'Approved a training application'],
    ['application_rejected', 'training_application', 'Rejected a training application'],
    ['application_returned', 'training_application', 'Returned an application for correction'],
    ['financial_authorized', 'financial_record', 'Authorized funding for an application'],
    ['disbursement_recorded', 'disbursement', 'Recorded a training disbursement'],
    ['document_published', 'document', 'Published a knowledge document'],
    ['video_published', 'video', 'Published a video to the library'],
    ['session_published', 'knowledge_session', 'Published a knowledge sharing session'],
    ['user_created', 'user', 'Created a new user account'],
    ['user_deactivated', 'user', 'Deactivated a user account'],
    ['settings_updated', 'system_setting', 'Updated system settings'],
    ['backup_completed', 'backup', 'Completed an automated backup'],
    ['ticket_resolved', 'support_ticket', 'Resolved a support ticket'],
    ['forum_thread_locked', 'discussion', 'Locked a forum thread']
  ];
  var auditUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/130.0'
  ];

  function buildAuditLogs(users, applications) {
    var logs = [];
    for (var i = 0; i < 42; i++) {
      var t = auditTemplates[i % auditTemplates.length];
      var u = users[(i * 5 + 1) % users.length];
      var app = applications[i % applications.length];
      var desc = t[2];
      if (t[1] === 'training_application' || t[1] === 'financial_record' || t[1] === 'disbursement') {
        desc += ' (' + app.reference_no + ')';
      }
      logs.push({
        id: 4100 + i,
        user_id: u.id, user_name: u.name, user_email: u.email,
        action: t[0], entity_type: t[1], entity_id: 100 + (i % 30),
        description: desc,
        metadata: JSON.stringify({ source: 'admin_portal', index: i }),
        ip_address: '10.0.' + (i % 40 + 1) + '.' + (i * 3 % 250 + 5),
        user_agent: auditUserAgents[i % auditUserAgents.length],
        created_at: ago(i * 0.4, 8 + (i % 10))
      });
    }
    return logs;
  }

  /* --- Backups ------------------------------------------------------------- */
  /* [type, status, startedDaysAgo, durationMin, sizeMB, triggeredBy, error] */
  var backupDefs = [
    ['full', 'completed', 0, 42, 1840, 'Scheduled', null],
    ['database', 'completed', 1, 12, 320, 'Scheduled', null],
    ['documents', 'completed', 1, 18, 760, 'Aisha Bello', null],
    ['videos', 'completed', 2, 55, 2450, 'Scheduled', null],
    ['database', 'completed', 3, 11, 318, 'Scheduled', null],
    ['configuration', 'completed', 4, 3, 4, 'Aisha Bello', null],
    ['full', 'completed', 5, 40, 1810, 'Scheduled', null],
    ['database', 'failed', 6, 0, 0, 'Scheduled', 'Connection to the storage target timed out.'],
    ['documents', 'completed', 7, 17, 742, 'Scheduled', null],
    ['videos', 'completed', 8, 50, 2380, 'Scheduled', null],
    ['database', 'completed', 9, 12, 315, 'Scheduled', null],
    ['full', 'running', 0, 0, 0, 'Scheduled', null]
  ];

  function buildBackups() {
    return backupDefs.map(function (b, i) {
      var started = ago(b[2], 2);
      var finished = (b[1] === 'running' || b[1] === 'failed') ? (b[1] === 'failed' ? new Date(new Date(started).getTime() + 60000).toISOString() : null)
        : new Date(new Date(started).getTime() + b[3] * 60000).toISOString();
      return {
        id: 5001 + i,
        backup_type: b[0], status: b[1],
        started_at: started, finished_at: finished,
        duration_minutes: b[3],
        file_path: b[1] === 'failed' ? null : '/backups/lsds_' + b[0] + '_' + started.slice(0, 10).replace(/-/g, '') + '.tar.gz',
        file_size_bytes: b[4] * 1024 * 1024,
        error_message: b[6] || null,
        triggered_by_name: b[5], triggered_by: b[5] === 'Scheduled' ? null : b[5]
      };
    });
  }

  function build() {
    var users = buildUsers();
    var applications = buildApplications();
    var categories = buildCategories();
    var tags = buildTags();
    return {
      departments: departments.map(function (d) { return Object.assign({}, d); }),
      roles: buildRoles(users),
      users: users,
      applications: applications,
      stages: stages,
      sessions: buildSessions(users),
      financialRecords: buildFinancialRecords(applications),
      disbursements: buildDisbursementList(applications),
      categories: categories,
      tags: tags,
      documents: buildDocumentLibrary(users, categories, tags),
      videos: buildVideoLibrary(users, categories, tags),
      discussions: buildForumThreads(users, categories),
      tickets: buildTicketList(users),
      courses: buildCourseCatalog(users, categories),
      meetings: buildMeetings(users),
      workflow: buildWorkflow(users),
      settings: buildSettings(),
      auditLogs: buildAuditLogs(users, applications),
      backups: buildBackups()
    };
  }

  LSDS.data = { build: build, roleLabel: roleLabel, stageKeyForStatus: stageKeyForStatus };
})(window);
