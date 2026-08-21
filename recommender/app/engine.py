import hashlib
import os
import re
from collections import defaultdict
from functools import lru_cache

import numpy as np

from .schemas import Exercise, Interaction, RecommendationContext, RecommendedItem

MODEL_NAME = os.getenv(
    "SENTENCE_TRANSFORMER_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)
MODEL_PATH = os.getenv("SENTENCE_TRANSFORMER_PATH", "/models/all-MiniLM-L6-v2")
MIN_COLLABORATIVE_NEIGHBORS = int(os.getenv("MIN_COLLABORATIVE_NEIGHBORS", "2"))
MIN_COMMON_INTERACTIONS = int(os.getenv("MIN_COMMON_INTERACTIONS", "2"))
RULE_WEIGHT = 0.65
CURRENT_CONTENT_WEIGHT = 0.20
HISTORY_CONTENT_WEIGHT = 0.05
COLLABORATIVE_WEIGHT = 0.10
DIVERSITY_PENALTY = 0.045


@lru_cache(maxsize=1)
def _onnx_model():
    import onnxruntime as ort
    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(f"{MODEL_PATH}/tokenizer.json")
    tokenizer.enable_truncation(max_length=256)
    tokenizer.enable_padding()
    session = ort.InferenceSession(
        f"{MODEL_PATH}/onnx/model.onnx",
        providers=["CPUExecutionProvider"],
    )
    return tokenizer, session


def _lexical_embeddings(texts: list[str], dimensions: int = 384) -> np.ndarray:
    """Deterministic offline fallback when the configured model is unavailable."""
    matrix = np.zeros((len(texts), dimensions), dtype=np.float32)
    for row, text in enumerate(texts):
        for token in re.findall(r"[a-z0-9']+", text.lower()):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            matrix[row, index] += 1.0
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    return matrix / np.maximum(norms, 1e-8)


def encode(texts: list[str]) -> tuple[np.ndarray, str]:
    if os.getenv("RECOMMENDER_EMBEDDING_BACKEND") == "lexical":
        return _lexical_embeddings(texts), "lexical-test"
    try:
        tokenizer, session = _onnx_model()
        encoded = tokenizer.encode_batch(texts)
        input_ids = np.asarray([item.ids for item in encoded], dtype=np.int64)
        attention_mask = np.asarray(
            [item.attention_mask for item in encoded],
            dtype=np.int64,
        )
        available_inputs = {item.name for item in session.get_inputs()}
        inputs = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
        }
        if "token_type_ids" in available_inputs:
            inputs["token_type_ids"] = np.asarray(
                [item.type_ids for item in encoded],
                dtype=np.int64,
            )
        output = session.run(None, inputs)[0]
        if output.ndim == 3:
            mask = attention_mask[..., None].astype(np.float32)
            embeddings = (output * mask).sum(axis=1) / np.maximum(mask.sum(axis=1), 1e-8)
        else:
            embeddings = output
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / np.maximum(norms, 1e-8)
        return embeddings.astype(np.float32), f"{MODEL_NAME}:onnx"
    except Exception:
        if os.getenv("ALLOW_LEXICAL_FALLBACK", "true").lower() != "true":
            raise
        return _lexical_embeddings(texts), "lexical-fallback"


def _exercise_document(exercise: Exercise) -> str:
    parts = [
        exercise.title,
        exercise.category,
        exercise.description,
        " ".join(exercise.recommendation_tags),
        " ".join(exercise.support_goals),
        " ".join(exercise.intended_states),
        exercise.activation_level.replace("_", " "),
        exercise.physical_intensity + " intensity",
    ]
    return ". ".join(part for part in parts if part)


def _normalize_signal(value: str) -> str:
    value = value.casefold().replace("_", " ").replace("-", " ").replace("&", " and ")
    return " ".join(re.findall(r"[a-z0-9']+", value))


def _current_document(context: RecommendationContext) -> str:
    answers = ". ".join(
        f"{key}: {value}" for key, value in context.check_in_answers.items() if value
    )
    return answers or "general wellbeing"


def _history_document(context: RecommendationContext) -> str:
    journals = " ".join(text.strip() for text in context.journal_texts if text.strip())
    return ". ".join(
        part
        for part in [
            f"Wellness goal: {context.onboarding_goal}" if context.onboarding_goal else "",
            journals,
        ]
        if part
    )


