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
CONTENT_WEIGHT = 0.72
COLLABORATIVE_WEIGHT = 0.18
RULE_WEIGHT = 0.10


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


def _user_document(context: RecommendationContext) -> str:
    answers = ". ".join(
        f"{key}: {value}" for key, value in context.check_in_answers.items() if value
    )
    journals = " ".join(text.strip() for text in context.journal_texts if text.strip())
    return ". ".join(
        part
        for part in [
            f"Wellness goal: {context.onboarding_goal}" if context.onboarding_goal else "",
            answers,
            journals,
        ]
        if part
    ) or "general wellbeing and gentle self care"


def _rule_score(exercise: Exercise, context: RecommendationContext) -> float:
    signals = {
        value.casefold() for value in context.check_in_answers.values() if value
    }
    if context.onboarding_goal:
        signals.add(context.onboarding_goal.casefold())
    metadata = {
        value.casefold()
        for value in (
            exercise.recommendation_tags
            + exercise.support_goals
            + exercise.intended_states
        )
    }
    exact_matches = len(signals & metadata)
    score = min(exact_matches / 3.0, 1.0)

    state = context.check_in_answers.get("state", "").casefold()
    energy = context.check_in_answers.get("energy", "").casefold()
    if state in {"overwhelmed", "anxious"} and exercise.activation_level == "down_regulating":
        score += 0.35
    if energy in {"tired", "drained", "low"} and exercise.physical_intensity == "high":
        score -= 0.35
    return float(np.clip(score, 0.0, 1.0))


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
        if not common:
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
    candidates = [item for item in context.exercises if item.id not in excluded]
    if not candidates:
        return [], "no-candidates", MODEL_NAME

    documents = [_user_document(context)] + [_exercise_document(item) for item in candidates]
    embeddings, embedding_backend = encode(documents)
    content_scores = np.clip(embeddings[1:] @ embeddings[0], 0.0, 1.0)
    collaborative, neighbour_count = _collaborative_scores(
        context.user_id,
        [item.id for item in candidates],
        context.interactions,
    )
    collaborative_active = neighbour_count >= MIN_COLLABORATIVE_NEIGHBORS

    ranked: list[RecommendedItem] = []
    for index, exercise in enumerate(candidates):
        content = float(content_scores[index])
        rules = _rule_score(exercise, context)
        collaborative_score = collaborative.get(exercise.id, 0.5)
        if collaborative_active:
            final_score = (
                CONTENT_WEIGHT * content
                + COLLABORATIVE_WEIGHT * collaborative_score
                + RULE_WEIGHT * rules
            )
        else:
            final_score = 0.88 * content + 0.12 * rules

        strongest = max(
            [("your current check-in", rules), ("your recent reflections", content)],
            key=lambda item: item[1],
        )[0]
        if collaborative_active and collaborative_score > max(content, rules):
            strongest = "practices helpful to people with similar preferences"

        ranked.append(
            RecommendedItem(
                exercise_id=exercise.id,
                score=round(final_score, 6),
                score_components={
                    "content": round(content, 6),
                    "collaborative": round(collaborative_score, 6)
                    if collaborative_active
                    else 0.0,
                    "rules": round(rules, 6),
                },
                reason=f"Recommended from {strongest}.",
            )
        )

    ranked.sort(key=lambda item: (-item.score, item.exercise_id))
    strategy = "hybrid" if collaborative_active else "content-based-cold-start"
    return ranked[: context.limit], strategy, embedding_backend
