# AI Integration Features Document — iSchool Platform

*Bismillah Ar-Rahman Ar-Roheem*

**Generated**: 2026-06-15
**Scope**: Conventional AI + Agentic AI across all school modules and Website CMS

---

## 1. Architecture Overview

### Provider System
- **OpenAI-compatible API** with custom `baseUrl` and `model` configuration
- **Multiple providers** supported simultaneously (OpenAI, Anthropic, local LLMs, custom endpoints)
- **Multiple API keys** with key aggregation (load balancing, fallback rotation)
- **Platform Admin manages** all AI configuration (providers, keys, models)
- **Per-school model selection** — schools choose which model to use from admin-approved list

### Security & Data Protection
- API keys stored encrypted in database, never exposed to client-side
- AI conversations are school-scoped — data from School A never reaches School B
- PII stripping before sending to external AI providers (configurable)
- Conversation retention policy (auto-delete after N days, configurable)
- Audit log for all AI interactions
- Role-based access control for AI features (same RBAC as rest of platform)
- Public chatbot only accesses non-private school data (announcements, FAQs, programs, classes, contact info)

---

## 2. Database Schema — New Tables

### `ai_providers`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| name | text | Provider name (e.g., "OpenAI", "Anthropic", "Local") |
| baseUrl | text | API base URL |
| isActive | boolean | Whether provider is enabled |
| sortOrder | integer | Display order |
| createdAt, updatedAt | timestamp | Timestamps |

### `ai_api_keys`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| providerId | integer FK | References ai_providers |
| keyName | text | Friendly name for the key |
| apiKey | text | Encrypted API key |
| isActive | boolean | Whether key is active |
| usageCount | integer | Number of requests made |
| rateLimitPerMinute | integer | Rate limit for this key |
| createdAt, updatedAt | timestamp | Timestamps |

### `ai_models`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| providerId | integer FK | References ai_providers |
| modelId | text | Model identifier (e.g., "gpt-4o", "claude-3") |
| displayName | text | Human-readable name |
| maxTokens | integer | Max context tokens |
| supportsTools | boolean | Whether model supports function calling |
| isActive | boolean | Whether model is available |
| createdAt, updatedAt | timestamp | Timestamps |

### `ai_conversations`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| schoolId | integer FK | School context |
| userId | integer FK | User who started conversation |
| title | text | Auto-generated conversation title |
| agentType | text | "admin" or "public" |
| modelId | integer FK | Which model was used |
| createdAt, updatedAt | timestamp | Timestamps |

### `ai_messages`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| conversationId | integer FK | References ai_conversations |
| role | text | "user", "assistant", "system", "tool" |
| content | text | Message content |
| toolCalls | json | Tool call data (for agentic) |
| toolResults | json | Tool result data |
| tokensUsed | integer | Token count for this message |
| createdAt | timestamp | Timestamp |

### `ai_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| schoolId | integer FK | School (nullable for platform-wide) |
| key | text | Setting key |
| value | json | Setting value |
| createdAt, updatedAt | timestamp | Timestamps |

---

## 3. Agentic AI Chat — Dashboard (School Management Agent)

### Purpose
A floating AI chat widget on the dashboard that allows School Owners and Administrators to manage everything related to their school via natural language, without navigating through menus.

### Capabilities (Tool Functions)

#### Student Management
- `search_students(query)` — Search students by name, ID, email
- `get_student_details(studentId)` — Full student profile
- `add_student(data)` — Create new student record
- `update_student(id, data)` — Update student info
- `get_student_attendance(studentId, dateRange)` — Attendance history
- `get_student_grades(studentId)` — Grade summary

#### Enrollment & Admissions
- `list_enrollments(status)` — List enrollments by status
- `approve_enrollment(enrollmentId)` — Approve enrollment
- `reject_enrollment(enrollmentId, reason)` — Reject enrollment

