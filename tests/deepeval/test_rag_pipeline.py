import os
import json
import requests
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    ContextualRecallMetric,
    HallucinationMetric,
)

from deepeval.models.base_model import DeepEvalBaseLLM
from groq import Groq

BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:5000")
RAG_ENDPOINT = f"{BACKEND_URL}/api/rag/chat-all"
AUTH_TOKEN   = os.getenv("AUTH_TOKEN", "")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "dataset", "test_cases.json")

# ─── GROQ EVALUATOR SETUP ──────────────────────────────────────────────────
class GroqModel(DeepEvalBaseLLM):
    def __init__(self, model_name="llama-3.3-70b-versatile"):
        self.model_name = model_name
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def load_model(self):
        return self.client

    def generate(self, prompt: str) -> str:
        chat_completion = self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=self.model_name,
        )
        return chat_completion.choices[0].message.content

    async def a_generate(self, prompt: str) -> str:
        return self.generate(prompt)

    def get_model_name(self):
        return self.model_name

# Use Llama 3 via Groq as the judge
groq_evaluator = GroqModel()

def load_test_cases():
    with open(DATASET_PATH, "r") as f:
        return json.load(f)

def query_rag_backend(question: str) -> dict:
    payload  = {
        "query":   question,
        "history": []
    }
    headers  = { "Authorization": f"Bearer {AUTH_TOKEN}" }
    response = requests.post(RAG_ENDPOINT, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()

# ─── METRICS CONFIGURATION ────────────────────────────────────────────────
faithfulness_metric      = FaithfulnessMetric(threshold=0.7, model=groq_evaluator)
answer_relevancy_metric  = AnswerRelevancyMetric(threshold=0.7, model=groq_evaluator)
contextual_recall_metric = ContextualRecallMetric(threshold=0.6, model=groq_evaluator)
hallucination_metric     = HallucinationMetric(threshold=0.8, model=groq_evaluator)  # Score must be < threshold to pass

test_cases = load_test_cases()

@pytest.mark.parametrize("case", test_cases, ids=[c["input"][:40] for c in test_cases])
def test_rag_response(case):
    question        = case["input"]
    expected_output = case["expected_output"]

    result            = query_rag_backend(question)
    actual_output     = result.get("answer", "")
    retrieval_context = result.get("context", []) or []  # never None

    test_case = LLMTestCase(
        input=question,
        actual_output=actual_output,
        expected_output=expected_output,
        retrieval_context=retrieval_context,  # used by Faithfulness, Relevancy, Recall
        context=retrieval_context,            # required by HallucinationMetric
    )

    assert_test(
        test_case,
        metrics=[
            faithfulness_metric,
            answer_relevancy_metric,
            contextual_recall_metric,
            hallucination_metric,
        ]
    )