# Support Ticket System — Feature Specification

*Bismillah Ar-Rahman Ar-Roheem*

**Generated**: 2026-06-16
**Scope**: Internal (school users) + External (public/prospects) support tickets per school + platform-level

---

## 1. Overview

A comprehensive support ticket module integrated into each school's dashboard and the platform admin panel. Two modes:

1. **Internal Tickets** — Created by authenticated school users (students, parents, teachers, staff, admins) for school-level issues
2. **External Tickets** — Created by non-authenticated visitors (prospects, applicants) via the public school website
3. **Platform Tickets** — Created by school admins to the platform (iSchool) support team

---

## 2. Database Schema

### `support_tickets` (already exists in platform billing — EXTEND for school-level)

Existing platform-level table handles platform support. Add a new school-scoped table:

### `school_support_tickets`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| school_id | INTEGER FK | References schools(id) ON DELETE CASCADE |
| ticket_number | TEXT | Unique display number (e.g., TKT-2026-0001) |
| title | TEXT NOT NULL | Ticket subject |
| description | TEXT NOT NULL | Detailed description |
| category | TEXT | Category (technical, academic, billing, admission, general) |
| priority | TEXT | low, medium, high, urgent |
| status | TEXT | open, in_progress, waiting_customer, waiting_agent, resolved, closed |
| channel | TEXT | web, email, chat, phone, ai_bot |
| source | TEXT | internal, external, platform |
| created_by | INTEGER FK | User ID (nullable for external) |
| created_by_name | TEXT | Name (for external users) |
| created_by_email | TEXT | Email (for external users) |
| assigned_to | INTEGER FK | Staff/user ID assigned to handle |
| resolved_at | TEXT | Resolution timestamp |
| closed_at | TEXT | Closure timestamp |
| satisfaction_rating | INTEGER | 1-5 stars |
| satisfaction_comment | TEXT | Feedback comment |
| metadata | TEXT (JSON) | Additional context (browser info, page URL, etc.) |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |

### `school_ticket_replies`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| ticket_id | INTEGER FK | References school_support_tickets(id) ON DELETE CASCADE |
| user_id | INTEGER FK | Replier user ID (nullable for external) |
| user_name | TEXT | Display name |
| user_role | TEXT | Role at time of reply |
| content | TEXT NOT NULL | Reply body (markdown) |
| attachments | TEXT (JSON) | Array of attachment URLs |
| is_internal | INTEGER | Internal note (visible only to agents) |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |

### `school_ticket_categories`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| school_id | INTEGER FK | References schools(id) ON DELETE CASCADE |
| name | TEXT NOT NULL | Category name |
| description | TEXT | Category description |
| icon | TEXT | Icon name |
| is_public | INTEGER | Visible to external users |
| sort_order | INTEGER | Display order |
| created_at | INTEGER | Timestamp |

### `subscriber_accounts`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| email | TEXT UNIQUE NOT NULL | Subscriber email |
| name | TEXT NOT NULL | Display name |
| password_hash | TEXT | Bcrypt hash (for secure area access) |
| school_id | INTEGER FK | Primary school association (nullable) |
| verified | INTEGER | Email verified flag |
| verification_token | TEXT | Email verification token |
| reset_token | TEXT | Password reset token |
| reset_expires | INTEGER | Reset token expiry |
| created_at | INTEGER | Timestamp |
| updated_at | INTEGER | Timestamp |

---

## 3. Role-Based Permissions

### Internal Users

| Role | Create | View Own | View All | Reply | Assign | Close | Delete |
|------|--------|----------|----------|-------|--------|-------|--------|
| Student | YES | YES | NO | YES (own) | NO | NO | NO |
| Parent | YES | YES | NO | YES (own) | NO | NO | NO |
| Teacher | YES | YES | NO | YES (own) | NO | NO | NO |
| Staff | YES | YES | NO | YES (own) | NO | NO | NO |
| Accountant | YES | YES | NO | YES (own) | NO | NO | NO |
| Librarian | YES | YES | NO | YES (own) | NO | NO | NO |
| IT Admin | YES | YES | YES | YES | YES | YES | NO |
| School Admin | YES | YES | YES | YES | YES | YES | YES |