#### Attendance
- `mark_attendance(studentId, date, status)` — Mark attendance
- `get_attendance_summary(date)` — Today's attendance stats
- `get_absent_students(date)` — List absent students

#### Finance & Fees
- `get_fee_summary()` — School-wide fee collection status
- `get_student_invoices(studentId)` — Student's invoice list
- `record_payment(invoiceId, amount, method)` — Record payment
- `generate_invoice(studentId, feeStructureId)` — Create invoice
- `get_outstanding_fees()` — Outstanding fee report

#### HR & Staff
- `search_staff(query)` — Search staff members
- `get_staff_details(staffId)` — Staff profile
- `list_leave_requests(status)` — Pending leave requests
- `approve_leave(leaveId)` — Approve leave
- `reject_leave(leaveId, reason)` — Reject leave

#### Communication
- `send_announcement(title, content, audience)` — Create announcement
- `send_message(recipientId, content)` — Send direct message
- `get_unread_messages()` — List unread messages
- `get_notifications(count)` — Recent notifications

#### Academic
- `list_courses()` — All courses
- `get_course_details(courseId)` — Course info
- `create_assignment(courseId, data)` — Create assignment
- `get_upcoming_exams()` — Scheduled exams

#### Timetable
- `get_timetable(classId, day)` — Class timetable
- `find_free_rooms(day, period)` — Available rooms

#### Library
- `search_books(query)` — Search library catalog
- `check_book_availability(bookId)` — Check copies available

#### Events
- `list_upcoming_events()` — Upcoming events
- `create_event(data)` — Create event

#### Reports & Analytics
- `get_school_stats()` — Overview statistics
- `get_revenue_report(period)` — Revenue summary
- `get_attendance_report(period)` — Attendance trends
- `get_academic_performance(term)` — Performance summary

#### CMS Management
- `update_about_page(data)` — Update about page
- `create_blog_post(data)` — Create blog post
- `update_school_settings(data)` — Update school settings

### User Experience
- **Floating chat button** (bottom-right corner) visible on all dashboard pages
- **Chat panel** slides up from bottom-right (400px wide, 600px tall)
- **Conversation history** — previous conversations accessible via list
- **Context-aware** — AI knows which page user is on and provides relevant suggestions
- **Permission-aware** — AI respects user's role and permissions
- **Quick actions** — suggested prompts based on current context
- **Streaming responses** — real-time token streaming
- **Tool call visibility** — user sees when AI is performing actions
- **Confirmation required** — destructive actions (delete, approve) require user confirmation

### Configuration (Per School)
- Enable/disable agentic AI
- Choose which AI model to use
- Set which tools are available (granular control)
- Autonomous mode vs. confirmation mode
- Data sharing preferences (what data can be sent to AI provider)

---

## 4. Public AI Chatbot — School Website (Frontend)

### Purpose
A floating AI chat widget on each school's public website that allows visitors (prospective parents, students) to get intelligent answers about the school.

### Data Access (Non-Private Only)
- School about page (mission, vision, features)
- Published announcements
- Published blog posts
- Programs and courses
- Classes information
- FAQs
- Contact information
- Gallery descriptions
- Public events

