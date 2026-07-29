# Holistic Mind — 15-Week Weekly Development Journal

**Project:** Holistic Mind Mobile Wellness Application  
**Duration:** 15 weeks

## Week 1 — Project Research and Idea Development

During the first week, I developed the initial idea for Holistic Mind. I wanted to create a mobile wellness application that would give users a calm and private space to reflect on their wellbeing. I researched existing mental health and wellness applications to understand their features, strengths, and limitations. From this research, I decided that my application should focus on daily emotional check-ins, journaling, simple wellness exercises, and personalised support. I also identified the target users as people who want to manage stress, understand their emotions, and build regular self-care habits.

**What I used:** I used online research, competitor analysis, feature comparison, and written notes to investigate existing wellness applications. I compared their navigation, visual style, onboarding, journaling tools, and approaches to privacy. This helped me prepare the first project concept, target-user description, problem statement, and list of possible features.

## Week 2 — Requirements and Project Planning

This week, I defined the main functional and non-functional requirements of the application. The core features included signup and login, onboarding, a home dashboard, daily check-ins, journal entries, personalised recommendations, an exercise library, and profile settings. I also considered important requirements such as privacy, secure authentication, responsive performance, and ease of use. After identifying the requirements, I divided the project into development stages covering design, mobile development, backend development, database integration, testing, and documentation.

**What I used:** I used a requirements checklist, feature prioritisation, system-planning notes, and a week-by-week schedule. I selected Expo and React Native for the mobile application, TypeScript for type-safe development, Node.js and Express for the API, PostgreSQL for persistent data, and object storage for images and videos. I also drafted the main database entities and considered how user-owned data would be protected.

## Week 3 — User Journey and Interface Design

In the third week, I planned the complete user journey. I mapped how a new user would move from the welcome screen to account creation, onboarding, and the main application. I decided that the primary navigation would include Home, Journal, Explore, and Profile sections. I also developed the visual direction of Holistic Mind by selecting soft natural colours, rounded cards, friendly typography, botanical illustrations, and comfortable spacing. My goal was to make the application feel supportive and calming instead of overly clinical.

**What I used:** I used user-flow diagrams, screen sketches, colour and typography references, and reusable component planning. I reviewed the position of navigation controls, buttons, cards, headings, and form fields before development. These design decisions became a consistent visual system that I could follow when building each screen.

## Week 4 — Mobile Application Setup

This week, I created the Expo React Native project and configured it to use TypeScript. I organised the project into separate folders for screens, navigation, services, configuration, context, data, and shared types. I installed the necessary packages and configured the styling system. I also added application assets such as icons, splash images, welcome backgrounds, and onboarding illustrations. After completing the setup, I implemented the basic navigation structure and tested the application in the iOS simulator.

**What I used:** I used Expo SDK, React Native, React 19, TypeScript, npm, React Navigation, NativeWind, Tailwind CSS, React Native Safe Area Context, and Lucide React Native icons. I used Expo configuration files for the application icon and splash screen and the iOS Simulator to check layout, safe areas, navigation, and asset scaling.

## Week 5 — Welcome and Onboarding Development

During the fifth week, I developed the welcome and onboarding screens. The onboarding process introduces the purpose of Holistic Mind and asks users about their support goal, age range, and preferred daily practice time. I added progress indicators, selectable options, validation, and clear navigation controls. I also created an onboarding summary explaining how check-ins, journaling, and wellness practices work together. I tested the complete onboarding journey and corrected issues involving spacing, selection states, back-button behaviour, and screen transitions.

**What I used:** I used React Native components, TypeScript state, NativeWind styling, reusable option cards, and React Navigation's native stack. I stored each answer in the onboarding flow's state, added validation before moving forward, and tested both the forward and backward paths to ensure answers and selection styles remained consistent.

## Week 6 — Home Screen and Daily Check-In

This week, I built the main Home screen. I added a personalised greeting, a daily check-in card, recommended wellness tools, and a progress summary. The daily check-in was designed to let users quickly record how they are feeling and provide information about their current emotional state. I made the interaction simple because it is intended to be used regularly. I also created reusable components for the different Home sections and tested the screen with different device sizes and content lengths.

