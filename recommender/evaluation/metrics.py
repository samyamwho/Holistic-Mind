"""
Evaluation metrics for Information Retrieval (IR), Clinical Safety, and Recommender Diversity.
Offline ranking, benchmark-label violations, and category diversity metrics.
"""

import math
from typing import Sequence
from app.schemas import Exercise


def compute_dcg(relevances: Sequence[float], k: int = 4) -> float:
    """
    Discounted Cumulative Gain at rank K using standard exponential gain.
    Only non-negative relevance contributes to positive ranking gain.
    Formula: sum_{i=1}^k (2^{rel_i} - 1) / log2(i + 1)
    """
    dcg = 0.0
    for i, rel in enumerate(relevances[:k]):
        gain = (2.0 ** max(0, rel)) - 1.0
        discount = math.log2(i + 2)  # i=0 -> log2(2) = 1.0
        dcg += gain / discount
    return dcg


def compute_ndcg(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    k: int = 4,
) -> float:
    """
    Normalized Discounted Cumulative Gain at rank K.
    Compares the actual DCG against the Ideal DCG (IDCG).
    """
    actual_relevances = [ground_truth.get(ex_id, 0) for ex_id in recommended_ids[:k]]
    actual_dcg = compute_dcg(actual_relevances, k=k)

    # Sort all candidate items in ground truth by descending relevance to find IDCG
    ideal_relevances = sorted(
        [max(0, rel) for rel in ground_truth.values()],
        reverse=True,
    )
    idcg = compute_dcg(ideal_relevances, k=k)

    if idcg <= 0.0:
        return 0.0
    return float(min(1.0, actual_dcg / idcg))


def compute_precision_at_k(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    k: int = 4,
    threshold: int = 2,
) -> float:
    """
    Precision@K: Fraction of top-K items that are clinically relevant (relevance >= threshold).
    """
    if not recommended_ids or k <= 0:
        return 0.0
    top_k = recommended_ids[:k]
    relevant_count = sum(1 for ex_id in top_k if ground_truth.get(ex_id, 0) >= threshold)
    return float(relevant_count / k)


def compute_recall_at_k(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    k: int = 4,
    threshold: int = 2,
) -> float:
    """
    Recall@K: Fraction of all relevant items in ground truth retrieved in top-K.
    """
    total_relevant = sum(1 for rel in ground_truth.values() if rel >= threshold)
    if total_relevant == 0:
        return 1.0
    top_k = recommended_ids[:k]
    retrieved_relevant = sum(1 for ex_id in top_k if ground_truth.get(ex_id, 0) >= threshold)
    return float(retrieved_relevant / total_relevant)


def compute_mrr(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    threshold: int = 2,
) -> float:
    """
    Mean Reciprocal Rank: 1 / (rank of first item with relevance >= threshold).
    """
    for rank, ex_id in enumerate(recommended_ids, start=1):
        if ground_truth.get(ex_id, 0) >= threshold:
            return float(1.0 / rank)
    return 0.0


def compute_hit_rate(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    k: int = 4,
    threshold: int = 2,
) -> float:
    """
    Hit Rate@K: 1.0 if at least one item with relevance >= threshold is in top-K, else 0.0.
    """
    top_k = recommended_ids[:k]
    return 1.0 if any(ground_truth.get(ex_id, 0) >= threshold for ex_id in top_k) else 0.0


def compute_safety_violation_rate(
    recommended_ids: Sequence[str],
    ground_truth: dict[str, int],
    k: int = 4,
) -> float:
    """
    Safety Violation Rate: Percentage of top-K items that are clinically contraindicated (relevance == -1).
    Target must be 0.0%.
    """
    top_k = recommended_ids[:k]
    if not top_k:
        return 0.0
    contraindicated_count = sum(1 for ex_id in top_k if ground_truth.get(ex_id, 0) < 0)
    return float((contraindicated_count / len(top_k)) * 100.0)


def compute_intra_list_diversity(
    recommended_ids: Sequence[str],
    catalog_by_id: dict[str, Exercise],
    k: int = 4,
) -> float:
    """
    Intra-List Diversity (ILD): Average pairwise distance between recommended items based on category.
    Distance is 1.0 if categories differ, 0.0 if identical.
    """
    top_k = recommended_ids[:k]
    if len(top_k) < 2:
        return 0.0
    pairs = 0
    distance_sum = 0.0
    for i in range(len(top_k)):
        for j in range(i + 1, len(top_k)):
            pairs += 1
            cat_i = catalog_by_id.get(top_k[i])
            cat_j = catalog_by_id.get(top_k[j])
            if cat_i and cat_j and cat_i.category != cat_j.category:
                distance_sum += 1.0
    return float(distance_sum / pairs) if pairs > 0 else 0.0


def compute_catalog_coverage(
    all_recommended_ids: set[str],
    catalog_ids: set[str],
) -> float:
    """
    Catalog Coverage: Percentage of all unique catalog items recommended at least once.
    """
    if not catalog_ids:
        return 0.0
    covered = len(all_recommended_ids & catalog_ids)
    return float((covered / len(catalog_ids)) * 100.0)