def _metadata_signals(exercise: Exercise) -> set[str]:
    return {
        _normalize_signal(value)
        for value in (
            exercise.recommendation_tags
            + exercise.support_goals
            + exercise.intended_states
        )
        if value
    }


def _rule_evaluation(
    exercise: Exercise,
    context: RecommendationContext,
) -> tuple[float, list[str]]:
    metadata = _metadata_signals(exercise)
    answers = {
        key: _normalize_signal(value)
        for key, value in context.check_in_answers.items()
        if value
    }
    field_weights = {
        "support": 0.34,
        "state": 0.22,
        "body": 0.12,
        "energy": 0.10,
        "stress": 0.10,
        "focus": 0.08,
    }
    matched_fields = [
        key for key, value in answers.items() if value in metadata
    ]
    score = sum(field_weights.get(key, 0.04) for key in matched_fields)

    support = answers.get("support", "")
    state = answers.get("state", "")
    body = answers.get("body", "")
    energy = answers.get("energy", "")
    stress = answers.get("stress", "")

    if support == "calm down" and exercise.activation_level == "down_regulating":
        score += 0.12
    if support == "feel grounded" and exercise.activation_level in {"down_regulating", "neutral"}:
        score += 0.08
    if support == "get energy" and exercise.activation_level == "up_regulating":
        score += 0.14
    if state in {"overwhelmed", "anxious"} and exercise.activation_level == "down_regulating":
        score += 0.10
    if (
        state == "numb" or body in {"heavy", "disconnected"}
    ) and exercise.activation_level in {"neutral", "up_regulating"}:
        score += 0.08
    if body in {"tense", "restless"} and exercise.activation_level == "down_regulating":
        score += 0.06
    if stress == "very stressed" and exercise.activation_level == "down_regulating":
        score += 0.10

    contraindications = {
        _normalize_signal(value) for value in exercise.contraindication_tags if value
    }
    if set(answers.values()) & contraindications:
        score -= 0.40
    if exercise.breath_hold_required and (
        state in {"overwhelmed", "anxious"} or stress == "very stressed"
    ):
        score -= 0.32
    if energy in {"tired", "drained"}:
        if exercise.physical_intensity == "high":
            score -= 0.38
        elif exercise.physical_intensity == "moderate":
            score -= 0.10
    if stress == "very stressed" and exercise.physical_intensity == "high":
        score -= 0.18

    return float(np.clip(score, 0.0, 1.0)), matched_fields


def _rule_score(exercise: Exercise, context: RecommendationContext) -> float:
    return _rule_evaluation(exercise, context)[0]


def _reason_for(
    exercise: Exercise,
    context: RecommendationContext,
    matched_fields: list[str],
) -> str:
    answers = context.check_in_answers
    if "support" in matched_fields and answers.get("support"):
        return f"Chosen to help you {answers['support'].lower()} based on today's check-in."
    if "state" in matched_fields and answers.get("state"):
        return f"A gentle match for feeling {answers['state'].lower()} right now."
    if "body" in matched_fields and answers.get("body"):
        return f"Matched to the {answers['body'].lower()} body state you reported."
    if "energy" in matched_fields and answers.get("energy"):
        return f"Balanced for your {answers['energy'].lower()} energy today."
    if "focus" in matched_fields and answers.get("focus"):
        return f"Selected for the {answers['focus'].lower()} focus you reported."
    if exercise.activation_level == "down_regulating" and (
        _normalize_signal(answers.get("state", "")) in {"overwhelmed", "anxious"}
        or _normalize_signal(answers.get("stress", "")) == "very stressed"
    ):
        return "A low-intensity settling practice for your current check-in."
    return "A balanced practice for today's check-in and your longer-term goals."