**What I used:** I used React Native scrollable layouts, reusable TypeScript components, local content data, icons, images, and component state. I tested different text lengths, screen sizes, safe-area spacing, and bottom-tab clearance. At this stage, local placeholder data allowed me to complete and evaluate the interface before connecting it to the API.

## Week 7 — Journal Feature and Wellness Content

In the seventh week, I developed the Journal screen. I added reflective prompts, a writing area, validation, a save action, and a section for displaying previous entries. I planned each journal record to contain a unique identifier, prompt, content, timestamps, and user ownership. I also prepared the wellness content used throughout the application, including check-in choices, journal prompts, exercise categories, descriptions, and recommendation themes. I tested keyboard behaviour, scrolling, empty states, and the journal-saving interaction.

**What I used:** I used React Native text inputs, keyboard-aware screen behaviour, ScrollView layouts, TypeScript interfaces, state management, and structured local data. I created validation to reject empty entries and designed entry cards and empty states. Separating the screen from its data service also prepared it for the later PostgreSQL and API connection.

## Week 8 — Explore and Exercise Features

This week, I developed the Explore section and the exercise experience. I created a catalogue containing wellness practices related to grounding, breathing, emotional regulation, gentle movement, and reflection. I designed exercise cards and organised them into categories so users could find suitable activities easily. I also built the exercise detail screen with a title, illustration, description, instructions, and a **Start practice** button. Support was added for guided breathing and video-based exercises, and I tested navigation, filtering, media states, and different content lengths.

**What I used:** I used shared TypeScript exercise types, React Native cards and lists, category filters, React Navigation route parameters, Expo Video, SVG support, and local image assets. The exercise model included fields such as category, duration, guidance type, tags, instructions, and media information so the same data could support catalogue cards, detail pages, recommendations, and videos.

## Week 9 — Backend and Database Setup

During the ninth week, I started developing the backend using Node.js and Express. I organised the server into configuration, routes, middleware, authentication, database, scripts, and storage areas. I configured PostgreSQL and pgAdmin through Docker Compose and connected the backend to the database. I then created a migration script for users, profiles, sessions, onboarding responses, daily check-ins, journal entries, exercises, and exercise media. I also added server health and database-readiness endpoints and tested that the database tables were created correctly.

**What I used:** I used Node.js, Express 5, TypeScript, tsx, PostgreSQL 16, the `pg` database driver, Docker Compose, and pgAdmin. Environment variables were managed with dotenv, request data was checked with Zod, and the database schema was created through a repeatable migration script. I used health endpoints, SQL inspection in pgAdmin, and server logs to confirm the API and database were communicating correctly.

## Week 10 — Authentication and Secure Sessions

This week, I implemented the authentication system. New users can create an account, and their passwords are securely hashed before being stored. I implemented login using access tokens and refresh sessions, along with middleware for protecting private API routes. On the mobile side, I connected the signup and login screens to the backend and created an authentication context for managing the user's session. Session information is stored securely on the device, allowing returning users to remain logged in. I also implemented logout and tested signup, login, session refresh, application restart, and account separation.

**What I used:** I used Argon2 for password hashing, JOSE for signed access tokens, PostgreSQL for refresh-session records, and Express middleware for route protection. I added Helmet, CORS, and rate limiting to strengthen API security. In the mobile application, I used React Context for authentication state, Expo Secure Store for device-side token storage, and service functions for signup, login, refresh, restoration, and logout.

## Week 11 — Persistent User Wellness Data

In the eleventh week, I connected the wellness features to the backend. Onboarding answers are now stored against the authenticated user's server-verified ID. I implemented daily check-in endpoints that allow a user to create or update one check-in for a particular date and retrieve their latest check-in. I also created journal endpoints for saving and listing entries belonging to the current user. After connecting these services to the mobile screens, I tested the features using different accounts and confirmed that users could not access one another's private wellness information.

**What I used:** I used REST API routes, authenticated Express middleware, parameterised PostgreSQL queries, Zod request validation, and mobile API service modules. The backend obtained the user ID from the verified access token instead of trusting an ID sent by the application. I tested create, update, and list operations with separate accounts and checked both the user interface and database records.

