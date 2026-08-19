# How I Implemented the Holistic Mind Recommendation Engine

## Simple Overview

I implemented the recommendation engine to suggest three wellness exercises that are suitable for the user's current situation.

The recommendation is mainly based on:

1. The user's support goal from onboarding.
2. The answers from the user's latest daily check-in.
3. Text from up to ten recent journal entries.
4. Information attached to each published exercise.
5. Previous exercise interactions and feedback, when enough data exists.

In the simplest terms, my system creates a description of what the user currently needs, compares it with the description of every available exercise, gives each exercise a score, and returns the three exercises with the highest scores.

The main workflow is:

```text
User completes daily check-in
            |
            v
Mobile app saves the check-in in PostgreSQL
            |
            v
Home screen asks the backend for recommendations
            |
            v
Backend fetches the user's relevant data and published exercises
            |
            v
Backend sends the data to my local Python recommendation service
            |
            v
Python engine calculates a score for each exercise
            |
            v
Top three results are saved in PostgreSQL
            |
            v
Results are returned to the mobile app and shown on the Home screen
            |
            v
User activity and feedback are recorded for future recommendations
```

## 1. Where the User Data Comes From

I collect the recommendation data through features that already exist in the mobile application.

### Onboarding data

During onboarding, the user chooses a support goal, such as reducing stress or improving sleep. The mobile application saves this through:

```text
src/services/wellness/wellnessApi.ts
```

The function used is:

```ts
saveOnboardingResponses(...)
```

The backend stores this information in the PostgreSQL table:

```text
onboarding_responses
```

For recommendation purposes, the backend reads the `support_goal` field.

### Daily check-in data

The user completes the daily check-in on:

```text
src/screens/home/HomeScreen.tsx
```

When the final answer is selected, `HomeScreen.tsx` calls:

```ts
saveCheckIn(token, todayKey, completedAnswers)
```

The `saveCheckIn` function is imported from:

```text
src/services/wellness/wellnessApi.ts
```

This function sends a `PUT` request to:

```text
/api/wellness/check-ins
```

The backend stores the answers in the PostgreSQL table:

```text
daily_check_ins
```

The recommendation engine uses only the user's latest check-in.

### Journal data

Journal entries are also saved through:

```text
src/services/wellness/wellnessApi.ts
```

The function is:

```ts
createJournalEntry(...)
```

The entries are stored in:

```text
journal_entries
```

When producing a recommendation, the backend retrieves up to ten recent entries. Each entry is limited to 4,000 characters before it is sent to the local recommender.

## 2. How the Mobile App Requests a Recommendation

The recommendation request starts in:

```text
src/screens/home/HomeScreen.tsx
```

The Home screen imports:

```ts
import { generateRecommendations } from
  "../../services/recommendations/recommendationApi";
```

After the user has completed today's check-in, a React `useEffect` calls:

```ts
runAuthenticated(generateRecommendations)
```

`runAuthenticated` supplies the current access token. This means the request is authenticated, and the backend determines the user from the token instead of trusting a user ID sent by the app.

The `generateRecommendations` function is located in:

```text
src/services/recommendations/recommendationApi.ts
```

It sends this request:

```http
POST /api/recommendations/generate
Authorization: Bearer <access-token>
```

The mobile application does not send the onboarding answers, journals, or check-in answers directly in this request. It only sends the authenticated request. The backend securely retrieves the correct user's data from PostgreSQL.

## 3. What the Backend Fetches

The recommendation backend route is located in:

```text
backend/src/routes/recommendations.ts
```

This router is connected to the Express application in:

```text
backend/src/app.ts
```

It is registered with:

```ts
app.use("/api/recommendations", recommendationsRouter);
```

The route first uses the authentication middleware:

```ts
recommendationsRouter.use(authenticate);
```

The `POST /generate` route then obtains the authenticated user ID from:

```ts
response.locals.userId
```

It runs several PostgreSQL queries in parallel using `Promise.all`. These queries fetch:

- The user's onboarding support goal.
- The user's latest daily check-in.
- Up to ten recent journal entries.
- All published exercises that have a linked exercise ID.
- Interaction and feedback values from the previous 180 days.
- Exercises that this user marked as uncomfortable.

The exercise data includes:

- Title
- Category
- Description
- Recommendation tags
- Support goals
- Intended emotional states
- Activation level
- Physical intensity
- Contraindication tags
- Whether breath-holding is required