def _collaborative_scores(
    user_id: str,
    exercise_ids: list[str],
    interactions: list[Interaction],
) -> tuple[dict[str, float], int]:
    ratings: dict[str, dict[str, float]] = defaultdict(dict)
    for interaction in interactions:
        ratings[interaction.user_id][interaction.exercise_id] = interaction.value

    target = ratings.get(user_id, {})
    if not target:
        return {}, 0

    neighbours: list[tuple[float, dict[str, float]]] = []
    for other_user, other_ratings in ratings.items():
        if other_user == user_id:
            continue
        common = sorted(set(target) & set(other_ratings))
        if len(common) < MIN_COMMON_INTERACTIONS:
            continue
        left = np.array([target[item] for item in common])
        right = np.array([other_ratings[item] for item in common])
        denominator = np.linalg.norm(left) * np.linalg.norm(right)
        similarity = float(np.dot(left, right) / denominator) if denominator else 0.0
        if similarity > 0:
            neighbours.append((similarity, other_ratings))

    if len(neighbours) < MIN_COLLABORATIVE_NEIGHBORS:
        return {}, len(neighbours)

    scores: dict[str, float] = {}
    for exercise_id in exercise_ids:
        weighted_sum = 0.0
        similarity_sum = 0.0
        for similarity, neighbour_ratings in neighbours:
            if exercise_id in neighbour_ratings:
                weighted_sum += similarity * neighbour_ratings[exercise_id]
                similarity_sum += similarity
        if similarity_sum:
            scores[exercise_id] = (weighted_sum / similarity_sum + 1.0) / 2.0
    return scores, len(neighbours)


def recommend(context: RecommendationContext) -> tuple[list[RecommendedItem], str, str]:
    excluded = set(context.excluded_exercise_ids)
    seen_ids: set[str] = set()
    candidates: list[Exercise] = []
    for item in context.exercises:
        if item.id in excluded or item.id in seen_ids:
            continue
        seen_ids.add(item.id)
        candidates.append(item)
    if not candidates:
        return [], "no-candidates", MODEL_NAME

    documents = [
        _current_document(context),
        _history_document(context),
        *[_exercise_document(item) for item in candidates],
    ]
    embeddings, embedding_backend = encode(documents)
    current_content_scores = np.clip(embeddings[2:] @ embeddings[0], 0.0, 1.0)
    history_content_scores = np.clip(embeddings[2:] @ embeddings[1], 0.0, 1.0)
    collaborative, neighbour_count = _collaborative_scores(
        context.user_id,
        [item.id for item in candidates],
        context.interactions,
    )
    collaborative_active = neighbour_count >= MIN_COLLABORATIVE_NEIGHBORS

    ranked: list[tuple[Exercise, RecommendedItem]] = []
    for index, exercise in enumerate(candidates):
        current_content = float(current_content_scores[index])
        history_content = float(history_content_scores[index])
        rules, matched_fields = _rule_evaluation(exercise, context)
        collaborative_score = collaborative.get(exercise.id, 0.5)
        if collaborative_active:
            final_score = (
                RULE_WEIGHT * rules
                + CURRENT_CONTENT_WEIGHT * current_content
                + HISTORY_CONTENT_WEIGHT * history_content
                + COLLABORATIVE_WEIGHT * collaborative_score
            )
        else:
            final_score = (
                0.72 * rules
                + 0.23 * current_content
                + 0.05 * history_content
            )

        ranked.append((
            exercise,
            RecommendedItem(
                exercise_id=exercise.id,
                score=round(final_score, 6),
                score_components={
                    "content": round(current_content, 6),
                    "current_check_in": round(current_content, 6),
                    "history": round(history_content, 6),
                    "collaborative": round(collaborative_score, 6)
                    if collaborative_active
                    else 0.0,
                    "rules": round(rules, 6),
                },
                reason=_reason_for(exercise, context, matched_fields),
            )
        ))

    ranked.sort(key=lambda pair: (-pair[1].score, pair[1].exercise_id))
    selected: list[RecommendedItem] = []
    category_counts: dict[str, int] = defaultdict(int)
    remaining = ranked.copy()
    while remaining and len(selected) < context.limit:
        best_index = max(
            range(len(remaining)),
            key=lambda index: (
                remaining[index][1].score
                - DIVERSITY_PENALTY * category_counts[remaining[index][0].category]
            ),
        )
        exercise, item = remaining.pop(best_index)
        selected.append(item)
        category_counts[exercise.category] += 1

    strategy = "hybrid" if collaborative_active else "content-based-cold-start"
    return selected, strategy, embedding_backend