### Capabilities
- Answer questions about admissions, programs, fees
- Provide school contact information
- Share upcoming events
- Summarize blog posts and announcements
- Answer FAQs with context
- Direct visitors to relevant pages
- Multilingual support (respond in visitor's language)

### User Experience
- **Floating chat button** on the public website (bottom-right)
- **Welcome message** — configurable per school
- **Suggested questions** — "What programs do you offer?", "How do I apply?"
- **Conversation in browser** — no login required
- **Rate limiting** — prevent abuse (configurable per school)
- **Handoff to human** — if AI can't answer, offer contact form

### Configuration (Per School)
- Enable/disable public chatbot
- Customize welcome message and suggested questions
- Set chatbot name and avatar
- Configure which data sources to include
- Set rate limits
- Set business hours (auto-reply outside hours)
- Custom instructions / personality

---

## 5. Conventional AI Features (Per Module)

### Module 1 — Student Information System
- Smart student profile summary (AI-generated narrative)
- At-risk student identification
- Enrollment prediction based on historical data
- Automated parent communication drafts

### Module 2 — Learning Management System
- AI-assisted lesson plan generation
- Quiz question auto-generation from lesson content
- Assignment feedback suggestions
- Learning gap analysis with recommendations
- Content summarization for students

### Module 3 — Timetable & Scheduling
- AI-optimized timetable suggestions
- Conflict resolution recommendations
- Substitute teacher recommendations

### Module 4 — Examinations & Results
- Auto-generated exam questions from question bank
- Performance analysis narratives
- Report card comment generation
- Predictive analytics for student outcomes

### Module 5 — Finance & Fees
- Payment reminder message generation
- Fee structure recommendations
- Financial health summary
- Revenue forecast based on enrollment

### Module 6 — HR & Staff
- Job description generation
- Performance review summary
- Leave pattern analysis
- Staff workload balancing suggestions

### Module 7 — Communication
- AI-drafted announcements
- Email composition assistance
- Message tone adjustment
- Translation of messages

### Module 8 — Library
- Book recommendation engine
- Reading list generation
- Catalog summary and insights

### Module 12 — Events
- Event description generation
- Schedule optimization
- Attendance prediction

### Module 14 — Reporting & Analytics
- AI-generated report narratives
- Anomaly detection in data
- Trend analysis with insights
- Natural language report querying ("Show me attendance trends for Grade 5")

### Website CMS
- Blog post generation from outline
- SEO optimization suggestions
- FAQ auto-generation from school data
- Social media post drafts

---

## 6. API Endpoints

### Admin (Platform Super Admin)
- `GET /api/admin/ai/providers` — List all providers
- `POST /api/admin/ai/providers` — Create provider
- `PUT /api/admin/ai/providers` — Update provider
- `DELETE /api/admin/ai/providers` — Delete provider
- `GET /api/admin/ai/keys` — List API keys (masked)
- `POST /api/admin/ai/keys` — Add API key
- `DELETE /api/admin/ai/keys` — Remove API key
- `GET /api/admin/ai/models` — List models
- `POST /api/admin/ai/models` — Add model
- `PUT /api/admin/ai/models` — Update model

### Dashboard (School Admin)
- `POST /api/dashboard/ai/chat` — Send message to agentic AI
- `GET /api/dashboard/ai/conversations` — List conversations
- `GET /api/dashboard/ai/conversations/:id` — Get conversation with messages
- `DELETE /api/dashboard/ai/conversations/:id` — Delete conversation
- `GET /api/dashboard/ai/settings` — Get school AI settings
- `PUT /api/dashboard/ai/settings` — Update school AI settings

### Public (School Website)
- `POST /api/school/:slug/ai/chat` — Public chatbot endpoint
- `GET /api/school/:slug/ai/config` — Get chatbot config (welcome message, etc.)

---

## 7. Implementation Strategy

### Phase 1: Foundation (Schema + Admin)
1. Add AI database tables to schema
2. Add AI admin pages (providers, keys, models)
3. Add AI API endpoints for admin
4. Run migration

### Phase 2: Agentic AI (Dashboard Chat)
1. Add AI chat API endpoint with tool calling
2. Implement tool functions for each module
3. Add floating chat widget component
4. Add conversation management
5. Add streaming response support

### Phase 3: Public Chatbot (Website)
1. Add public chat API endpoint
2. Build school data context builder (non-private data only)
3. Add floating chat widget to theme layouts
4. Add per-school chatbot configuration

### Phase 4: Conventional AI Features
1. Add AI suggestion buttons to relevant pages
2. Wire AI into report generation
3. Add AI-assisted content creation to CMS

---

*Wa billahi at-tawfiq. Baarokallahu feekum.*
