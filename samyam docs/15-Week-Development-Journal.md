# Holistic Mind — 15-Week Daily Development Journal

**Project:** Holistic Mind Mobile Wellness Application  
**Duration:** 15 weeks  
**Format:** Five working days per week  

## Week 1 — Project Research and Idea Development

### Day 1

Today I started thinking about the main purpose of my project. I decided to create a mobile wellness application that would give users a private and supportive space for checking in with themselves, journaling, and practising simple wellbeing exercises. I chose the name **Holistic Mind** because the application is intended to support emotional, mental, and physical wellbeing together.

### Day 2

I researched existing mental health and wellness applications to understand their common features, strengths, and weaknesses. I noticed that many applications felt either too clinical or too crowded. This helped me decide that Holistic Mind should have a gentle visual style, simple language, and a clear daily routine that would not overwhelm the user.

### Day 3

I identified the target users and wrote down the main problems the application should solve. The intended users are people who want to reflect on their mood, build a regular self-care habit, and access short exercises when they feel stressed or emotionally unsettled. I also decided that privacy and ease of use would be important requirements.

### Day 4

I listed the core features for the first version of the application. These included account creation and login, onboarding questions, a home dashboard, daily check-ins, journal entries, personalised recommendations, an exercise library, and a user profile. I separated these into essential and optional features so that the development scope would remain realistic.

### Day 5

I prepared an initial development plan and divided the project into stages. The plan covered research, design, mobile development, backend development, database integration, content management, testing, and documentation. At the end of the week, I had a clearer understanding of the project goal and the work required to complete it.

## Week 2 — Requirements and System Planning

### Day 1

Today I converted the project idea into functional requirements. I described what users should be able to do, such as sign up, complete onboarding, record a daily check-in, write a journal entry, receive a recommendation, browse exercises, and manage basic profile settings. This gave me a checklist that I could use throughout development.

### Day 2

I considered the non-functional requirements of the application. I wanted the interface to feel calm and responsive, the user data to remain separated between accounts, and authentication information to be stored securely. I also planned for the application to work well in an iOS simulator and eventually on a physical phone.

### Day 3

I planned the overall system architecture. I chose an Expo React Native mobile application, a Node.js and Express backend, and PostgreSQL for persistent data. I also planned to use object storage for exercise images and videos, because large media files should not be stored directly inside the mobile application or database.

### Day 4

I planned the main database entities and their relationships. The initial design included users, user profiles, authentication sessions, onboarding responses, daily check-ins, journal entries, exercises, and exercise media. I made sure that all private wellness records would be linked to the authenticated user's unique ID.

### Day 5

I reviewed the requirements and created a development sequence. I decided to build the main mobile screens first, then connect authentication and wellness data, and finally implement the exercise management system. This order allowed me to see the user journey early while keeping the more complex backend work manageable.

## Week 3 — Interface Design and User Journey

### Day 1

Today I mapped the complete user journey from opening the application to completing a wellness activity. The flow starts with a welcome screen, continues through signup or login and onboarding, and then takes the user to the main tab navigation. From there, users can access Home, Journal, Explore, and Profile.

### Day 2

I planned the visual identity of Holistic Mind. I selected soft natural colours, rounded cards, comfortable spacing, friendly typography, and botanical or body-based illustrations. My aim was to create an interface that feels warm and reassuring instead of looking like a medical system.

### Day 3

I designed the welcome and onboarding experience. The onboarding questions were planned to collect a support goal, age range, and preferred daily practice time. I kept the questions short so users could personalise the app without completing a long form.

### Day 4

I designed the home dashboard and decided what information should be prioritised. The main sections included a greeting, a daily check-in card, recommended tools, and a progress summary. I wanted the user to understand what to do next as soon as they opened the application.

### Day 5

I planned the Journal, Explore, exercise detail, and Profile screens. I also reviewed navigation consistency, button placement, and reusable card patterns. By the end of the week, I had a coherent screen structure and was ready to begin implementing the application.

## Week 4 — Mobile Project Setup and Navigation

### Day 1

Today I set up the Expo React Native project with TypeScript. I installed the main dependencies and organised the source code into screens, services, data, navigation, context, configuration, and shared types. This structure made it easier to keep user-interface code separate from data-access logic.

### Day 2

I configured styling for the application and added the required visual assets. I prepared the application icon, splash image, onboarding illustrations, welcome images, and supporting decorative elements. I checked that the assets displayed correctly at different screen sizes.

### Day 3

