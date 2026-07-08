# Email Marketing — Feature Spec

## Overview
A robust email marketing system built into iSchool, rivaling Mailchimp/AWeber, with AI-powered content creation, automation, segmentation, A/B testing, and detailed analytics. Uses the existing Gmail SMTP infrastructure, improved for scale.

---

## 1. Email Infrastructure
### 1.1 SMTP Configuration
- [ ] Use existing Gmail/Google Workspace SMTP (improved for rate limits)
- [ ] Support for multiple sending accounts (load balancing)
- [ ] Rate limiting: max 500 emails/hour per account, rotate accounts
- [ ] Bounce handling: parse bounce emails, suppress bounced addresses
- [ ] DKIM/SPF setup guidance for custom domains
- [ ] Fallback to alternative SMTP providers (SendGrid, etc.)

### 1.2 Deliverability
- [ ] Automatically warm up new sending accounts
- [ ] Throttle sending during peak hours
- [ ] Auto-retry failed sends with exponential backoff
- [ ] Track delivery status (sent/delivered/bounced/complained)
- [ ] Maintain suppression list (unsubscribes, bounces, complaints)

---

## 2. Subscriber Management
### 2.1 Subscriber Lists
- [ ] Create multiple lists (Parents, Staff, Students, Alumni, Prospects)
- [ ] Import subscribers (CSV, copy-paste)
- [ ] Export subscribers
- [ ] Custom fields per subscriber (name, grade, class, etc.)
- [ ] Bulk actions (add tags, move to list, delete)

### 2.2 Segmentation
- [ ] Segment by custom fields
- [ ] Segment by engagement (opened/clicked in last 30 days)
- [ ] Segment by subscription source
- [ ] Segment by tags
- [ ] Dynamic segments (auto-update based on rules)
- [ ] AI-suggested segments

### 2.3 Subscription Forms
- [ ] Generate embeddable subscription forms
- [ ] Custom form fields
- [ ] Double opt-in support
- [ ] Welcome email automation
- [ ] Auto-add to specific list

### 2.4 Auto-Import
- [ ] Auto-import parents from SIS
- [ ] Auto-import staff from HR module
- [ ] Auto-import students (if age-appropriate)
- [ ] Sync changes (new additions, removals)

---

## 3. Email Campaign Builder
### 3.1 Drag-and-Drop Editor
- [ ] Visual email template builder
- [ ] Pre-built blocks: header, text, image, button, divider, social
- [ ] Custom HTML block
- [ ] Mobile-responsive preview
- [ ] Dark mode preview
- [ ] Personalization tokens ({first_name}, {school_name}, etc.)

### 3.2 Template Library
- [ ] Pre-designed templates (newsletter, announcement, event, admission)
- [ ] School-branded templates (auto-use school colors, logo)
- [ ] Save custom templates
- [ ] AI template suggestions based on content

### 3.3 AI Content Integration
- [ ] AI generate email subject lines
- [ ] AI generate email body from topic
- [ ] AI optimize for open rates
- [ ] AI suggest send time
- [ ] AI repurpose blog post → email newsletter
- [ ] AI generate personalized content per segment

### 3.4 Rich Text Editor
- [ ] Use existing RichTextEditor component for HTML email content
- [ ] Inline image upload
- [ ] Link tracking
- [ ] Social share buttons

---

## 4. Campaign Management
### 4.1 Campaign Types
- [ ] Regular campaign (one-time send)
- [ ] Automated campaign (triggered by events)
- [ ] A/B test campaign
- [ ] RSS-to-email (auto-send when blog is updated)
- [ ] Recurring campaign (weekly/monthly newsletter)

### 4.2 Scheduling
- [ ] Send immediately
- [ ] Schedule for specific date/time
- [ ] Schedule for best time (AI)
- [ ] Time zone-aware sending
- [ ] Pause/resume scheduled campaigns

### 4.3 A/B Testing
- [ ] Test subject lines
- [ ] Test send times
- [ ] Test content variations
- [ ] Test from names
- [ ] Auto-send winner after test period
- [ ] Statistical significance reporting

### 4.4 Auto-Post Integration
- [ ] Auto-generate newsletter from recent blog posts
- [ ] Auto-generate from recent announcements
- [ ] Auto-generate from upcoming events
- [ ] Customizable auto-generation templates
- [ ] Review/edit before sending

---

