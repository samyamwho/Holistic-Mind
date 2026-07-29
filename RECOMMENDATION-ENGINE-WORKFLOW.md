# Holistic Mind Recommendation Engine Workflow

## Overview

Holistic Mind uses a **local hybrid recommendation engine** to recommend suitable wellness exercises. It combines:

1. Semantic content-based filtering
2. Rule-based suitability scoring
3. Collaborative filtering

The engine does not use OpenAI or another external inference API. Journal analysis and recommendation calculations run locally in the Python recommendation service.

## Complete Workflow

```text
User completes daily check-in
             |
             v
Mobile app requests recommendations
             |
             v
Node.js backend verifies the user
             |
             v
Backend collects relevant user context
             |
             v
User IDs are pseudonymised
             |
             v
Local Python service analyses the context
             |
             v
Content, rule, and collaborative scores are calculated
             |
             v
Unsuitable exercises are removed
             |
             v
Exercises are ranked by their final score
             |
             v
Top three recommendations are returned
             |
             v
Mobile app displays “For you right now”
             |
             v
User activity and feedback improve future recommendations
```

## Step 1 — The User Completes a Daily Check-In

The recommendation process begins after the user completes the daily check-in. The check-in records information such as:

- Current emotional state
- Body state
- Energy level
- Stress level
- Ability to focus
- Type of support needed

The completed check-in is saved in PostgreSQL under the authenticated user's account.

## Step 2 — The Mobile Application Requests Recommendations

After confirming that today's check-in is complete, the Home screen sends an authenticated request to:

```http
POST /api/recommendations/generate
```

The mobile application does not calculate or submit its own recommendation scores. It only asks the backend to generate a new set of recommendations.

## Step 3 — The Backend Verifies the User

The Node.js backend verifies the user's access token before processing the request. The user ID is obtained from the verified token instead of trusting an ID supplied by the mobile application.

This ensures that a user cannot request or access another user's private wellness information.

## Step 4 — The Backend Collects Recommendation Inputs

The backend collects the following information from PostgreSQL:

### Personal context

- The user's onboarding support goal
- The latest daily check-in
- Up to ten recent journal entries

### Exercise information

- Exercise title and category
- Description
- Recommendation tags
- Intended emotional states
- Supported wellness goals
- Activation level
- Physical intensity
- Contraindication information

### Previous activity

- Exercises opened
- Exercises started
- Exercises completed
- Exercises abandoned
- Exercises saved or repeated
- Helpfulness ratings
- Reported state changes
- Exercises marked uncomfortable

Only published exercises that can be opened from the mobile application are considered.

## Step 5 — User IDs Are Pseudonymised

Before interaction data is sent to the Python service, database user IDs are converted into stable pseudonymous identifiers using an HMAC.

This allows the collaborative-filtering component to recognise repeated behaviour from the same anonymous user without receiving the original database user ID.

## Step 6 — A User Context Document Is Created

The Python service combines the user's current information into a context document. Conceptually, it looks like:

```text
Wellness goal: Reduce stress and anxiety.
State: Anxious.
Energy: Drained.
Stress: Very stressed.
Support: Calm down.
Recent reflection: My thoughts have been racing and I need to settle.
```

Each exercise is also converted into a descriptive document containing its title, category, description, tags, supported goals, intended states, activation level, and intensity.

## Step 7 — Semantic Content-Based Filtering

Holistic Mind uses the local `all-MiniLM-L6-v2` Sentence Transformer model in ONNX format.

The model converts the user context and each exercise description into numerical vectors called **embeddings**. These embeddings represent the meanings of the texts.

The engine calculates the cosine similarity between:

```text
User context embedding <-> Exercise embedding
```

A higher similarity means the exercise is more closely related to the user's current needs.

For example, a journal entry saying:

> My thoughts will not slow down.

can be semantically matched with a calming breathing exercise even when the journal does not contain an exact predefined keyword such as “anxiety.”

This produces the **content score**.

## Step 8 — Rule-Based Suitability Scoring

The engine also applies clear suitability rules using the check-in and exercise metadata.

Examples include:

- Down-regulating exercises receive additional suitability when the user is anxious or overwhelmed.
- High-intensity exercises receive a lower suitability score when the user reports feeling tired or drained.
- Exercises receive additional credit when their intended states, tags, or support goals match the check-in.
- Exercises previously marked uncomfortable are removed from the candidate list.

This produces the **rule score** and provides a safety-oriented layer around the semantic model.