I implemented the main application navigation. I created a navigation flow for welcome, authentication, onboarding, and the signed-in application. I also added the bottom tabs for Home, Journal, Explore, and Profile so users could move easily between the main areas.

### Day 4

I created the welcome screens and tested their layout in the iOS simulator. I adjusted image positioning, text width, spacing, safe-area handling, and call-to-action buttons. This work helped establish the final visual style used across the rest of the application.

### Day 5

I reviewed the project structure and ran TypeScript checks to find early coding problems. I corrected import paths, missing types, and navigation definitions. At the end of the week, the basic application could launch and move through its initial screen flow.

## Week 5 — Onboarding and Personalisation

### Day 1

Today I developed the first onboarding page and introduced the purpose of the application. I used supportive wording and calm illustrations to make the experience feel welcoming. I also added progress indicators so the user could see that onboarding would be short.

### Day 2

I implemented the support-goal selection. Users can choose the area in which they would most like support, and the selected option is clearly highlighted. I planned this value so it could later influence personalised exercise recommendations.

### Day 3

I added the age-range and preferred-time questions. I used simple selectable options instead of open text fields to keep the experience quick and consistent. I also added validation so the user could not accidentally continue without making the required selection.

### Day 4

I created the onboarding summary and completion flow. The summary explains how daily check-ins, reflective journaling, and short practices work together inside Holistic Mind. I connected the completion action to the main application so the user could enter the Home screen.

### Day 5

I tested the whole onboarding journey several times. I corrected back-button behaviour, selected-state styling, screen spacing, and small text issues. I also prepared the onboarding data structure for later storage under a real authenticated user account.

## Week 6 — Home Screen and Daily Check-In

### Day 1

Today I built the main Home screen layout. I added a personalised greeting area and organised the content into reusable sections. I focused on visual hierarchy so the daily check-in remained the most obvious action on the page.

### Day 2

I developed the Daily Check-In card. The check-in allows the user to record how they are feeling and provide simple information about their current state. I made the interaction quick because a daily feature needs to be easy enough to use consistently.

### Day 3

I created the Recommended Tools section for displaying useful exercises. I designed the cards so they could show a title, category, short description, and visual cue. At this stage, the recommendations used local data while I prepared for the later backend connection.

### Day 4

I implemented the Progress Summary component. This section was designed to help users see that small daily actions contribute to a larger wellbeing habit. I kept the presentation encouraging and avoided using language that could make a user feel judged for missing a day.

### Day 5

I tested the Home screen with different content lengths and device sizes. I fixed scrolling, card spacing, and layout problems around the safe area and bottom navigation. I also refactored repeated interface elements so the screen would be easier to maintain.

## Week 7 — Journal and Wellness Content

### Day 1

Today I created the Journal screen. I added a reflection prompt, a writing area, and an action for saving an entry. The design gives the user enough space to write while maintaining the soft and private feeling of the rest of the application.

### Day 2

I planned the journal entry data structure. Each entry needed its own identifier, prompt, written content, creation time, update time, and user ownership. I also considered how previous entries would be displayed without making the screen feel cluttered.

### Day 3

I added a list of earlier journal entries and handled empty states. When no entry exists, the screen now gives the user a gentle invitation to begin writing. I also added basic validation to prevent blank entries from being saved.

### Day 4

I prepared structured wellness content for the application. This included check-in choices, journal prompts, exercise categories, supportive descriptions, and recommendation tags. I reviewed the wording carefully because wellbeing content needs to be clear, respectful, and non-judgemental.

### Day 5

I tested the journal interaction, including keyboard behaviour, scrolling, saving, and reopening entries in the list. I corrected several small user-interface issues and separated the screen logic from the future API service. This made the Journal screen ready for persistent backend storage.

## Week 8 — Explore Library and Exercise Experience

### Day 1

Today I developed the Explore screen for browsing the wellness exercise library. I organised exercises into categories and created cards that show the exercise name, description, and relevant image or icon. The aim was to help users find a suitable practice without needing to search through long text.

### Day 2

I created the initial exercise catalogue and defined shared TypeScript types. The catalogue includes practices for grounding, breathing, emotional regulation, gentle movement, and reflection. I also included metadata such as guidance type, duration, tags, and linked practice IDs.

### Day 3

I implemented the exercise detail screen. The screen shows the exercise title, illustration, explanation, step-by-step guidance, and a clear **Start practice** action. I kept the exercise instructions readable and avoided placing too many controls on the screen.

### Day 4

I added support for guided breathing and video-based exercises. For video activities, the illustration remains visible at first, and the video player appears only after the user chooses to start. This creates a calmer introduction and prevents media from playing unexpectedly.

