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


def test_recent_recommendations_rotate_when_alternatives_are_equally_suitable():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {"state": "Anxious", "support": "Calm down"},
            "limit": 2,
            "recent_recommendation_ids": ["recent-a", "recent-b"],
            "exercises": [
                {
                    "id": "recent-a",
                    "title": "Recent practice A",
                    "category": "Breathwork",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "recent-b",
                    "title": "Recent practice B",
                    "category": "Grounding",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "fresh-a",
                    "title": "Fresh practice A",
                    "category": "Breathwork",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "fresh-b",
                    "title": "Fresh practice B",
                    "category": "Grounding",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious"],
                    "activation_level": "down_regulating",
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert {item.exercise_id for item in items} == {"fresh-a", "fresh-b"}
    assert all(item.score_components["recency_penalty"] == 0 for item in items)


def test_recency_never_overrides_a_clear_high_activation_safety_match():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {
                "state": "Anxious",
                "stress": "Very stressed",
                "support": "Calm down",
            },
            "recent_recommendation_ids": ["safe-exhale"],
            "exercises": [
                {
                    "id": "safe-exhale",
                    "title": "Longer exhale",
                    "category": "Breathwork",
                    "support_goals": ["calm_down"],
                    "intended_states": ["anxious", "very_stressed"],
                    "activation_level": "down_regulating",
                },
                {
                    "id": "breath-holds",
                    "title": "Breath holds",
                    "category": "Breathwork",
                    "support_goals": ["focus"],
                    "intended_states": ["scattered"],
                    "breath_hold_required": True,
                },
            ],
        }
    )
    items, _, _ = recommend(context)
    assert items[0].exercise_id == "safe-exhale"


def test_complete_previous_set_rotates_at_least_one_fresh_option():
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {"support": "Focus", "focus": "Scattered"},
            "limit": 4,
            "recent_recommendation_ids": ["recent-a", "recent-b", "recent-c", "recent-d"],
            "exercises": [
                {
                    "id": exercise_id,
                    "title": exercise_id,
                    "category": "Focus",
                    "support_goals": ["focus"],
                    "intended_states": ["scattered"],
                }
                for exercise_id in ["recent-a", "recent-b", "recent-c", "recent-d"]
            ] + [
                {
                    "id": "fresh",
                    "title": "Present-moment orientation",
                    "category": "Grounding",
                    "description": "Focus support for scattered attention in the present moment",
                }
            ],
        }
    )
    items, _, _ = recommend(context)
    assert sum(item.exercise_id.startswith("recent-") for item in items) == 3, [
        item.exercise_id for item in items
    ]
    assert "fresh" in [item.exercise_id for item in items]


def test_overexposed_exercise_pauses_when_enough_suitable_options_exist():
    recent = []
    for request_number in range(3):
        recent.extend([
            "dominant",
            f"old-{request_number}-a",
            f"old-{request_number}-b",
            f"old-{request_number}-c",
        ])
    context = RecommendationContext.model_validate(
        {
            "user_id": "current",
            "check_in_answers": {"support": "Focus", "focus": "Scattered"},
            "limit": 4,
            "recent_recommendation_ids": recent,
            "exercises": [
                {
                    "id": exercise_id,
                    "title": f"Focus attention {exercise_id}",
                    "category": f"Category {index}",
                    "support_goals": ["focus"],
                    "intended_states": ["scattered"],
                }
                for index, exercise_id in enumerate(
                    ["dominant", "fresh-a", "fresh-b", "fresh-c", "fresh-d"]
                )
            ],
        }
    )
    items, _, _ = recommend(context)
    assert "dominant" not in [item.exercise_id for item in items]


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