If the user has not completed a check-in, the backend returns an error asking the user to complete one first. If no published exercises are available, it also stops instead of trying to generate an empty recommendation.

## 4. How Data Is Sent to the Python Recommender

After collecting the data, the backend calls:

```ts
requestLocalRecommendations(...)
```

This function is imported from:

```text
backend/src/recommender.ts
```

Before sending the request, I replace the real user ID with a pseudonymous ID. I create it with an HMAC hash in:

```ts
pseudonymousUserId(userId)
```

The Python service therefore does not need the user's real database ID.

The backend sends a JSON object containing:

```text
Pseudonymous user ID
Onboarding goal
Latest check-in answers
Recent journal text
Published exercise information
Previous interaction values
IDs of uncomfortable exercises to exclude
Number of results required: 3
```

`backend/src/recommender.ts` sends this data to:

```http
POST http://localhost:8000/recommend
```

The address is controlled by `RECOMMENDER_URL` in the backend environment configuration.

The recommendation service runs locally through Docker and is configured in:

```text
backend/compose.yaml
```

No journal text is sent to an external recommendation API. It is processed by the local Python service.

## 5. The Python Recommendation Service

The recommendation service is a small Python FastAPI application.

The API endpoint is defined in:

```text
recommender/app/main.py
```

This file imports the recommendation function:

```py
from .engine import recommend
```

It also imports the request and response structures:

```py
from .schemas import RecommendationContext, RecommendationResponse
```

The request structures are defined in:

```text
recommender/app/schemas.py
```

Pydantic validates the received user context, exercise data, interaction values, and requested result limit before the engine uses them.

The main scoring logic is located in:

```text
recommender/app/engine.py
```

Important libraries imported by the engine include:

```py
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
```

I use:

- **NumPy** for vectors, similarity calculations, and numerical scoring.
- **ONNX Runtime** to run the local sentence-transformer model.
- **Tokenizer** to convert text into model input tokens.
- **FastAPI** to expose the local `/recommend` endpoint.
- **Pydantic** to validate request and response data.

The configured language model is:

```text
sentence-transformers/all-MiniLM-L6-v2
```

It runs locally in ONNX format.

## 6. How I Build the Text Used for Comparison

The engine creates one text document representing the user and another text document for every candidate exercise.

### User document

The `_user_document()` function combines:

- The onboarding support goal.
- The latest daily check-in answers.
- The recent journal text.

For example, the generated meaning could be similar to:

```text
Wellness goal: Reduce stress and anxiety.
state: Overwhelmed.
energy: Drained.
I have been feeling tense and unable to settle today.
```

### Exercise document

The `_exercise_document()` function combines:

- Exercise title.
- Category.
- Description.
- Recommendation tags.
- Supported goals.
- Intended states.
- Activation level.
- Physical intensity.

For example:

```text
Shoulder Drop Reset.
Grounding.
A gentle exercise for releasing tension.
Stress relief, overwhelmed, grounding.
Reduce stress and anxiety.
Down regulating.
Low intensity.
```

The engine converts the user document and all exercise documents into numerical vectors called **embeddings**. Texts with similar meanings produce vectors that are closer to one another.

The similarity between the user vector and each exercise vector becomes the **content score**.

## 7. The Three Parts of the Recommendation Score

My engine can use three score components:

### A. Content score

The content score measures the similarity between the user's current context and the exercise information.

It uses:

- Onboarding goal.
- Check-in answers.
- Journal meaning.
- Exercise title, description, tags, goals, and intended states.

The engine calculates this using the dot product of the normalised embedding vectors:

```py
content_scores = embeddings[1:] @ embeddings[0]
```

A higher value means that the exercise content is more closely related to what the user appears to need.

### B. Rule score

The `_rule_score()` function adds simple wellbeing rules that are easier to understand and control.

For example:

- If the user's state is **overwhelmed** or **anxious**, a down-regulating exercise receives an additional benefit.
- If the user's energy is **tired**, **drained**, or **low**, a high-intensity exercise receives a penalty.
- Exact matches between user signals and exercise tags, goals, or intended states increase the rule score.

This helps prevent the system from relying only on text similarity.

### C. Collaborative score

The `_collaborative_scores()` function uses previous interactions and feedback.

Examples of positive signals are:

- Completing an exercise.
- Repeating an exercise.
- Saving an exercise.
- Reporting that the user felt better.
- Giving high helpfulness feedback.

Examples of negative signals are:

- Abandoning an exercise.
- Reporting that the user felt worse.
- Marking an exercise as uncomfortable.

