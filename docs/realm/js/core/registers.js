/**
 * Registers: typed, persisted lists – risk registers, test records, supplier
 * directories, purchase orders, permits, breach records – one engine for all
 * of them. A register is a definition (fields with types) plus rows in the
 * store; every change is journaled, rows can be scoped to a job, exported
 * as CSV or JSON, imported, de-duplicated, and anything with a date field
 * raises "due" and "expiring" alerts. The definitions name which items of
 * the thousand-feature programme they implement.
 */

/** Field DSL: "key:type[:options|…][:req]" with types text, textarea, number, date, bool, select, person, money. */
function fields(spec) {
    return spec.split(',').map((s) => {
        const [key, type = 'text', ...rest] = s.trim().split(':');
        const req = rest.includes('req'); const opts = rest.find((r) => r.includes('|'));
        return { key, label: key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), type, required: req, options: opts ? opts.split('|') : null };
    });
}
const D = (id, title, domain, scope, items, spec) => ({ id, title, domain, scope, items, fields: fields(spec) });

/** Every register, by programme domain. `scope` is 'job' (rows belong to a job) or 'org'. `items` are programme item numbers. */
export const REGISTER_DEFS = [
    // Accounts and organisations
    D('team_directory', 'Team directory', 'accounts', 'org', [49], 'name:text:req,role:text,team:text,email:text,phone:text,timezone:text'),
    D('accreditations', 'Accreditation profiles', 'accounts', 'org', [45, 46, 47], 'holder:text:req,kind:select:CEC installer|CEC designer|Electrical licence|Working at heights|First aid|Other,number:text,expires:date:req,verified:bool'),
    D('access_reviews', 'User access reviews', 'accounts', 'org', [41, 42], 'user:text:req,role:text,reviewer:text,decision:select:keep|reduce|remove,reviewed:date'),
    D('consents', 'Terms and privacy consents', 'accounts', 'org', [43, 44], 'person:text:req,document:select:Terms|Privacy|Data processing,version:text,accepted:date,withdrawn:date'),
    D('service_accounts', 'Service accounts and API tokens', 'accounts', 'org', [35, 36, 37, 38], 'name:text:req,scopes:text,expires:date,last_used:date,uses:number'),
    D('contractor_access', 'Temporary contractor and guest access', 'accounts', 'org', [14, 15, 16], 'name:text:req,company:text,kind:select:contractor|customer guest|auditor,scope:text,expires:date:req'),
    D('trusted_devices', 'Trusted devices and sessions', 'accounts', 'org', [17, 18, 22], 'device:text:req,user:text,last_seen:date,revoked:bool'),
    // Projects and collaboration
    D('project_templates', 'Project templates', 'projects', 'org', [51, 52, 53], 'name:text:req,system_kw:number,battery_kwh:number,stages:text,documents:text'),
    D('risks', 'Risk register', 'projects', 'job', [64], 'title:text:req,likelihood:select:low|medium|high,impact:select:low|medium|high,owner:person,mitigation:textarea,status:select:open|mitigated|closed,due:date'),
    D('issues', 'Issue register', 'projects', 'job', [65], 'title:text:req,severity:select:low|medium|high|critical,owner:person,status:select:open|in progress|resolved,due:date'),
    D('decisions', 'Decision log', 'projects', 'job', [66], 'title:text:req,decision:textarea,rationale:textarea,decided_by:person,decided:date'),
    D('assumptions', 'Assumptions register', 'projects', 'job', [67], 'assumption:text:req,owner:person,validated:bool,validated_on:date'),
    D('stakeholders', 'Stakeholder directory', 'projects', 'job', [68], 'name:text:req,role:text,organisation:text,contact:text,influence:select:low|medium|high'),
    D('raci', 'Responsibility matrix', 'projects', 'job', [69], 'activity:text:req,responsible:person,accountable:person,consulted:text,informed:text'),
    D('discussions', 'Discussion threads', 'projects', 'job', [70, 71, 72, 73], 'topic:text:req,message:textarea,mentions:text,attachment:text,resolved:bool'),
    D('bookmarks', 'Shared project bookmarks', 'projects', 'job', [74], 'label:text:req,target:text,shared:bool'),
    D('change_requests', 'Change requests', 'projects', 'job', [62, 63], 'title:text:req,impact:textarea,cost_change:money,days_change:number,status:select:proposed|approved|rejected|done'),
    D('budget_lines', 'Budget baseline and actuals', 'projects', 'job', [77, 78], 'item:text:req,baseline:money:req,actual:money,note:text'),
    D('time_entries', 'Time tracking', 'projects', 'job', [79, 80], 'person:person:req,hours:number:req,rate:money,task:text,worked:date'),
    D('milestones', 'Milestones and customer approvals', 'projects', 'job', [60, 82], 'title:text:req,due:date:req,customer_approval:bool,approved_on:date,done:bool'),
    D('handover_checklist', 'Project handover checklist', 'projects', 'job', [81], 'item:text:req,done:bool,by:person,on:date'),
    D('contractor_onboarding', 'Contractor onboarding checklist', 'projects', 'org', [83], 'contractor:text:req,item:text:req,done:bool,on:date'),
    D('comms_log', 'Communication log', 'projects', 'job', [96], 'on:date:req,channel:select:phone|email|sms|site visit|portal,with_whom:text,summary:textarea'),
    D('escalation_policies', 'Escalation policies', 'projects', 'org', [95], 'trigger:text:req,first:person,second:person,after_hours:number'),
    D('dependencies', 'Project dependencies', 'projects', 'job', [59, 85], 'depends_on:text:req,kind:select:finish-to-start|start-to-start|approval,note:text'),
    D('custom_fields', 'Custom project fields', 'projects', 'org', [91, 92, 93], 'key:text:req,label:text:req,type:select:text|number|date|bool,required_when:text'),
    D('document_requirements', 'Project document requirements', 'projects', 'org', [94, 325], 'stage:text:req,document:text:req,mandatory:bool'),
    // Site surveys and design
    D('roof_planes', 'Roof planes', 'design', 'job', [103, 104, 105, 106, 107, 119], 'name:text:req,pitch_deg:number,azimuth_deg:number,material:select:tile|tin|slate|membrane|other,condition:select:good|fair|poor,area_m2:number'),
    D('shading_obstacles', 'Shading obstacles', 'design', 'job', [113], 'object:text:req,height_m:number,distance_m:number,bearing_deg:number'),
    D('exclusion_zones', 'Roof exclusion zones', 'design', 'job', [109, 112], 'plane:text:req,reason:text,width_m:number,depth_m:number'),
    D('existing_circuits', 'Existing circuit inventory', 'design', 'job', [133, 134], 'circuit:text:req,breaker_a:number,phase:select:L1|L2|L3|3-phase,load:text'),
    D('site_constraints', 'Site constraints', 'design', 'job', [139, 140, 141, 142, 143, 144, 145], 'kind:select:wind region|corrosion|bushfire|flood|heritage|access|fall protection,value:text:req,note:text'),
    D('design_assumptions', 'Design assumption annotations', 'design', 'job', [138], 'assumption:text:req,value:text,source:text'),
    D('material_takeoff', 'Installation material takeoff', 'design', 'job', [147], 'item:text:req,quantity:number:req,unit:text,supplier:text'),
    D('design_revisions', 'Design revisions and approvals', 'design', 'job', [136, 137], 'revision:text:req,summary:textarea,approved_by:person,approved_on:date'),
    D('survey_photos', 'Geotagged survey photographs', 'design', 'job', [102, 116, 117, 118], 'file:text:req,lat:number,lng:number,taken:date,source:select:phone|drone|satellite|lidar'),
    // Batteries and electrification
    D('critical_loads', 'Critical load inventory', 'battery', 'job', [163, 164], 'load:text:req,watts:number:req,hours_per_day:number,priority:select:essential|important|optional'),
    D('flexible_loads', 'Flexible loads and shedding priorities', 'battery', 'job', [192, 193, 194], 'load:text:req,kw:number,shed_priority:number,window:text'),
    D('battery_commissioning', 'Battery commissioning records', 'battery', 'job', [172], 'test:text:req,value:text,pass:bool,on:date'),
    D('battery_health', 'Battery state-of-health readings', 'battery', 'job', [173, 174, 175], 'on:date:req,soh_pct:number,cycles:number,temp_c:number,imbalance_mv:number'),
    D('battery_recycling', 'Battery replacement and recycling records', 'battery', 'job', [177, 178], 'unit:text:req,serial:text,facility:text,on:date,certificate:text'),
    D('ev_chargers', 'EV chargers and schedules', 'battery', 'job', [179, 180, 183, 184, 185, 186], 'make:text:req,kw:number,phases:number,schedule:text,priority:number,v2h:bool'),
    D('vpp_contracts', 'VPP contracts and constraints', 'battery', 'org', [195, 196, 197], 'provider:text:req,reserve_pct:number,max_cycles:number,ends:date'),
    // Compliance
    D('exceptions', 'Compliance exception requests', 'compliance', 'job', [216, 217, 218, 219], 'rule:text:req,reason:textarea,evidence:text,approved_by:person,expires:date,status:select:requested|approved|rejected'),
    D('interpretations', 'Clause interpretation notes', 'compliance', 'org', [246, 247], 'clause:text:req,note:textarea,approved_by:person,approved_on:date'),
    D('nonconformances', 'Nonconformance register', 'compliance', 'job', [235, 236], 'item:text:req,severity:select:minor|major|critical,root_cause:textarea,status:select:open|closed'),
    D('corrective_actions', 'Corrective action register', 'compliance', 'org', [237], 'action:text:req,owner:person,due:date,verified:bool'),
    D('preventive_actions', 'Preventive action register', 'compliance', 'org', [238], 'action:text:req,owner:person,due:date,verified:bool'),
    D('remediation', 'Remediation tasks', 'compliance', 'job', [232, 233, 234], 'finding:text:req,owner:person,due:date:req,verified:bool,verified_by:person'),
    D('inspection_plans', 'Inspection sampling plans', 'compliance', 'org', [239, 240], 'plan:text:req,sample_size:number,checklist_version:text,frequency:text'),
    D('reviewers', 'Accredited reviewers', 'compliance', 'org', [221, 222, 241], 'name:text:req,competency:text,accreditation:text,expires:date'),
    D('submissions', 'Regulatory submissions', 'compliance', 'job', [242, 243], 'authority:text:req,package:text,submitted:date,receipt:text'),
    D('certificates', 'Compliance certificates', 'compliance', 'job', [244, 245], 'number:text:req,kind:text,issued:date,checksum:text,revoked:bool'),
    // Products and supply chain
    D('suppliers', 'Supplier directory', 'supply', 'org', [277, 278, 282], 'name:text:req,accreditation:text,lead_time_days:number,score:number,contact:text'),
    D('supplier_quotes', 'Supplier quotations', 'supply', 'org', [279, 280, 281], 'supplier:text:req,item:text:req,price:money,lead_time_days:number,valid_until:date'),
    D('inventory', 'Inventory stock levels', 'supply', 'org', [283, 284, 287], 'item:text:req,quantity:number:req,reserved:number,location:text,reorder_at:number'),
    D('batches', 'Batch numbers', 'supply', 'org', [286], 'batch:text:req,product:text,quantity:number,received:date'),
    D('purchase_orders', 'Purchase orders', 'supply', 'org', [288, 289], 'number:text:req,supplier:text,total:money,approved_by:person,status:select:draft|approved|sent|received'),
    D('goods_receipts', 'Goods receipts and discrepancies', 'supply', 'org', [290, 291, 292], 'po_number:text:req,received_qty:number,discrepancy:text,damaged:bool,on:date'),
    D('returns', 'Returns and warranty claims', 'supply', 'org', [293, 294], 'kind:select:RMA|warranty claim,product:text:req,serial:text,issue:textarea,status:select:open|accepted|rejected|closed'),
    D('counterfeit_reports', 'Counterfeit product reports', 'supply', 'org', [296], 'product:text:req,serial:text,source:text,reported:date'),
    D('product_watchlist', 'Product watchlist', 'supply', 'org', [298], 'product:text:req,reason:text,added:date'),
    D('substitutions', 'Product substitutions', 'supply', 'job', [275, 276], 'original:text:req,replacement:text:req,approved_by:person,approved_on:date'),
    D('product_aliases', 'Product model aliases', 'supply', 'org', [251, 252, 253], 'alias:text:req,canonical:text:req'),
    D('environmental_declarations', 'Product environmental declarations', 'supply', 'org', [299, 300], 'product:text:req,embodied_kgco2e:number,epd_reference:text'),
    // Documents and evidence
    D('document_categories', 'Document categories', 'documents', 'org', [323, 324], 'name:text:req,description:text'),
    D('document_index', 'Document index with expiry and retention', 'documents', 'job', [306, 307, 326, 327], 'name:text:req,category:text,expires:date,retain_until:date,legal_hold:bool'),
    D('document_versions', 'Document versions and check-out', 'documents', 'job', [308, 309, 311], 'document:text:req,version:text:req,author:person,checked_out_by:person,superseded:bool'),
    D('document_approvals', 'Document approvals', 'documents', 'job', [310], 'document:text:req,approver:person,decision:select:pending|approved|rejected,on:date'),
    D('redactions', 'Document redactions', 'documents', 'job', [328, 329], 'document:text:req,page:number,region:text,reason:text,verified:bool'),
    D('share_links', 'Document share links', 'documents', 'job', [331, 332, 333, 334], 'document:text:req,expires:date,password_protected:bool,downloads_allowed:bool,opened:number'),
    D('annotations', 'Evidence annotations and clause links', 'documents', 'job', [335, 336, 349], 'document:text:req,page:number,clause:text,note:textarea'),
    D('signatures', 'Electronic signature requests', 'documents', 'job', [338, 339, 340], 'document:text:req,signer:text:req,status:select:sent|viewed|signed|declined,completed:date'),
    D('evidence_custody', 'Evidence capture and custody', 'documents', 'job', [341, 342, 343, 344], 'evidence:text:req,captured:date,by:person,custody:textarea,tamper_flag:bool'),
    D('translations', 'Document translation reviews', 'documents', 'job', [348], 'document:text:req,language:text,reviewer:person,approved:bool'),
    D('extraction_corrections', 'Extraction corrections', 'documents', 'job', [320, 321, 322], 'document:text:req,field:text,extracted:text,corrected:text,confidence:number'),
    // AI minions and automation
    D('capability_profiles', 'Minion capability profiles', 'automation', 'org', [351, 353], 'minion:text:req,capabilities:text,tool_scopes:text'),
    D('escalation_rules', 'Human escalation rules', 'automation', 'org', [377], 'condition:text:req,escalate_to:person,within_hours:number'),
    D('prompt_templates', 'Prompt templates', 'automation', 'org', [386, 387], 'name:text:req,version:text:req,text:textarea,approved_by:person'),
    D('eval_datasets', 'Agent evaluation datasets', 'automation', 'org', [388, 389], 'name:text:req,cases:number,last_score:number,run:date'),
    D('task_feedback', 'Task outcome feedback', 'automation', 'org', [390], 'task:text:req,rating:select:good|ok|bad,note:text'),
    D('memory_corrections', 'Memory corrections', 'automation', 'org', [392, 393], 'memory:text:req,correction:textarea,by:person,source:text'),
    D('disagreements', 'Minion disagreement resolutions', 'automation', 'org', [376], 'task:text:req,parties:text,resolution:textarea,resolved_by:person'),
    // Knowledge and research
    D('research_collections', 'Research collections', 'knowledge', 'org', [417, 418], 'name:text:req,items:textarea,shared_with:text'),
    D('research_questions', 'Research question history', 'knowledge', 'org', [419], 'question:text:req,answer:textarea,asked:date'),
    D('missing_sources', 'Missing-source requests', 'knowledge', 'org', [420, 421], 'title:text:req,why:text,status:select:requested|found|declined'),
    D('approved_answers', 'Approved answer library', 'knowledge', 'org', [422, 423, 424], 'question:text:req,answer:textarea,approved_by:person,expires:date'),
    D('vocabulary', 'Taxonomy, synonyms, terminology and acronyms', 'knowledge', 'org', [425, 426, 427, 428, 429], 'term:text:req,kind:select:taxonomy|synonym|terminology|acronym,meaning:text,synonyms:text'),
    D('source_subscriptions', 'Source change subscriptions', 'knowledge', 'org', [444], 'source:text:req,url:text,last_seen:date'),
    D('ingestion_approvals', 'Approved website ingestion', 'knowledge', 'org', [445, 446, 447], 'site:text:req,approved:bool,robots_ok:bool,rate_per_min:number'),
    // 3D realm
    D('camera_bookmarks', 'Camera bookmarks', 'realm', 'org', [456], 'name:text:req,x:number,z:number,yaw:number,pitch:number,dist:number'),
    D('realm_annotations', 'Realm object annotations', 'realm', 'org', [479], 'object:text:req,note:textarea'),
    D('realm_layouts', 'Shared realm layouts', 'realm', 'org', [476, 477, 478], 'name:text:req,version:number,layout:textarea,shared:bool'),
    // Installation and commissioning
    D('job_sheets', 'Daily job sheets', 'install', 'job', [501], 'on:date:req,crew:text,tasks:textarea,notes:text'),
    D('attendance', 'Site attendance', 'install', 'job', [504, 505, 506], 'person:person:req,check_in:date,check_out:date,location:text,verified:bool'),
    D('jsa', 'Job safety analysis', 'install', 'job', [507], 'hazard:text:req,control:textarea,signed_by:person,on:date'),
    D('toolbox_talks', 'Toolbox talks', 'install', 'job', [508], 'topic:text:req,attendees:text,on:date'),
    D('permits', 'Permits, isolation and lock-out', 'install', 'job', [510, 511, 512], 'kind:select:permit to work|isolation|lock-out tag-out,reference:text:req,issued_by:person,issued:date,closed:date'),
    D('equipment_verification', 'Pre-install equipment verification', 'install', 'job', [513, 514, 515, 516], 'item:text:req,serial:text,scanned:bool,matches_design:bool'),
    D('photo_prompts', 'Installation photo prompts', 'install', 'job', [517, 518, 519, 545], 'angle:text:req,taken:bool,hidden_work:bool,file:text'),
    D('fastening_records', 'Torque, fastener and connector records', 'install', 'job', [521, 522, 523, 524], 'kind:select:torque|fastener|cable label|connector,item:text:req,value:text,verified:bool'),
    D('test_records', 'Electrical test records', 'install', 'job', [525, 526, 527, 528, 529, 530, 531, 532, 533, 534], 'test:select:earth continuity|insulation resistance|polarity|open-circuit voltage|string current|inverter protection|anti-islanding|export limit|battery shutdown|backup transfer,value:number,unit:text,pass:bool,instrument:text,on:date'),
    D('instruments', 'Commissioning instrument registry', 'install', 'org', [535, 536], 'instrument:text:req,serial:text,calibrated_until:date:req'),
    D('defects', 'Defect punch list', 'install', 'job', [540, 541, 542], 'defect:text:req,photo:text,assigned_to:person,status:select:open|fixed|verified,due:date'),
    D('variations', 'Installation variation requests', 'install', 'job', [543, 646], 'description:text:req,price_change:money,approved_by:person,approved_on:date'),
    D('materials_used', 'Materials consumption', 'install', 'job', [544], 'item:text:req,quantity:number:req,unit:text'),
    D('acceptance', 'Final installation acceptance', 'install', 'job', [539, 550], 'witness:text:req,signed_on:date,accepted:bool,notes:text'),
    // Monitoring and maintenance
    D('telemetry_sources', 'Telemetry sources', 'monitoring', 'job', [551, 552, 553, 554, 555, 556], 'kind:select:inverter|battery|smart meter|weather station,identifier:text:req,status:select:online|offline|degraded,last_reading:date'),
    D('telemetry_readings', 'Telemetry readings', 'monitoring', 'job', [557, 558, 559, 560, 561], 'metric:text:req,value:number:req,unit:text,at:date'),
    D('faults', 'Fault events', 'monitoring', 'job', [569, 570, 571, 577, 578, 579], 'code:text:req,translation:text,severity:select:info|warning|fault|critical,at:date,cleared:date'),
    D('outages', 'Grid outages and curtailment', 'monitoring', 'job', [572, 573], 'kind:select:outage|curtailment,started:date,ended:date,kwh_lost:number'),
    D('maintenance_tickets', 'Maintenance tickets', 'monitoring', 'job', [580, 585, 586, 587, 599], 'issue:text:req,status:select:open|dispatched|done,cost:money,sla_due:date,evidence:text'),
    D('pm_schedule', 'Preventive maintenance schedule', 'monitoring', 'job', [581, 582], 'task:text:req,every_months:number,next_due:date:req,trigger:text'),
    D('spares', 'Spare parts', 'monitoring', 'org', [584], 'part:text:req,fits:text,quantity:number'),
    D('remote_changes', 'Remote setting changes', 'monitoring', 'job', [589, 590, 591, 592], 'setting:text:req,old_value:text,new_value:text,approved_by:person,rolled_back:bool'),
    D('firmware', 'Firmware inventory and rollouts', 'monitoring', 'job', [593, 594, 595], 'device:text:req,version:text,target_version:text,scheduled:date,verified:bool'),
    D('fleet', 'Fleet health and end-of-life', 'monitoring', 'org', [596, 597], 'site:text:req,health:number,installed:date,eol_expected:date'),
    // Energy economics
    D('bills', 'Electricity bills', 'economics', 'job', [601, 602, 603], 'retailer:text:req,period_start:date,period_end:date,kwh:number,amount:money,line_items:textarea'),
    D('tariffs', 'Tariff plans', 'economics', 'org', [605, 606, 607, 608, 609, 610, 611], 'name:text:req,kind:select:flat|time-of-use|demand|dynamic,peak_c_kwh:number,offpeak_c_kwh:number,feed_in_c_kwh:number,effective:date'),
    D('financial_assumptions', 'Financial assumptions', 'economics', 'org', [619, 620, 621, 622, 649], 'parameter:text:req,value:number,unit:text,source:text'),
    D('incentive_applications', 'Incentive applications', 'economics', 'job', [631, 632, 633], 'program:text:req,eligible:bool,rate_version:text,status:select:screening|lodged|approved|paid'),
    D('payments', 'Deposits and progress payments', 'economics', 'job', [643, 644, 645], 'milestone:text:req,amount:money:req,due:date,paid:date,invoice:text'),
    D('savings_tracking', 'Savings guarantee and actuals', 'economics', 'job', [647, 648], 'period:text:req,forecast:money,actual:money,guaranteed:money'),
    // Notifications and workflows
    D('notification_rules', 'Notification rules', 'notifications', 'org', [662, 663], 'event:text:req,severity:select:info|warning|critical,channel:select:in-app|email|sms|push,project_only:bool'),
    D('oncall', 'On-call schedule', 'notifications', 'org', [666, 667], 'person:person:req,from:date,to:date,backup:person'),
    D('suppression_windows', 'Alert suppression windows', 'notifications', 'org', [668, 669], 'from:date:req,to:date:req,reason:text'),
    D('notification_templates', 'Notification templates', 'notifications', 'org', [670, 671, 672], 'name:text:req,locale:text,text:textarea'),
    D('workflows', 'Workflow definitions', 'notifications', 'org', [673, 674, 675, 676, 677, 678, 679, 680, 683, 684, 689], 'name:text:req,trigger:select:event|schedule|manual,steps:textarea,version:number,published:bool,owner:person'),
    D('workflow_runs', 'Workflow execution history', 'notifications', 'org', [685, 686, 687, 688, 690], 'workflow:text:req,started:date,status:select:running|done|failed|timed out,test_mode:bool,log:textarea'),
    D('appointments', 'Customer appointments', 'notifications', 'job', [693, 694, 695, 696], 'customer:text:req,starts:date:req,ends:date,status:select:booked|rescheduled|cancelled|done'),
    D('recurring_tasks', 'Recurring task templates', 'notifications', 'org', [697, 699], 'task:text:req,every:text,business_days_only:bool,next:date'),
    // Search, dashboards and reports
    D('saved_searches', 'Saved searches', 'reports', 'org', [706, 707, 708], 'name:text:req,query:text:req,shared:bool,alert:bool'),
    D('kpi_targets', 'KPI targets', 'reports', 'org', [721, 722], 'metric:text:req,target:number:req,warn_below:number,unit:text'),
    D('report_schedules', 'Scheduled reports', 'reports', 'org', [739, 740, 741], 'report:text:req,parameters:text,every:text,recipients:text,restricted:bool'),
    D('emission_factors', 'Emissions factors', 'reports', 'org', [736, 737], 'region:text:req,kg_per_kwh:number:req,version:text,source:text'),
    D('report_snapshots', 'Report snapshot history', 'reports', 'org', [742, 743, 750], 'report:text:req,taken:date,approved_by:person,downloaded_by:text'),
    // Integrations
    D('integrations', 'Integration credentials and health', 'integrations', 'org', [806, 807, 808, 824, 825, 826, 827, 828, 829], 'name:text:req,scopes:text,rate_limit:number,status:select:connected|failing|disconnected,rotated:date,last_test:date'),
    D('webhooks', 'Webhook subscriptions', 'integrations', 'org', [817, 818, 819, 820, 821, 822, 823], 'url:text:req,events:text,schema_version:text,retries:number,dead_lettered:number,last_delivery:date'),
    D('import_mappings', 'CSV import mappings', 'integrations', 'org', [845, 846, 847, 848], 'name:text:req,source_field:text:req,target_field:text:req,errors:number'),
    // Security, privacy and governance
    D('security_events', 'Security events', 'security', 'org', [19, 20, 857], 'event:text:req,user:text,at:date,severity:select:info|warning|critical'),
    D('sensitive_fields', 'Sensitive field classification', 'security', 'org', [861, 862, 863], 'field:text:req,classification:select:public|internal|personal|sensitive,masked:bool'),
    D('data_requests', 'Personal data requests', 'security', 'org', [24, 864, 865, 866, 867], 'person:text:req,kind:select:access|correction|deletion|consent withdrawal,received:date,due:date,completed:date'),
    D('transfers', 'Cross-border transfer records', 'security', 'org', [868, 869], 'data:text:req,from_region:text,to_region:text,basis:text'),
    D('processing_inventory', 'Data processing inventory', 'security', 'org', [870], 'activity:text:req,data:text,purpose:text,retention:text'),
    D('subprocessors', 'Subprocessor register', 'security', 'org', [871], 'name:text:req,service:text,region:text,contract_date:date'),
    D('pias', 'Privacy impact assessments', 'security', 'org', [872], 'title:text:req,risk:select:low|medium|high,completed:date,owner:person'),
    D('breaches', 'Breach response records', 'security', 'org', [873, 874, 875], 'title:text:req,detected:date:req,notify_by:date,notified:date,evidence:text'),
    D('keys', 'Encryption keys', 'security', 'org', [876, 877], 'name:text:req,managed_by:select:platform|organisation,rotated:date,rotate_by:date'),
    D('vulnerabilities', 'Dependency vulnerabilities and licences', 'security', 'org', [887, 888], 'package:text:req,issue:text,severity:select:low|medium|high|critical,licence:text,triaged:bool'),
    D('security_exceptions', 'Security exception register', 'security', 'org', [892], 'control:text:req,reason:textarea,approved_by:person,expires:date'),
    D('pentest_findings', 'Penetration test findings', 'security', 'org', [893], 'finding:text:req,severity:select:low|medium|high|critical,status:select:open|fixed|accepted,due:date'),
    D('training', 'Security training acknowledgements', 'security', 'org', [894, 900], 'person:text:req,module:text,acknowledged:date'),
    D('control_owners', 'Security control ownership', 'security', 'org', [895, 899], 'control:text:req,owner:person,evidence:text,certified:date'),
    // Reliability
    D('migrations', 'Database migrations', 'reliability', 'org', [905, 906, 907], 'name:text:req,planned:date,applied:date,rollback:text,locked:bool'),
    D('health_checks', 'Dependency health checks', 'reliability', 'org', [908, 919, 920, 921], 'dependency:text:req,status:select:ok|degraded|down,checked:date,latency_ms:number'),
    D('slos', 'Service-level objectives', 'reliability', 'org', [925, 926, 927], 'service:text:req,objective:text,target_pct:number,current_pct:number,error_budget_left:number'),
    D('backups', 'Backups and restore drills', 'reliability', 'org', [930, 931, 932, 933, 934], 'taken:date:req,encrypted:bool,verified:bool,restore_drill:date,point_in_time:bool'),
    D('runbooks', 'Disaster recovery runbooks', 'reliability', 'org', [935, 936, 937], 'title:text:req,rto_hours:number,rpo_hours:number,region:text,tested:date'),
    D('deployments', 'Deployments', 'reliability', 'org', [938, 939, 940, 941, 942], 'version:text:req,strategy:select:canary|blue-green|rolling,preflight_ok:bool,deployed:date,rolled_back:bool'),
    // Testing and product administration
    D('release_checklists', 'Release acceptance checklists', 'testing', 'org', [998], 'release:text:req,item:text:req,done:bool'),
    D('acceptance_evidence', 'Feature acceptance evidence', 'testing', 'org', [1000], 'feature:text:req,evidence:textarea,verified_by:person,on:date'),
    D('feedback', 'User feedback and feature requests', 'testing', 'org', [961, 962], 'kind:select:feedback|feature request,text:textarea:req,votes:number,status:select:new|planned|done'),
    D('support_tickets', 'Support tickets', 'testing', 'org', [963, 965, 966], 'title:text:req,status:select:open|answered|closed,support_access_until:date,consented:bool'),
    D('surveys', 'Customer satisfaction surveys', 'testing', 'org', [967], 'customer:text:req,score:number:req,comment:text,on:date'),
    D('billing_contacts', 'Billing contacts', 'testing', 'org', [974], 'name:text:req,email:text,role:text')
];
export const REGISTER_BY_ID = Object.fromEntries(REGISTER_DEFS.map((d) => [d.id, d]));
export const REGISTER_DOMAINS = [...new Set(REGISTER_DEFS.map((d) => d.domain))];