### External Users
- Create tickets via public form (no login required, email captured)
- View/reply to own tickets via subscriber login (email + password)
- Subscriber secure area: view tickets, reply, rate satisfaction

### AI Bot Integration
- AI chatbot can create tickets when it can't resolve an issue
- AI agent can search/update tickets as a tool
- Auto-categorization of tickets via AI
- Auto-assignment suggestions

---

## 4. Dashboard Pages

### `/dashboard/tickets` — School Ticket Management
- Stats cards: Open, In Progress, Resolved, Avg Resolution Time
- Ticket list with filters: status, priority, category, assignee, date range
- Search by ticket number, title, description
- Create ticket modal
- Ticket detail view with reply thread
- Bulk actions: assign, change status, close

### `/dashboard/ticket-settings` — IT Admin / School Admin
- Manage categories
- Set SLA policies (response time targets)
- Configure auto-assignment rules
- Set up email notifications for ticket events
- Manage support agents (which staff can handle tickets)

### Public School Website — `/[slug]/support`
- Public ticket creation form (name, email, category, subject, description, file upload)
- Subscriber login/register
- Subscriber dashboard (my tickets, reply, rate)

---

## 5. AI Integration

### Internal AI Agent Tools
- `search_tickets(query, status)` — Search tickets
- `get_ticket_details(ticketId)` — Full ticket with replies
- `create_ticket(data)` — Create new ticket
- `update_ticket_status(ticketId, status)` — Change status
- `assign_ticket(ticketId, assigneeId)` — Assign to agent
- `reply_to_ticket(ticketId, content)` — Add reply
- `get_ticket_stats()` — Ticket statistics
- `get_unassigned_tickets()` — Tickets without agent

### Public AI Chatbot
- When chatbot can't answer, offer to create a support ticket
- Auto-capture conversation context as ticket metadata
- Suggest relevant FAQ articles before ticket creation

### Auto-Features
- AI auto-categorization on ticket creation
- AI priority suggestion based on keywords
- AI duplicate detection (similar existing tickets)
- AI response suggestions for agents (draft replies)

---

## 6. API Endpoints

### Dashboard (Authenticated)
- `GET /api/dashboard/tickets` — List tickets (with filters)
- `GET /api/dashboard/tickets?action=detail&id=X` — Ticket detail with replies
- `POST /api/dashboard/tickets` — Create ticket
- `PUT /api/dashboard/tickets` — Update ticket (status, priority, assignee)
- `POST /api/dashboard/tickets/reply` — Add reply to ticket
- `DELETE /api/dashboard/tickets` — Delete ticket (admin only)
- `GET /api/dashboard/tickets?action=stats` — Ticket statistics
- `GET /api/dashboard/tickets?action=categories` — List categories
- `POST /api/dashboard/tickets/categories` — Manage categories

### Public (No Auth / Subscriber)
- `POST /api/[slug]/support/ticket` — Create external ticket
- `POST /api/[slug]/support/login` — Subscriber login
- `POST /api/[slug]/support/register` — Subscriber register
- `GET /api/[slug]/support/tickets` — List subscriber's tickets
- `POST /api/[slug]/support/reply` — Reply to ticket
- `POST /api/[slug]/support/rate` — Rate ticket satisfaction

### Platform Admin
- Platform support tickets (existing `support_tickets` table) remain as-is

---

## 7. Notification Events

| Event | Notify | Channel |
|-------|--------|---------|
| Ticket created | Assigned agent + IT admin | In-app + Email |
| Ticket assigned | Ticket creator + assignee | In-app + Email |
| New reply (agent) | Ticket creator | In-app + Email |
| New reply (customer) | Assigned agent | In-app + Email |
| Status changed | Ticket creator | In-app |
| SLA breach warning | Assigned agent + IT admin | In-app + Email |
| Ticket resolved | Ticket creator | In-app + Email (with rating link) |
| Ticket closed (auto) | All parties | In-app |

---

*Wa billahi at-tawfiq. Baarokallahu feekum.*