The engine compares a user's preferences with other users who have reacted similarly to some of the same exercises. It can then give a higher score to another exercise that helped those similar users.

Collaborative scoring is activated only when the system finds at least two suitable neighbouring users. This minimum is configured with:

```text
MIN_COLLABORATIVE_NEIGHBORS=2
```

## 8. Cold-Start and Hybrid Scoring

The engine supports two strategies.

### Content-based cold start

When a new user does not yet have enough interaction history, collaborative filtering cannot work reliably. In that situation, I use:

```text
88% content score + 12% rule score
```

The returned strategy is:

```text
content-based-cold-start
```

This means a new user can still receive a recommendation immediately after completing a check-in.

### Hybrid recommendation

When there are at least two suitable collaborative neighbours, I use:

```text
72% content score
18% collaborative score
10% rule score
```

The returned strategy is:

```text
hybrid
```

After calculating the final score, the engine sorts all candidate exercises from highest to lowest and returns the top three.

## 9. Fallback When the Language Model Is Unavailable

I included an offline fallback so the recommender can still operate if the configured ONNX model cannot be loaded.

The fallback is implemented in:

```py
_lexical_embeddings(...)
```

Instead of understanding sentence meaning through the transformer model, it creates deterministic vectors from words using SHA-256 hashing. This is less semantically powerful than the sentence-transformer model, but it prevents the complete recommendation feature from failing.

The returned model version shows which method was used:

```text
hybrid-v1:sentence-transformers/all-MiniLM-L6-v2:onnx
```

or:

```text
hybrid-v1:lexical-fallback
```

## 10. What Happens to Uncomfortable Exercises

If a user marks an exercise as uncomfortable, its ID is fetched by the backend and included in:

```text
excluded_exercise_ids
```

The Python engine removes these exercises before calculating rankings:

```py
candidates = [
    item for item in context.exercises
    if item.id not in excluded
]
```

Therefore, an exercise that the user has marked as uncomfortable will not be recommended to that user again.

## 11. How the Recommendation Is Saved

The Python service returns:

- Exercise ID.
- Final score.
- Individual score components.
- A simple recommendation reason.
- Model version.
- Recommendation strategy.

The backend then saves the result in PostgreSQL.

The relevant tables are created in:

```text
backend/src/db.ts
```

The tables are:

| Table | What I store |
|---|---|
| `recommendation_requests` | The user, model version, limited context summary, and creation time |
| `recommendation_items` | Recommended exercise IDs, positions, scores, score components, and reasons |
| `recommendation_events` | Impressions, opens, starts, completions, repeated uses, saves, and abandonments |
| `recommendation_feedback` | Helpfulness, state change, and uncomfortable feedback |

I do not save the actual journal text inside the recommendation request snapshot. The snapshot records only details such as the check-in ID and number of journal entries used:

```text
journalTextStored: false
```

## 12. How Results Return to the Mobile App

The backend returns a response containing a request ID and the three recommended items.

In `HomeScreen.tsx`, I match each returned `exerciseId` with the mobile exercise library:

```ts
const exercise = exerciseLibrary.find(
  (candidate) => candidate.id === item.exerciseId
);
```

I add the returned explanation and score:

```ts
{
  ...exercise,
  why: item.reason,
  score: item.score
}
```

The resulting exercises are stored in the `recommendations` state and displayed by:

```text
src/screens/home/components/RecommendedTools.tsx
```

The Home screen title changes to:

```text
For you right now
```

If the user has not completed a check-in or the recommendation request fails, the application displays general exercises from the local library instead.

## 13. How the System Learns From User Behaviour

When a recommended exercise is opened, started, completed, or repeated, the Exercise screen records the event.

This logic is located in:

```text
src/screens/exercise/ExerciseScreen.tsx
```

It imports:

```ts
recordRecommendationEvent
saveRecommendationFeedback
```

from:

```text
src/services/recommendations/recommendationApi.ts
```

After completing an exercise, the user can answer:

```text
How do you feel now?
```

The available responses are:

- Better
- The same
- Worse

This feedback is sent to:

```http
PUT /api/recommendations/:requestId/feedback
```

The next time recommendations are generated, previous events and feedback from the last 180 days are converted into values between `-1` and `1`. These values can contribute to collaborative filtering.

This creates a feedback loop:

```text
Recommendation
      |
      v
User opens and completes an exercise
      |
      v
Activity and feedback are saved
      |
      v
Saved behaviour becomes interaction data
      |
      v
Future recommendations can improve
```

