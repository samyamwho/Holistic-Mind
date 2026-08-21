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


def test_display_answers_match_snake_case_metadata():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {
                "state": "Numb",
                "body": "Disconnected",
                "energy": "Drained",
                "support": "Feel grounded",
            },
            "exercises": [
                {
                    "id": "grounding",
                    "title": "Ground through your feet",
                    "category": "Grounding",
                    "support_goals": ["feel_grounded"],
                    "intended_states": ["numb", "disconnected", "drained"],
                    "activation_level": "neutral",
                },
                {
                    "id": "focus",
                    "title": "Focus breathing",
                    "category": "Breathwork",
                    "support_goals": ["focus"],
                    "intended_states": ["scattered"],
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert items[0].exercise_id == "grounding"
    assert items[0].score_components["rules"] > 0.7
    assert "feel grounded" in items[0].reason.lower()


def test_current_check_in_outweighs_conflicting_old_journal_text():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {
                "state": "Okay",
                "body": "Heavy",
                "energy": "Drained",
                "stress": "A little",
                "focus": "Foggy",
                "support": "Get energy",
            },
            "journal_texts": [
                "I previously felt anxious worried panicked and wanted calming breathing."
            ],
            "exercises": [
                {
                    "id": "energising-reset",
                    "title": "Temperature reset",
                    "category": "Sensory",
                    "description": "A cool sensory reset for energy and fogginess",
                    "support_goals": ["get_energy"],
                    "intended_states": ["drained", "foggy", "heavy"],
                    "activation_level": "up_regulating",
                },
                {
                    "id": "calming-breath",
                    "title": "Calming breath",
                    "category": "Breathwork",
                    "description": "Breathing for anxiety worry and panic",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious", "very_stressed"],
                    "activation_level": "down_regulating",
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert items[0].exercise_id == "energising-reset"


def test_breath_holds_are_deprioritised_during_high_activation():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {
                "state": "Anxious",
                "body": "Tense",
                "energy": "Steady",
                "stress": "Very stressed",
                "focus": "Scattered",
                "support": "Focus",
            },
            "exercises": [
                {
                    "id": "box-breathing",
                    "title": "Box breathing",
                    "category": "Breathwork",
                    "support_goals": ["focus"],
                    "intended_states": ["scattered"],
                    "activation_level": "down_regulating",
                    "breath_hold_required": True,
                },
                {
                    "id": "longer-exhale",
                    "title": "Longer exhale",
                    "category": "Breathwork",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious", "tense", "very_stressed"],
                    "activation_level": "down_regulating",
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert items[0].exercise_id == "longer-exhale"


def test_equally_relevant_results_include_category_variety():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {"state": "Anxious", "support": "Calm down"},
            "limit": 2,
            "exercises": [
                {
                    "id": "same-category-a",
                    "title": "Practice A",
                    "category": "Nervous System Reset",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "same-category-b",
                    "title": "Practice B",
                    "category": "Nervous System Reset",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "different-category",
                    "title": "Practice C",
                    "category": "Sensory Regulation",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert "different-category" in [item.exercise_id for item in items]


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
                {"id": "shared-a", "title": "Shared practice A", "category": "Grounding"},
                {"id": "shared-b", "title": "Shared practice B", "category": "Grounding"},
                {"id": "popular", "title": "Neighbour favourite", "category": "Grounding"},
            ],
            "interactions": [
                {"user_id": "current", "exercise_id": "shared-a", "value": 1.0},
                {"user_id": "current", "exercise_id": "shared-b", "value": 0.8},
                {"user_id": "neighbour-a", "exercise_id": "shared-a", "value": 1.0},
                {"user_id": "neighbour-a", "exercise_id": "shared-b", "value": 0.8},
                {"user_id": "neighbour-a", "exercise_id": "popular", "value": 1.0},
                {"user_id": "neighbour-b", "exercise_id": "shared-a", "value": 0.8},
                {"user_id": "neighbour-b", "exercise_id": "shared-b", "value": 1.0},
                {"user_id": "neighbour-b", "exercise_id": "popular", "value": 0.9},
            ],
        }
    )
    items, strategy, _ = recommend(context)
    assert strategy == "hybrid"
    popular = next(item for item in items if item.exercise_id == "popular")
    assert popular.score_components["collaborative"] > 0.9