## Step 9 — Collaborative Filtering

Collaborative filtering uses pseudonymised behaviour from users with similar exercise histories.

Interaction types are converted into preference values. For example:

- Repeating an exercise is a strong positive signal.
- Completing or saving an exercise is a positive signal.
- Opening or starting an exercise is a smaller positive signal.
- Abandoning an exercise is a negative signal.
- Reporting a worse state is a stronger negative signal.
- Marking an exercise uncomfortable gives the strongest negative signal.

The engine compares the current user's exercise preferences with other users. Cosine similarity is used to find users with overlapping and similar histories.

Exercises that helped similar users receive a higher **collaborative score**.

### Cold-start behaviour

Collaborative filtering requires previous activity from several users. It becomes active when the current user has overlapping history with at least two similar users.

Until enough data exists, the engine uses:

```text
Content-based score + Rule-based score
```

This mode is recorded as:

```text
content-based-cold-start
```

When enough collaborative information exists, the engine changes to:

```text
hybrid
```

## Step 10 — The Final Score Is Calculated

During cold start, the score is calculated as:

```text
Final score = 88% content score + 12% rule score
```

When collaborative filtering is active, the score is calculated as:

```text
Final score =
    72% content score
  + 18% collaborative score
  + 10% rule score
```

These weights give the user's current needs the strongest influence while allowing previous user feedback and suitability rules to refine the ranking.

## Step 11 — Exercises Are Filtered and Ranked

Before producing the final result, the engine:

1. Removes exercises marked uncomfortable by the current user.
2. Calculates the three score components.
3. Calculates the final weighted score.
4. Sorts exercises from the highest score to the lowest score.
5. Selects the top three exercises.

Each result contains:

- Exercise ID
- Final score
- Content score
- Collaborative score
- Rule score
- A short recommendation reason

An example reason is:

```text
Recommended from your current check-in.
```

## Step 12 — The Recommendation Is Stored

The backend stores:

- Recommendation request ID
- Model version
- Recommendation strategy
- Recommended exercise positions
- Final scores
- Individual score components
- Recommendation reasons
- Creation time

The raw journal text is **not copied into recommendation history**. The history records only that journal entries were used and how many were considered.

## Step 13 — Recommendations Are Displayed

The backend returns the top three exercises to the mobile application.

The Home screen matches the returned exercise IDs with the application's exercise content and displays them in:

```text
For you right now
```

When a user selects a recommended exercise, the recommendation request ID follows them into the exercise screen. This connects later activity to the recommendation that caused it.

## Step 14 — Interaction and Feedback Are Collected

The application records events such as:

- Opened
- Started
- Completed
- Abandoned
- Saved
- Repeated

After completing a recommended exercise, the user can also provide:

- Helpfulness rating
- Whether they feel better, the same, or worse
- Whether the exercise felt uncomfortable

This information is stored in PostgreSQL and becomes an input for later collaborative recommendations.

## Step 15 — Future Recommendations Adapt

As the system collects more interaction and feedback data:

1. The user's personal exercise preferences become clearer.
2. More similar users can be identified.
3. Collaborative scores become more informative.
4. Exercises that were helpful receive stronger recommendations.
5. Unhelpful or uncomfortable exercises receive lower scores or are excluded.

The engine therefore starts with meaningful content-based recommendations and gradually becomes more personalised as real usage data accumulates.

## Privacy Summary

- No OpenAI API is used.
- No external inference API is used.
- Sentence analysis runs in a local Docker container.
- Access to the generation endpoint requires authentication.
- The backend obtains the user ID from the verified session.
- User IDs are pseudonymised before collaborative processing.
- Raw journal text is not stored in recommendation history.
- Recommendation data remains inside the Holistic Mind system.

## Main Implementation Files

| Responsibility | File |
|---|---|
| Hybrid scoring and ranking | `recommender/app/engine.py` |
| Python API | `recommender/app/main.py` |
| Request and response structures | `recommender/app/schemas.py` |
| Backend data collection and storage | `backend/src/routes/recommendations.ts` |
| Backend-to-Python communication | `backend/src/recommender.ts` |
| Mobile API request | `src/services/recommendations/recommendationApi.ts` |
| Home-screen integration | `src/screens/home/HomeScreen.tsx` |
| Feedback collection | `src/screens/exercise/ExerciseScreen.tsx` |
| Database tables | `backend/src/db.ts` |
| Local service configuration | `backend/compose.yaml` |