## 14. Important Difference Between the Two Engine Files

There is also an older TypeScript file:

```text
src/services/recommendations/recommendationEngine.ts
```

This file contains a simpler local rule-based recommendation function called:

```ts
getRecommendations(...)
```

It matches check-in answers and a small list of journal keywords against local exercise tags.

However, this is **not the engine currently called by the Home screen**. The current Home screen imports `generateRecommendations` from `recommendationApi.ts`, which calls the backend and then the Python recommender.

Therefore:

```text
recommendationEngine.ts = older local rule-based implementation

recommender/app/engine.py = current active scoring engine
```

Keeping this distinction clear is important when explaining or demonstrating the application.

## 15. Example of the Complete Process

For example, suppose:

- The user's onboarding goal is **Reduce stress and anxiety**.
- The latest check-in state is **Overwhelmed**.
- The user's energy is **Drained**.
- A recent journal entry mentions feeling tense and unable to settle.

The process is:

1. The Home screen detects that today's check-in is complete.
2. It calls `generateRecommendations`.
3. The backend authenticates the user.
4. The backend fetches the onboarding goal, latest check-in, recent journals, exercises, and previous interactions.
5. The backend replaces the real user ID with a pseudonymous ID.
6. The data is sent to the local Python recommender.
7. The content model identifies exercises whose descriptions and tags relate to stress, tension, grounding, and calming.
8. The rule score gives an extra benefit to down-regulating exercises.
9. High-intensity exercises may receive a penalty because the user feels drained.
10. Collaborative feedback is included if enough similar-user history exists.
11. Uncomfortable exercises are removed.
12. Every remaining exercise receives a final score.
13. The top three exercises are returned and saved.
14. The Home screen displays them under **For you right now**.
15. The user's later activity and feedback can improve future results.

## 16. Detailed Explanation of Embeddings and Numerical Conversion

### How the user's text becomes numbers

Computers cannot directly compare the meaning of sentences as humans do. Therefore, I convert the user context and every exercise description into numerical vectors called **embeddings**.

This conversion happens in:

```text
recommender/app/engine.py
```

The `recommend()` function first creates a list called `documents`:

```py
documents = [
    _user_document(context),
    *[_exercise_document(item) for item in candidates],
]
```

Conceptually, the list looks like:

```text
documents[0] = combined description of the user
documents[1] = description of exercise 1
documents[2] = description of exercise 2
documents[3] = description of exercise 3
...
```

The following line sends all these text documents to the embedding function:

```py
embeddings, embedding_backend = encode(documents)
```

The `encode()` function is therefore the main function responsible for converting the text into numbers.

### Tokenisation

Inside `encode()`, this line tokenises the text:

```py
encoded = tokenizer.encode_batch(texts)
```

Tokenisation divides the text into pieces that the model understands and converts those pieces into token IDs.

For illustration only, a sentence such as:

```text
I feel anxious and overwhelmed
```

could become token IDs similar to:

```text
[101, 1045, 2514, 11480, 1998, 13394, 102]
```

These example IDs are not the final exercise scores. They are numerical identifiers that the language model uses to process the words.

The engine then creates NumPy arrays:

```py
input_ids = np.asarray(
    [item.ids for item in encoded],
    dtype=np.int64,
)

attention_mask = np.asarray(
    [item.attention_mask for item in encoded],
    dtype=np.int64,
)
```

`input_ids` contains the token numbers. `attention_mask` tells the model which positions contain real text and which positions are only padding.

### Running the ONNX sentence-transformer

The token arrays are passed into the local ONNX model here:

```py
output = session.run(None, inputs)[0]
```

The model used is:

```text
sentence-transformers/all-MiniLM-L6-v2
```

The model produces numerical representations for the tokens. The engine then performs mean pooling:

```py
mask = attention_mask[..., None].astype(np.float32)

embeddings = (
    (output * mask).sum(axis=1)
    / np.maximum(mask.sum(axis=1), 1e-8)
)
```

This operation:

1. Ignores padding using the attention mask.
2. Adds the valid token vectors.
3. Divides by the number of valid tokens.
4. Produces one vector for the complete text document.

For the configured MiniLM model, each document is represented by a vector with 384 values. A shortened example might look like:

