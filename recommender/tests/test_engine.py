import os

os.environ["RECOMMENDER_EMBEDDING_BACKEND"] = "lexical"

from app.engine import recommend
from app.schemas import RecommendationContext


def test_content_recommendation_prefers_matching_exercise():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "onboarding_goal": "Reduce stress and anxiety",
            "check_in_answers": {"state": "Anxious", "support": "Calm down"},
            "journal_texts": ["I feel worried and need a calming breathing practice."],
            "exercises": [
                {
                    "id": "calm-breathing",
                    "title": "Calming breathing",
                    "category": "Breathwork",
                    "description": "Slow breathing for anxiety and worry",
                    "recommendation_tags": ["Anxious", "Calm down"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "energising-movement",
                    "title": "Energising movement",
                    "category": "Movement",
                    "description": "Fast movement for energy",
                    "activation_level": "up_regulating",
                    "physical_intensity": "high",
                },
            ],
        }
    )
    items, strategy, _ = recommend(context)
    assert items[0].exercise_id == "calm-breathing"
    assert strategy == "content-based-cold-start"


def test_uncomfortable_exercise_is_excluded():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "exercises": [
                {"id": "excluded", "title": "Excluded", "category": "Breathing"},
                {"id": "safe", "title": "Safe grounding", "category": "Grounding"},
            ],
            "excluded_exercise_ids": ["excluded"],
        }
    )
    items, _, _ = recommend(context)
    assert [item.exercise_id for item in items] == ["safe"]


def test_collaborative_filtering_activates_with_two_similar_users():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "exercises": [
                {"id": "shared", "title": "Shared practice", "category": "Grounding"},
                {"id": "popular", "title": "Neighbour favourite", "category": "Grounding"},
            ],
            "interactions": [
                {"user_id": "current", "exercise_id": "shared", "value": 1.0},
                {"user_id": "neighbour-a", "exercise_id": "shared", "value": 1.0},
                {"user_id": "neighbour-a", "exercise_id": "popular", "value": 1.0},
                {"user_id": "neighbour-b", "exercise_id": "shared", "value": 0.8},
                {"user_id": "neighbour-b", "exercise_id": "popular", "value": 0.9},
            ],
        }
    )
    items, strategy, _ = recommend(context)
    assert strategy == "hybrid"
    popular = next(item for item in items if item.exercise_id == "popular")
    assert popular.score_components["collaborative"] > 0.9