## 5. Automation Workflows
### 5.1 Trigger-Based Automations
- [ ] Welcome series (new subscriber)
- [ ] Admission inquiry follow-up
- [ ] Birthday emails
- [ ] Event reminder emails
- [ ] Fee payment reminders
- [ ] Absent student notifications
- [ ] Re-engagement campaigns

### 5.2 Workflow Builder
- [ ] Visual workflow builder (trigger → conditions → actions)
- [ ] Delay/wait steps
- [ ] Conditional branching (if/else)
- [ ] Send email action
- [ ] Add/remove tag action
- [ ] Move to list action
- [ ] Webhook action

### 5.3 CMS Triggers
- [ ] Blog post published → send to subscribers
- [ ] Announcement published → notify parents
- [ ] Event created → send invites
- [ ] Gallery updated → share highlights

---

## 6. Analytics & Reporting
### 6.1 Campaign Analytics
- [ ] Open rate (unique and total)
- [ ] Click-through rate
- [ ] Click map (which links clicked)
- [ ] Bounce rate
- [ ] Unsubscribe rate
- [ ] Spam complaint rate
- [ ] Forward/share rate
- [ ] Delivery rate

### 6.2 Subscriber Analytics
- [ ] Growth trend (new vs unsubscribed)
- [ ] Engagement score per subscriber
- [ ] Most active subscribers
- [ ] At-risk subscribers (haven't opened in 90 days)
- [ ] Geographic distribution
- [ ] Device/email client breakdown

### 6.3 Reports
- [ ] Weekly/monthly performance reports
- [ ] Comparison reports (campaign vs campaign)
- [ ] Export to PDF/CSV
- [ ] Email scheduled reports to admin
- [ ] ROI tracking (if linked to admissions/fees)

---

## 7. Compliance
- [ ] CAN-SPAM compliance (physical address, unsubscribe link)
- [ ] GDPR compliance (consent tracking, right to be forgotten)
- [ ] One-click unsubscribe in every email
- [ ] Unsubscribe preferences (manage which lists)
- [ ] Suppression list management
- [ ] Bounce/complaint handling

---

## 8. Database Schema
### 8.1 email_lists table
- schoolId, name, description, subscriberCount, createdAt

### 8.2 email_subscribers table
- schoolId, listId, email, firstName, lastName, customFields (JSON),
  status (active/unsubscribed/bounced/complained), source,
  engagementScore, subscribedAt, unsubscribedAt

### 8.3 email_campaigns table
- schoolId, name, subject, fromName, fromEmail, replyTo,
  htmlContent, plainText, templateId, listId, segmentId,
  type (regular/automated/ab_test), status (draft/scheduled/sending/sent),
  scheduledAt, sentAt, abVariants (JSON), createdAt

### 8.4 email_campaign_stats table
- campaignId, sent, delivered, opens, uniqueOpens, clicks, uniqueClicks,
  bounces, unsubscribes, complaints, forwards, date

### 8.5 email_automations table
- schoolId, name, trigger (JSON), steps (JSON), status, createdAt

### 8.6 email_templates table
- schoolId, name, htmlContent, category, isDefault, createdAt

---

## 9. API Endpoints
- GET /api/dashboard/email/lists — list subscriber lists
- POST /api/dashboard/email/lists — create list
- POST /api/dashboard/email/lists/:id/import — import subscribers
- GET /api/dashboard/email/subscribers — list subscribers
- POST /api/dashboard/email/subscribers — add subscriber
- GET /api/dashboard/email/campaigns — list campaigns
- POST /api/dashboard/email/campaigns — create campaign
- PUT /api/dashboard/email/campaigns/:id — update campaign
- POST /api/dashboard/email/campaigns/:id/send — send/schedule campaign
- GET /api/dashboard/email/campaigns/:id/analytics — campaign analytics
- GET /api/dashboard/email/automations — list automations
- POST /api/dashboard/email/automations — create automation
- GET /api/dashboard/email/templates — list templates
- POST /api/dashboard/email/templates — save template
- POST /api/dashboard/email/ai/generate — AI generate content
- GET /api/dashboard/email/analytics — overall analytics

---

## 10. Dashboard Pages
- /dashboard/email — Overview dashboard
- /dashboard/email/campaigns — Campaign list
- /dashboard/email/composer — Campaign builder
- /dashboard/email/lists — Subscriber lists
- /dashboard/email/subscribers — Subscriber management
- /dashboard/email/automations — Automation workflows
- /dashboard/email/templates — Template library
- /dashboard/email/analytics — Analytics dashboard