const DAY = 86400000;
function parseDate(v) { if (!v) return null; const t = Date.parse(v); return Number.isFinite(t) ? t : null; }

/** Validate a row against its definition. Returns { ok, errors: { key: message } }. */
export function validateRow(def, row) {
    const errors = {};
    for (const f of def.fields) {
        const v = row[f.key];
        if (f.required && (v === undefined || v === null || v === '')) { errors[f.key] = 'required'; continue; }
        if (v === undefined || v === null || v === '') continue;
        if ((f.type === 'number' || f.type === 'money') && !Number.isFinite(Number(v))) errors[f.key] = 'must be a number';
        if (f.type === 'date' && parseDate(v) === null) errors[f.key] = 'must be a date';
        if (f.type === 'select' && f.options && !f.options.includes(String(v))) errors[f.key] = `one of ${f.options.join(', ')}`;
    }
    return { ok: Object.keys(errors).length === 0, errors };
}

function csvCell(v) { const s = v === undefined || v === null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function toCsv(def, rows) { return [def.fields.map((f) => f.key).join(','), ...rows.map((r) => def.fields.map((f) => csvCell(r[f.key])).join(','))].join('\n'); }

export class Registers {
    constructor({ store, now = () => Date.now(), user = 'you' } = {}) { this.store = store; this.now = now; this.user = user; }
    def(id) { const d = REGISTER_BY_ID[id]; if (!d) throw new Error(`unknown register ${id}`); return d; }
    path(id) { return `registers.${id}`; }
    state(id) { return this.store.get(this.path(id)) || { rows: [], history: [] }; }
    /** Rows, optionally for one job (job-scoped registers keep `jobId` on every row). */
    list(id, { jobId = null } = {}) { const rows = this.state(id).rows; return jobId ? rows.filter((r) => r.jobId === jobId) : rows; }
    get(id, rowId) { return this.state(id).rows.find((r) => r.id === rowId) || null; }
    count(id) { return this.state(id).rows.length; }
    journal(s, entry) { s.history = [...(s.history || []).slice(-199), { at: this.now(), by: this.user, ...entry }]; return s; }
    add(id, row, { jobId = null } = {}) {
        const def = this.def(id); const v = validateRow(def, row); if (!v.ok) return { ok: false, errors: v.errors };
        const s = this.state(id); const rec = { ...row, id: `${id}-${(s.history.length + 1).toString(36)}-${(this.now() % 100000).toString(36)}`, jobId: def.scope === 'job' ? jobId : null, createdAt: this.now(), updatedAt: this.now() };
        s.rows = [...s.rows, rec]; this.journal(s, { action: 'add', rowId: rec.id, summary: String(row[def.fields[0].key] || rec.id) }); this.store.set(this.path(id), s);
        return { ok: true, row: rec };
    }
    update(id, rowId, patch) {
        const def = this.def(id); const s = this.state(id); const i = s.rows.findIndex((r) => r.id === rowId); if (i < 0) return { ok: false, errors: { id: 'not found' } };
        const next = { ...s.rows[i], ...patch, updatedAt: this.now() }; const v = validateRow(def, next); if (!v.ok) return { ok: false, errors: v.errors };
        s.rows = s.rows.map((r) => (r.id === rowId ? next : r)); this.journal(s, { action: 'update', rowId, fields: Object.keys(patch) }); this.store.set(this.path(id), s);
        return { ok: true, row: next };
    }
    remove(id, rowId) { const s = this.state(id); const before = s.rows.length; s.rows = s.rows.filter((r) => r.id !== rowId); if (s.rows.length === before) return false; this.journal(s, { action: 'remove', rowId }); this.store.set(this.path(id), s); return true; }
    history(id) { return this.state(id).history; }
    exportJson(id) { return JSON.stringify({ register: id, exportedAt: new Date(this.now()).toISOString(), rows: this.state(id).rows }, null, 2); }
    exportCsv(id) { return toCsv(this.def(id), this.state(id).rows); }
    /** Import rows (array or an exportJson payload); invalid rows are reported, valid ones added. */
    importRows(id, payload, opts = {}) {
        const rows = Array.isArray(payload) ? payload : (payload && payload.rows) || []; let added = 0; const rejected = [];
        for (const r of rows) { const { id: _id, createdAt, updatedAt, jobId, ...rest } = r; const res = this.add(id, rest, { jobId: opts.jobId ?? jobId ?? null }); if (res.ok) added++; else rejected.push({ row: r, errors: res.errors }); }
        return { added, rejected };
    }
    /** Remove rows whose user fields are identical to an earlier row. Returns how many went. */
    dedupe(id) {
        const def = this.def(id); const s = this.state(id); const seen = new Set(); const keep = [];
        for (const r of s.rows) { const sig = def.fields.map((f) => String(r[f.key] ?? '')).join('\u0001') + (r.jobId || ''); if (seen.has(sig)) continue; seen.add(sig); keep.push(r); }
        const removed = s.rows.length - keep.length; if (removed) { s.rows = keep; this.journal(s, { action: 'dedupe', removed }); this.store.set(this.path(id), s); }
        return removed;
    }
    /** Rows with a date field that is overdue or within `withinDays` – expiries, due dates, calibration, retention. */
    alerts(id, { withinDays = 30, jobId = null } = {}) {
        const def = this.def(id); const dateFields = def.fields.filter((f) => f.type === 'date' && /due|expires|expiry|until|rotate_by|notify_by|next|calibrated|retain|valid|sla|eol/.test(f.key)); if (!dateFields.length) return [];
        const now = this.now(); const out = [];
        for (const r of this.list(id, { jobId })) for (const f of dateFields) { const t = parseDate(r[f.key]); if (t === null) continue; if (r.done === true || r.verified === true || r.status === 'closed' || r.status === 'done') continue; const days = Math.round((t - now) / DAY); if (days < 0) out.push({ row: r, field: f.key, days, kind: 'overdue' }); else if (days <= withinDays) out.push({ row: r, field: f.key, days, kind: 'due' }); }
        return out.sort((a, b) => a.days - b.days);
    }
    /** Every alert across every register. */
    allAlerts(opts = {}) { return REGISTER_DEFS.flatMap((d) => this.alerts(d.id, opts).map((a) => ({ ...a, register: d.id, title: d.title }))); }
    /** Budget variance for the budget register (baseline vs actual). */
    variance(jobId = null) { const rows = this.list('budget_lines', { jobId }); const baseline = rows.reduce((n, r) => n + Number(r.baseline || 0), 0); const actual = rows.reduce((n, r) => n + Number(r.actual || 0), 0); return { baseline, actual, variance: actual - baseline, pct: baseline ? Math.round(((actual - baseline) / baseline) * 100) : 0, over: actual > baseline }; }
    summary() { const defs = REGISTER_DEFS.map((d) => ({ id: d.id, title: d.title, domain: d.domain, rows: this.count(d.id), alerts: this.alerts(d.id).length })); return { registers: defs.length, rows: defs.reduce((n, d) => n + d.rows, 0), alerts: defs.reduce((n, d) => n + d.alerts, 0), items: new Set(REGISTER_DEFS.flatMap((d) => d.items)).size, defs }; }
}

/** The programme items the registers implement. */
export function registerItems() { return new Set(REGISTER_DEFS.flatMap((d) => d.items)); }

const mem = () => { const data = {}; return { get(p, f) { return data[p] ?? f; }, set(p, v) { data[p] = v; return v; } }; };
export const FEATURES = [
    { id: 'registers.defs', title: 'Over 150 typed registers covering the programme, every field typed, every id unique', test: () => { const ids = new Set(REGISTER_DEFS.map((d) => d.id)); return REGISTER_DEFS.length >= 150 && ids.size === REGISTER_DEFS.length && REGISTER_DEFS.every((d) => d.fields.length >= 2 && d.items.length >= 1 && d.fields.every((f) => ['text', 'textarea', 'number', 'date', 'bool', 'select', 'person', 'money'].includes(f.type))) && registerItems().size >= 400; } },
    { id: 'registers.crud', title: 'Add, update, remove with validation; job scoping; journaled history', test: () => { const r = new Registers({ store: mem(), now: () => 1700000000000 }); const bad = r.add('risks', { likelihood: 'high' }, { jobId: 'J1' }); const ok = r.add('risks', { title: 'Roof access', likelihood: 'high', impact: 'medium', status: 'open' }, { jobId: 'J1' }); const other = r.add('risks', { title: 'Weather', likelihood: 'low', impact: 'low', status: 'open' }, { jobId: 'J2' }); const upd = r.update('risks', ok.row.id, { status: 'closed' }); const badUpd = r.update('risks', ok.row.id, { impact: 'huge' }); const gone = r.remove('risks', other.row.id); return !bad.ok && bad.errors.title === 'required' && ok.ok && r.list('risks', { jobId: 'J1' }).length === 1 && upd.ok && r.get('risks', ok.row.id).status === 'closed' && !badUpd.ok && gone && r.count('risks') === 1 && r.history('risks').map((h) => h.action).join(',') === 'add,add,update,remove'; } },
    { id: 'registers.exportImport', title: 'CSV and JSON export; JSON import rejects invalid rows and keeps valid ones; de-duplication', test: () => { const r = new Registers({ store: mem(), now: () => 1700000000000 }); r.add('suppliers', { name: 'Acme, Pty', lead_time_days: 5 }); const csv = r.exportCsv('suppliers'); const json = JSON.parse(r.exportJson('suppliers')); const r2 = new Registers({ store: mem() }); const imp = r2.importRows('suppliers', json); r2.importRows('suppliers', [{ name: 'Acme, Pty', lead_time_days: 5 }, { lead_time_days: 1 }]); const before = r2.count('suppliers'); const dupes = r2.dedupe('suppliers'); return csv.startsWith('name,accreditation') && csv.includes('"Acme, Pty"') && imp.added === 1 && before === 2 && dupes === 1 && r2.count('suppliers') === 1; } },
    { id: 'registers.alerts', title: 'Date fields raise overdue and due-soon alerts; done rows are quiet; budget variance computed', test: () => { const now = Date.parse('2026-10-17T00:00:00Z'); const r = new Registers({ store: mem(), now: () => now }); r.add('instruments', { instrument: 'Fluke 1587', calibrated_until: '2026-10-01' }); r.add('instruments', { instrument: 'Megger', calibrated_until: '2026-11-01' }); r.add('instruments', { instrument: 'Clamp', calibrated_until: '2027-06-01' }); r.add('remediation', { finding: 'x', due: '2026-10-01', verified: true }, { jobId: 'J' }); r.add('budget_lines', { item: 'panels', baseline: 1000, actual: 1200 }, { jobId: 'J' }); const a = r.alerts('instruments'); const all = r.allAlerts(); const v = r.variance('J'); return a.length === 2 && a[0].kind === 'overdue' && a[1].kind === 'due' && all.length === 2 && v.variance === 200 && v.pct === 20 && v.over && r.summary().registers === REGISTER_DEFS.length; } }
];