```text
User vector:
[0.12, -0.08, 0.31, 0.04, ..., -0.15]

Calming exercise vector:
[0.10, -0.06, 0.29, 0.02, ..., -0.12]

High-energy exercise vector:
[-0.20, 0.14, 0.01, -0.18, ..., 0.09]
```

The real vectors contain 384 floating-point numbers rather than the few values shown above.

The model does not convert a user into one simple number and an exercise into another simple number. It converts each of them into a **384-dimensional vector**. Each dimension contributes to the overall representation of meaning.

### Vector normalisation

After producing the embedding, I normalise each vector:

```py
norms = np.linalg.norm(
    embeddings,
    axis=1,
    keepdims=True,
)

embeddings = embeddings / np.maximum(norms, 1e-8)
```

The L2 norm of a vector is:

```text
||v|| = √(v₁² + v₂² + ... + v₃₈₄²)
```

Each value is divided by this norm:

```text
normalised vector = vector / ||vector||
```

After normalisation, every vector has a length of approximately `1`. This is important because it lets me compare direction, which represents similarity of meaning, instead of being affected by the original vector size.

`1e-8` is a very small safety value used to prevent division by zero. It is not a recommendation threshold.

## 17. How Embedding Similarity Is Calculated

After creating the embeddings, I separate the user vector from the exercise vectors and calculate:

```py
content_scores = np.clip(
    embeddings[1:] @ embeddings[0],
    0.0,
    1.0,
)
```

Here:

```text
embeddings[0]  = the user vector
embeddings[1:] = all exercise vectors
@              = matrix/vector dot product
```

Because all the vectors were normalised, their dot product is equivalent to **cosine similarity**:

```text
cosine similarity =
(user vector · exercise vector)
--------------------------------
||user vector|| × ||exercise vector||
```

The vector lengths are already `1`, so this becomes:

```text
cosine similarity = user vector · exercise vector
```

For example:

```text
Calming exercise similarity    = 0.82
Grounding exercise similarity  = 0.76
High-energy exercise similarity = 0.21
```

The calming exercise is more semantically similar to the user's current context and therefore receives a higher content score.

I apply:

```py
np.clip(value, 0.0, 1.0)
```

This means:

- A value below `0` becomes `0`.
- A value between `0` and `1` remains unchanged.
- A value above `1` becomes `1`.

Normalised cosine similarity should not normally exceed `1`, but clipping also protects against small floating-point errors.

## 18. Sigmoid: What It Is and Whether I Use It

A sigmoid function is commonly written as:

```text
sigmoid(x) = 1 / (1 + e⁻ˣ)
```

It converts any number into a value between `0` and `1`.

Examples are:

```text
sigmoid(-2) ≈ 0.119
sigmoid(0)  = 0.500
sigmoid(2)  ≈ 0.881
```

However, **my current recommendation engine does not apply a sigmoid function**.

My engine already obtains bounded or normalised component values through:

- Normalised vectors and cosine similarity for content scoring.
- `np.clip(score, 0.0, 1.0)` for rule scoring.
- A linear conversion for collaborative scoring.
- A weighted average for the final score.

Therefore, it would be inaccurate to say that my final recommendation score is a sigmoid probability.

For example, a final score of `0.78` means that the exercise received a weighted relevance score of `0.78`. It does **not** mean there is a statistically calibrated 78% probability that the exercise will help the user.

If I wanted to use sigmoid in a later machine-learning model, I could apply it to an unbounded prediction or logit. That is not part of the present implementation.

## 19. Detailed Collaborative Filtering Explanation

Collaborative filtering is implemented in:

```text
recommender/app/engine.py
```

The function is:

```py
_collaborative_scores(...)
```

### Converting behaviour into values

Before the data reaches Python, the backend converts recommendation events and feedback into values.

This conversion is performed in:

```text
backend/src/routes/recommendations.ts
```

Some event values are:

| User behaviour | Value |
|---|---:|
| Repeated an exercise | `1.0` |
| Felt better | `1.0` |
| Completed an exercise | `0.8` |
| Saved an exercise | `0.7` |
| Started an exercise | `0.35` |
| Opened an exercise | `0.15` |
| Abandoned an exercise | `-0.4` |
| Felt worse | `-0.75` |
| Marked it uncomfortable | `-1.0` |

Helpfulness feedback from `0` to `3` is converted using:

```text
(helpfulness / 1.5) - 1
```

This produces:

| Helpfulness | Converted value |
|---:|---:|
| `0` | `-1.000` |
| `1` | approximately `-0.333` |
| `2` | approximately `0.333` |
| `3` | `1.000` |

