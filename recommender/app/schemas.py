from typing import Literal

from pydantic import BaseModel, Field


class Exercise(BaseModel):
    id: str
    title: str
    category: str
    description: str = ""
    recommendation_tags: list[str] = Field(default_factory=list)
    support_goals: list[str] = Field(default_factory=list)
    intended_states: list[str] = Field(default_factory=list)
    contraindication_tags: list[str] = Field(default_factory=list)
    activation_level: Literal["down_regulating", "neutral", "up_regulating"] = "neutral"
    physical_intensity: Literal["low", "moderate", "high"] = "low"
    breath_hold_required: bool = False


class Interaction(BaseModel):
    user_id: str
    exercise_id: str
    value: float = Field(ge=-1.0, le=1.0)


class RecommendationContext(BaseModel):
    user_id: str
    onboarding_goal: str = ""
    check_in_answers: dict[str, str] = Field(default_factory=dict)
    journal_texts: list[str] = Field(default_factory=list, max_length=20)
    exercises: list[Exercise] = Field(min_length=1)
    interactions: list[Interaction] = Field(default_factory=list)
    excluded_exercise_ids: list[str] = Field(default_factory=list)
    limit: int = Field(default=3, ge=1, le=10)


class RecommendedItem(BaseModel):
    exercise_id: str
    score: float
    score_components: dict[str, float]
    reason: str
    exploration: bool = False


class RecommendationResponse(BaseModel):
    model_version: str
    strategy: str
    items: list[RecommendedItem]