### Day 5

I tested navigation between Explore and the exercise details. I checked category filtering, missing images, long descriptions, video loading states, and the return path to the catalogue. I fixed layout and data-mapping problems found during the tests.

## Week 9 — Backend and Database Foundation

### Day 1

Today I set up the Node.js and Express backend. I created separate areas for configuration, database access, routes, middleware, authentication, scripts, and storage. I also added health and readiness endpoints so I could confirm that the server and database were operating correctly.

### Day 2

I configured PostgreSQL using Docker Compose. I chose a local port that would not conflict with another database service and added pgAdmin to make the database easier to inspect. I tested the connection from the backend before creating the application tables.

### Day 3

I wrote the database migration script. It creates tables for users, profiles, sessions, onboarding responses, daily check-ins, journal entries, exercises, and exercise media. I included keys and constraints to maintain data relationships and prevent invalid records.

### Day 4

I implemented a reusable database connection layer and environment configuration. Sensitive values such as database credentials, token secrets, and administrator keys were moved into environment files rather than hard-coded into the source. I also ensured these local secrets would not be committed.

### Day 5

I tested migrations, database readiness, and basic server error handling. I used pgAdmin to inspect the generated tables and confirm that their columns matched the planned model. At the end of the week, the backend and PostgreSQL foundation were ready for feature development.

## Week 10 — Authentication and User Sessions

### Day 1

Today I implemented backend user registration. New users receive a unique ID, and their password is hashed before being stored. A related user profile is also created so profile information can remain separate from authentication data.

### Day 2

I implemented login and token-based authentication. The backend issues short-lived access tokens and longer-lived refresh sessions. I added authentication middleware that verifies the token and places the trusted user identity on protected requests.

### Day 3

I developed the mobile signup and login screens and connected them to the authentication API. I added loading states, validation, and useful error messages for incorrect or incomplete details. I also checked that passwords were never displayed or logged accidentally.

### Day 4

I created an authentication context for managing the signed-in state across the application. Session details are stored in secure device storage so returning users can remain logged in after restarting the app. I also implemented logout so the refresh session is revoked and the local secure data is removed.

### Day 5

I tested signup, login, token refresh, restarting the app, and logout. I added a backend smoke-test script to verify the important authentication paths. I also tested two different accounts to confirm that one user could not access another user's private information.

## Week 11 — Persistent Wellness Data

### Day 1

Today I created protected backend routes for onboarding responses. Each response is stored against the server-verified user ID rather than an ID supplied freely by the mobile client. This reduces the risk of one user writing information into another user's account.

### Day 2

I connected the onboarding screen to the backend. Completing onboarding now creates or updates one response for the signed-in user. I also added a read operation so saved answers can be restored when needed.

### Day 3

I implemented the daily check-in API and database logic. A user can create or update their check-in for a particular date, and the application can request the latest check-in. This avoids creating accidental duplicate records when a user changes an answer on the same day.

### Day 4

I implemented journal API routes for creating and listing entries. Journal entries are stored as separate records and are returned only to their owner. I then connected the Journal screen to these endpoints and added loading, success, error, and empty states.

### Day 5

I tested onboarding, check-ins, and journals with multiple accounts. I verified the data directly in PostgreSQL and confirmed that every record contained the correct user ID. I also checked that private journal text was not included in backend request logs.

## Week 12 — Personalised Recommendation System

### Day 1

Today I defined the inputs for the recommendation system. The system considers the user's onboarding support goal, latest check-in answers, and themes found in recent journal entries. I used clear rule-based logic so the recommendations would remain understandable and predictable.

### Day 2

I added recommendation tags to exercises. Tags represent needs and themes such as grounding, stress relief, sleep, confidence, emotional release, breathing, and gentle movement. These tags allow user responses to be matched with appropriate practices.

### Day 3

I implemented the first recommendation engine in the mobile application. I tested different combinations of onboarding goals and check-in values and adjusted the scoring so one signal would not dominate every result. I also included sensible default recommendations when little user data was available.

### Day 4

I moved the recommendation process behind a backend route. This allowed the server to combine authenticated user data without exposing unnecessary records to the mobile client. The backend examines a limited number of recent journal entries and returns suitable published exercises.

### Day 5

I connected the Home screen's Recommended Tools section to the recommendation API. I tested new users, users without journal entries, and users with different support needs. I also added fallback behaviour so the Home screen still provides useful content if the recommendation request fails.

## Week 13 — Backend-Managed Exercise Catalogue

### Day 1