If several signals exist for the same user and exercise, the backend calculates their average and limits it to the range `-1` to `1`.

### Building the user–exercise rating structure

The Python engine creates a nested structure:

```py
ratings[user_id][exercise_id] = interaction.value
```

Conceptually, this can be represented as:

| User | Breathing | Grounding | Stretching |
|---|---:|---:|---:|
| Current user | `1.0` | `0.8` | unknown |
| Similar user A | `0.9` | `0.7` | `1.0` |
| Similar user B | `0.8` | `0.9` | `0.7` |
| Different user | `-0.8` | `-0.6` | `1.0` |

### Finding similar users

For each other user, the engine finds exercises rated by both users:

```py
common = sorted(
    set(target) & set(other_ratings)
)
```

It creates two vectors from these shared exercises and calculates cosine similarity:

```py
similarity = np.dot(left, right) / (
    np.linalg.norm(left)
    * np.linalg.norm(right)
)
```

For example:

```text
Current user on shared exercises = [1.0, 0.8]
Similar user A                  = [0.9, 0.7]
```

Their cosine similarity is:

```text
(1.0 × 0.9) + (0.8 × 0.7)
---------------------------------
√(1.0² + 0.8²) × √(0.9² + 0.7²)

= 1.46 / approximately 1.460
= approximately 1.0
```

This means their preferences point in almost the same direction.

Only users with positive similarity are considered neighbours:

```py
if similarity > 0:
    neighbours.append(...)
```

At least two neighbours are required before collaborative filtering becomes active.

### Predicting an exercise score

For an exercise, the engine calculates a similarity-weighted average:

```text
predicted value =
Σ(neighbour similarity × neighbour exercise value)
---------------------------------------------------
Σ(neighbour similarity)
```

Suppose:

```text
Neighbour A similarity = 0.90
Neighbour A stretching value = 1.00

Neighbour B similarity = 0.80
Neighbour B stretching value = 0.70
```

The prediction is:

```text
(0.90 × 1.00) + (0.80 × 0.70)
--------------------------------
0.90 + 0.80

= 1.46 / 1.70
= approximately 0.859
```

The interaction scale is originally `-1` to `1`. The following code converts the prediction to `0` to `1`:

```py
scores[exercise_id] = (
    weighted_sum / similarity_sum + 1.0
) / 2.0
```

The conversion is:

```text
normalised collaborative score =
(predicted value + 1) / 2
```

Examples are:

| Original value | Converted score |
|---:|---:|
| `-1.0` | `0.0` |
| `-0.5` | `0.25` |
| `0.0` | `0.5` |
| `0.5` | `0.75` |
| `1.0` | `1.0` |

This is a **linear transformation**, not a sigmoid.

For the example prediction:

```text
(0.859 + 1) / 2
= approximately 0.9295
```

The collaborative component for the stretching exercise is therefore approximately `0.93`.

## 20. Complete Final-Score Example

Suppose a calming exercise receives:

```text
Content similarity score = 0.82
Collaborative score      = 0.93
Rule score                = 0.75
```

When collaborative filtering is active, the formula is:

```text
Final score =
(0.72 × content)
+ (0.18 × collaborative)
+ (0.10 × rules)
```

Substituting the values:

```text
Final score =
(0.72 × 0.82)
+ (0.18 × 0.93)
+ (0.10 × 0.75)

= 0.5904 + 0.1674 + 0.075
= 0.8328
```

The final score stored and returned is approximately:

```text
0.8328
```

If collaborative filtering is not active, the cold-start formula is:

```text
Final score =
(0.88 × content)
+ (0.12 × rules)
```

Using the same content and rule values:

```text
(0.88 × 0.82) + (0.12 × 0.75)
= 0.7216 + 0.09
= 0.8116
```

The engine calculates this score for every candidate exercise, sorts the exercises from highest to lowest, and returns the top three.

## Conclusion

I implemented the Holistic Mind recommendation system as a local hybrid recommendation engine. It combines the meaning of the user's current wellness information, understandable wellbeing rules, and previous user behaviour.

The mobile application is responsible for collecting information and displaying the results. The Node.js backend is responsible for authentication, securely fetching data, preparing the recommendation context, and saving results. The Python service is responsible for calculating and ranking the exercises.

The system also supports new users through content-based cold-start recommendations and becomes more personalised when interaction and feedback data grows. Most importantly, the user's journal content is processed locally and is not sent to an external AI API.
