from fastapi import FastAPI

from .engine import recommend
from .schemas import RecommendationContext, RecommendationResponse

app = FastAPI(
    title="Holistic Mind Local Recommender",
    version="1.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendationResponse)
def create_recommendations(
    context: RecommendationContext,
) -> RecommendationResponse:
    items, strategy, embedding_backend = recommend(context)
    return RecommendationResponse(
        model_version=f"hybrid-v1:{embedding_backend}",
        strategy=strategy,
        items=items,
    )