Today I designed the database-backed exercise catalogue. Exercise records include the name, category, description, guidance type, source page, linked practice ID, display order, status, image URL, and recommendation tags. I included published, draft, and archived states to support content management.

### Day 2

I created a seed script and imported the starter set of 60 exercises into PostgreSQL. I checked that identifiers were stable and that repeated seeding would update the intended records rather than create duplicates. This made the database the central source for Explore content.

### Day 3

I implemented public exercise endpoints for listing published exercises and retrieving one published exercise. I also created protected administrator endpoints for viewing all records, creating exercises, and updating exercise details or status. Draft and archived items are excluded from the mobile catalogue.

### Day 4

I connected the Explore screen and exercise detail screen to the new catalogue API. Backend-edited names, descriptions, images, and tags can now appear in the app. I added pull-to-refresh, refresh-on-focus, periodic catalogue checking, and fallback handling for connection problems.

### Day 5

I tested catalogue sorting, publishing, drafts, archives, missing records, and network failures. I corrected several mappings between database fields and mobile types. I also checked that a change made on the backend was reflected in both Explore and the exercise detail screen.

## Week 14 — Media Storage and Admin Dashboard

### Day 1

Today I configured MinIO object storage for exercise images and videos. I created a storage service in the backend and planned a signed-upload process so large files could be uploaded directly to storage. PostgreSQL keeps only the final URL and media metadata rather than the file bytes.

### Day 2

I implemented the exercise media endpoints and a command-line upload script. The process requests temporary upload permission, uploads the selected file, verifies that it exists, and then saves its information in the database. I tested supported image and video formats and handled invalid upload requests.

### Day 3

I created a separate React and Vite administrator dashboard. It uses an administrator API key and displays exercises in a searchable list, including published, draft, and archived items. Selecting an item opens an editing form with the fields needed to manage the catalogue.

### Day 4

I added image and video management to the dashboard. An administrator can upload or replace media, preview the current files, and permanently delete an exercise video after confirmation. I also added status, ordering, category, guidance type, linked practice, and recommendation-tag controls.

### Day 5

I tested the complete media workflow from the dashboard to MinIO, PostgreSQL, the backend API, and the mobile app. I confirmed that updated images appeared in Explore and that a video opened after pressing **Start practice**. I improved error messages for incorrect admin keys, unsupported files, failed uploads, and missing media.

## Week 15 — Testing, Refinement, and Documentation

### Day 1

Today I performed end-to-end testing of the main user journey. I created a new account, completed onboarding, submitted a daily check-in, wrote a journal entry, viewed recommendations, opened exercises, updated the profile, restarted the app, and logged out. I recorded and fixed the issues that appeared during this process.

### Day 2

I tested privacy and authentication boundaries with multiple user accounts. I confirmed that onboarding responses, daily check-ins, and journal entries remained isolated by user ID. I also retested token refresh, revoked sessions, unauthorised requests, and administrator-only routes.

### Day 3

I ran TypeScript checks and production builds for the mobile code, backend, and administrator dashboard. I fixed remaining type problems, inconsistent API responses, unused code, and minor interface issues. I also checked server health, database readiness, Docker service status, and media availability.

### Day 4

I completed the project documentation. I documented first-time setup, everyday startup commands, environment files, Docker services, database access, API endpoints, exercise management, media uploads, physical-device configuration, testing commands, and common troubleshooting steps.

### Day 5

Today I completed a final review of Holistic Mind and compared the result with the original requirements. The application now includes secure authentication, per-user onboarding, daily check-ins, persistent journals, personalised recommendations, a managed exercise library, guided and video practices, an administrator dashboard, and profile controls. I reflected on the project and recognised that it strengthened my skills in mobile development, backend APIs, database design, authentication, storage, testing, interface design, and technical documentation.

## Final Reflection

During these 15 weeks, I developed Holistic Mind from an initial wellbeing application idea into a working full-stack mobile system. The project required me to connect several different areas of software development: user research, interface design, React Native, navigation, Node.js APIs, PostgreSQL, authentication, recommendation logic, object storage, media playback, an administrator dashboard, and documentation.

One of the most important lessons I learned was that a successful application is not only a collection of screens. The data model, privacy rules, backend behaviour, error handling, content structure, and user experience all need to support one another. I also learned the value of building in stages and testing every new part against the complete user journey.

If I continue developing Holistic Mind, I would consider adding password recovery, email verification, Google or Apple sign-in, reminder notifications, stronger protection for stored journal text, richer progress insights, accessibility testing, automated mobile tests, and deployment to a hosted production environment.
