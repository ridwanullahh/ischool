# Social Media Management — Feature Spec

## Overview
A full-featured social media management system integrated into iSchool, rivaling Hootsuite/Buffer, with AI-powered content creation, scheduling, auto-posting, and analytics. Seamlessly integrated with CMS post types for auto-posting.

---

## 1. Social Account Connections
### 1.1 Supported Platforms
- [ ] Facebook (Pages)
- [ ] Instagram (Business accounts)
- [ ] Twitter/X
- [ ] LinkedIn (Company pages)
- [ ] YouTube (Community posts)
- [ ] WhatsApp Business (status updates)
- [ ] Telegram (channel posts)
- [ ] TikTok (business accounts)

### 1.2 OAuth Connection Flow
- [ ] Per-platform OAuth connect buttons
- [ ] Store access tokens securely (encrypted)
- [ ] Auto-refresh expired tokens
- [ ] Connection status indicators
- [ ] Disconnect/reconnect capability
- [ ] Multi-account support (e.g., multiple Facebook pages)

### 1.3 Connection Management
- [ ] Dashboard showing all connected accounts
- [ ] Account health status (token valid/expired)
- [ ] Account sync settings (which post types auto-post)
- [ ] Default posting schedule per account

---

## 2. Content Calendar
### 2.1 Calendar View
- [ ] Monthly/weekly/daily calendar grid
- [ ] Drag-and-drop scheduling
- [ ] Color-coded by platform/status
- [ ] Filter by platform, status, post type
- [ ] Timezone-aware scheduling

### 2.2 Calendar Features
- [ ] Click date to create post
- [ ] Click scheduled post to edit
- [ ] Bulk reschedule (drag multiple)
- [ ] Best time to post suggestions (AI)
- [ ] Holiday/event overlay
- [ ] Export to iCal/Google Calendar

---

## 3. Post Composer
### 3.1 Multi-Platform Composer
- [ ] Write once, customize per platform
- [ ] Platform-specific character limits
- [ ] Image/video upload with platform-specific sizing
- [ ] Emoji picker
- [ ] Hashtag suggestions (AI)
- [ ] URL shortener integration
- [ ] @mention support
- [ ] Platform-specific preview

### 3.2 AI-Powered Content
- [ ] AI generate post text from topic/prompt
- [ ] AI suggest hashtags
- [ ] AI optimize for engagement
- [ ] AI generate image descriptions (accessibility)
- [ ] AI repurpose blog post → social posts
- [ ] AI suggest best posting time

### 3.3 Media Management
- [ ] Upload images/videos
- [ ] Image cropping/resizing per platform
- [ ] Media library with search
- [ ] Stock image integration
- [ ] AI image generation
- [ ] Video thumbnail selection

### 3.4 Link in Bio
- [ ] Generate link-in-bio page per school
- [ ] Track link clicks
- [ ] Schedule link rotation

---

## 4. Scheduling & Auto-Posting
### 4.1 Scheduling
- [ ] Schedule for specific date/time
- [ ] Schedule for best time (AI)
- [ ] Queue-based scheduling
- [ ] Time zone management
- [ ] Recurring post schedules
- [ ] Schedule in bulk (CSV upload)

### 4.2 Auto-Posting from CMS
- [ ] Auto-post blog posts when published
- [ ] Auto-post announcements when published
- [ ] Auto-post events when created
- [ ] Auto-post gallery photos
- [ ] Customize auto-post template per post type
- [ ] Enable/disable auto-post per platform
- [ ] Review/edit before auto-post (optional)

### 4.3 Posting Queue
- [ ] View all queued posts
- [ ] Reorder queue
- [ ] Pause/resume queue
- [ ] Failed post retry
- [ ] Post history log

---

## 5. Analytics & Reporting
### 5.1 Dashboard Metrics
- [ ] Total reach, impressions, engagement
- [ ] Follower growth trends
- [ ] Best performing posts
- [ ] Engagement rate by platform
- [ ] Click-through rates
- [ ] Audience demographics

### 5.2 Per-Post Analytics
- [ ] Likes, comments, shares, saves
- [ ] Reach and impressions
- [ ] Click-through rate
- [ ] Engagement rate
- [ ] Comment management

### 5.3 Reports
- [ ] Weekly/monthly summary reports
- [ ] Export to PDF/CSV
- [ ] Email scheduled reports
- [ ] Competitor benchmarking
- [ ] Hashtag performance

---

## 6. Comment & Message Management
### 6.1 Unified Inbox
- [ ] Aggregate comments from all platforms
- [ ] Aggregate DMs from all platforms
- [ ] Reply from dashboard
- [ ] Mark as resolved
- [ ] AI suggested replies
- [ ] Auto-respond templates

### 6.2 Comment Moderation
- [ ] Auto-hide spam/toxic comments (AI)
- [ ] Keyword filtering
- [ ] Bulk actions (approve, hide, delete)

---

## 7. Team Collaboration
- [ ] Multiple team members per school
- [ ] Role-based permissions (admin, editor, viewer)
- [ ] Approval workflow for posts
- [ ] Activity log

---

## 8. Database Schema
### 8.1 social_accounts table
- schoolId, platform, accountId, accountName, accessToken (encrypted),
  refreshToken (encrypted), tokenExpiry, profileUrl, followersCount,
  isConnected, autoPostSettings (JSON), connectedAt

### 8.2 social_posts table
- schoolId, platformPostId, platform, content, mediaUrls (JSON),
  scheduledAt, publishedAt, status (draft/scheduled/published/failed),
  postType (manual/auto_blog/auto_announcement/auto_event), cmsPostId,
  analytics (JSON), createdAt

### 8.3 social_analytics table
- schoolId, accountId, date, followers, impressions, engagement,
  clicks, createdAt

### 8.4 social_comments table
- schoolId, postId, platform, commentId, author, text, timestamp,
  isResolved, response, responseAt

---

## 9. API Endpoints
- GET /api/dashboard/social/accounts — list connected accounts
- POST /api/dashboard/social/connect/:platform — initiate OAuth
- GET /api/dashboard/social/callback/:platform — OAuth callback
- POST /api/dashboard/social/disconnect/:platform — disconnect
- GET /api/dashboard/social/posts — list scheduled/published posts
- POST /api/dashboard/social/posts — create/schedule post
- PUT /api/dashboard/social/posts/:id — update post
- DELETE /api/dashboard/social/posts/:id — delete post
- GET /api/dashboard/social/calendar — calendar data
- GET /api/dashboard/social/analytics — analytics dashboard
- GET /api/dashboard/social/comments — unified inbox
- POST /api/dashboard/social/comments/:id/respond — reply to comment
- POST /api/dashboard/social/auto-post — trigger auto-post from CMS

---

## 10. Dashboard Pages
- /dashboard/social — Overview dashboard
- /dashboard/social/composer — Post composer
- /dashboard/social/calendar — Content calendar
- /dashboard/social/accounts — Account management
- /dashboard/social/analytics — Analytics
- /dashboard/social/inbox — Unified inbox