## Week 12 — Personalised Recommendation System

This week, I developed the recommendation system. The system considers the user's onboarding goal, latest daily check-in, and themes detected from recent journal entries. I created recommendation tags for needs such as grounding, stress relief, sleep, confidence, emotional release, breathing, and movement. I first tested the recommendation logic locally and then moved it behind a backend route so it could securely use authenticated user data. Finally, I connected the recommended tools on the Home screen to the API and added suitable fallback exercises for new users or failed requests.

**What I used:** I used TypeScript scoring logic, keyword and theme matching, recommendation tags, authenticated API queries, and ranked exercise results. I combined onboarding preferences, mood data, and recent journal themes to calculate relevance without sending private journal data to a third-party recommendation service. I also added loading, empty, and error handling so the Home screen could still show safe fallback content.

## Week 13 — Database-Managed Exercise Catalogue

During the thirteenth week, I moved the exercise catalogue from local application data to PostgreSQL. Each exercise record contains information such as its name, category, description, guidance type, source page, display order, image, recommendation tags, and publication status. I created a seed script to import 60 starter exercises and developed public endpoints for retrieving published exercises. I also created administrator endpoints for creating and updating catalogue records. The Explore and exercise detail screens were connected to these APIs, with pull-to-refresh and automatic catalogue updates.

**What I used:** I used PostgreSQL tables, JSON-compatible fields, TypeScript seed scripts, Express catalogue routes, SQL ordering and filtering, and shared API response types. The seed command imported the starter catalogue consistently, while the publication flag controlled what mobile users could see. I used a pull-to-refresh interaction and local fallback handling to make the catalogue more reliable during development.

## Week 14 — Media Storage and Administrator Dashboard

This week, I configured MinIO object storage for exercise images and videos. I developed a signed-upload process so media files could be uploaded directly to storage while PostgreSQL saved only their URLs and metadata. I also created a separate administrator dashboard using React and Vite. The dashboard allows an administrator to search exercises, edit their details, change their publication status, manage display order and tags, and upload or replace images and videos. I tested the complete workflow from the dashboard through the backend and storage system to the mobile application.

**What I used:** I used MinIO as S3-compatible object storage, the AWS SDK for JavaScript, presigned upload URLs, Docker Compose, React 19, Vite, TypeScript, and browser file inputs. I kept binary media in object storage and only stored media URLs and metadata in PostgreSQL. I tested uploads, replacements, catalogue edits, publication changes, and the final display of updated content in the mobile application.

## Week 15 — Testing, Refinement, and Documentation

In the final week, I performed end-to-end testing of the complete application. I tested account creation, onboarding, daily check-ins, journal entries, personalised recommendations, exercise browsing, video playback, profile settings, session restoration, and logout. I also tested multiple accounts to confirm that private information remained isolated. I ran TypeScript checks and builds for the mobile application, backend, and administrator dashboard and corrected the remaining issues. Finally, I documented the project setup, database, API endpoints, Docker services, media uploads, testing commands, daily development workflow, and troubleshooting steps.

**What I used:** I used the iOS Simulator, manual end-to-end test scenarios, multiple test accounts, API health checks, database inspection, browser testing for the administrator dashboard, TypeScript compilation, and production builds. I ran the mobile type check, backend build, and Vite administrator build, then reviewed error, loading, empty, and session-restoration states. I recorded setup and troubleshooting commands in the project documentation so the complete system could be run again consistently.

## Final Reflection

Over the 15 weeks, I developed Holistic Mind from an initial idea into a working full-stack mobile wellness application. The project helped me strengthen my skills in user research, interface design, React Native, TypeScript, Node.js, API development, PostgreSQL, authentication, recommendation logic, object storage, media handling, testing, and technical documentation.

One of the main lessons I learned was that building an effective application requires more than creating attractive screens. The user experience, database design, privacy rules, backend behaviour, error handling, and content all need to work together. If I continue developing the application, I would add password recovery, email verification, social login, reminder notifications, improved accessibility, automated mobile testing, stronger protection for stored journal text, and production deployment.
