# GMB (Google My Business) Integration — Feature Spec

## Overview
Allow each school to connect or create a Google My Business (GMB) listing, manage it from their admin dashboard, and auto-populate rich profile data for maximum visibility on Google Search and Maps.

---

## 1. Onboarding Integration
### 1.1 GMB Step in Onboarding Flow
- [ ] Add a new step in school onboarding (after plan selection, before done)
- [ ] Ask: "Do you already have a Google My Business listing?"
  - [ ] If YES: Show Google OAuth connect button
  - [ ] If NO: Offer to auto-create a GMB profile using school data
- [ ] If SKIP: Allow proceeding without GMB (can connect later)

### 1.2 Auto-Create GMB Profile
- [ ] Use school name, address, phone, website URL from onboarding data
- [ ] Pre-fill GMB business category (Primary/Secondary School)
- [ ] Generate business description from school tagline + about page
- [ ] Set service areas based on school address
- [ ] Set business hours (school hours from timetable or default 8am-3pm)
- [ ] Upload school logo as business photo
- [ ] Submit to GMB API for verification

---

## 2. Google OAuth Integration
### 2.1 OAuth Flow
- [ ] Register Google OAuth credentials (client ID + secret)
- [ ] Request scopes: business.manage, business.business communications
- [ ] Implement OAuth callback handler
- [ ] Store refresh tokens securely (encrypted in DB)
- [ ] Handle token refresh automatically

### 2.2 Token Management
- [ ] Store encrypted access + refresh tokens per school
- [ ] Auto-refresh expired access tokens
- [ ] Handle revoked permissions gracefully
- [ ] Allow disconnect/reconnect from dashboard

---

## 3. Dashboard GMB Management
### 3.1 GMB Overview Page (/dashboard/gmb)
- [ ] Show connection status (Connected / Not Connected)
- [ ] Show GMB profile summary (name, category, verification status)
- [ ] Show key metrics (views, searches, calls, direction requests)
- [ ] Show recent reviews with response capability

### 3.2 Business Profile Editor
- [ ] Edit business name, category, description
- [ ] Edit address, service areas
- [ ] Edit phone, website URL
- [ ] Edit business hours
- [ ] Manage business photos (upload, delete, reorder)
- [ ] Manage attributes (wheelchair accessible, parking, etc.)

### 3.3 Posts Management
- [ ] Create GMB posts (COVID updates, offers, events, what's new)
- [ ] Schedule posts for future publishing
- [ ] View and delete existing posts
- [ ] Auto-post from CMS announcements/blog posts

### 3.4 Reviews Management
- [ ] List all reviews with star ratings
- [ ] Respond to reviews directly from dashboard
- [ ] Review response templates
- [ ] Review analytics (average rating, trend)

### 3.5 Q&A Management
- [ ] View and answer public questions
- [ ] Auto-suggest answers from school FAQs

### 3.6 Insights/Analytics
- [ ] Search queries that led to profile
- [ ] Customer actions (calls, directions, website clicks)
- [ ] Photo views
- [ ] Direction requests heatmap

---

## 4. Auto-Sync Features
### 4.1 CMS → GMB Auto-Sync
- [ ] When school about page is updated → sync GMB description
- [ ] When school contact info is updated → sync GMB contact
- [ ] When announcement is published → auto-create GMB post
- [ ] When event is created → auto-create GMB event post
- [ ] When gallery photos are added → sync to GMB photos

### 4.2 SEO Integration
- [ ] Inject GMB review schema into school public site
- [ ] Add GMB rating widget to school homepage
- [ ] Sync school website URL to GMB
- [ ] Generate Google-rich review snippets

---

## 5. Database Schema
### 5.1 gmb_connections table
- schoolId, googleAccountId, accessToken (encrypted), refreshToken (encrypted),
  tokenExpiry, businessId, businessName, verificationStatus, connectedAt

### 5.2 gmb_posts table
- schoolId, gmbPostId, title, content, imageUrl, postType, startDate,
  endDate, status, syncedAt

### 5.3 gmb_reviews table
- schoolId, reviewId, author, rating, comment, response, responseAt,
  reviewDate, syncedAt

### 5.4 gmb_insights table
- schoolId, date, views, searches, calls, directions, websiteClicks,
  photoViews, createdAt

---

## 6. API Endpoints
- GET /api/dashboard/gmb/status — connection status
- POST /api/dashboard/gmb/connect — initiate OAuth
- GET /api/dashboard/gmb/callback — OAuth callback
- POST /api/dashboard/gmb/disconnect — revoke connection
- GET /api/dashboard/gmb/profile — get business profile
- PUT /api/dashboard/gmb/profile — update business profile
- GET /api/dashboard/gmb/posts — list GMB posts
- POST /api/dashboard/gmb/posts — create GMB post
- DELETE /api/dashboard/gmb/posts/:id — delete GMB post
- GET /api/dashboard/gmb/reviews — list reviews
- POST /api/dashboard/gmb/reviews/:id/respond — respond to review
- GET /api/dashboard/gmb/insights — get analytics

---

## 7. Compliance & Policy
- Follow Google My Business API terms of service
- Only post legitimate business content
- No spam or duplicate postings
- Respect Google's content policies
- Rate limit API calls to stay within quotas
- Handle API errors gracefully with user-friendly messages
