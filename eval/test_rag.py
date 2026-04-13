import os
import requests
from groq import Groq
from deepeval import evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualRecallMetric,
    ContextualPrecisionMetric,
)
from deepeval.test_case import LLMTestCase
from deepeval.models.base_model import DeepEvalBaseLLM
from dotenv import load_dotenv

# ========================= LOAD SECRETS =========================
load_dotenv() # Load from .env file
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class GroqEvaluator(DeepEvalBaseLLM):
    """Uses Groq (free) instead of OpenAI as the DeepEval judge."""
    def __init__(self):
        self.model_name = "llama-3.3-70b-versatile"
        self.client = Groq(api_key=GROQ_API_KEY)

    def load_model(self): return self.client
    def get_model_name(self): return self.model_name

    def generate(self, prompt: str) -> str:
        res = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        output = res.choices[0].message.content
        # Fix: open-source LLMs sometimes echo {{ }} from format strings
        return output.replace("{{", "{").replace("}}", "}")

    async def a_generate(self, prompt: str) -> str:
        return self.generate(prompt)


groq_evaluator = GroqEvaluator()

# ========================= CONFIG =========================
BASE_URL   = "http://localhost:5000/api/rag"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YmE5ZTBkNWRmZTUwODg3N2RhMDY3ZiIsImVtYWlsIjoiZGluZXNobWFoYXJhbmExM0BnbWFpbC5jb20iLCJuYW1lIjoiZGluZXNoIG1haGFyYW5hIiwic3ViIjoiNjliYTllMGQ1ZGZlNTA4ODc3ZGEwNjdmIiwiaWF0IjoxNzc2MDgzNzE5LCJleHAiOjE3NzY2ODg1MTl9.zayn0kOv8MjwPk4r3bsBteaJNw11bqrJ2Z5KAugjKrE"
DOC_ID     = "d9b99eec-1809-4075-ad7a-b12180c25d90"

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type":  "application/json"
}

# ========================= QUERY =========================
def query_rag(question):
    try:
        res = requests.post(
            f"{BASE_URL}/chat",
            json={"docId": DOC_ID, "query": question},
            headers=HEADERS
        )
        
        # ✅ Add these debug lines
        print(f"  Status: {res.status_code}")
        print(f"  Raw response: {res.text[:200]}")
        
        data = res.json()
        return {
            "answer":  data.get("answer", ""),
            "context": data.get("context", [])
        }
    except Exception as e:
        print(f"  ERROR: {e}")
        return {"answer": "Error", "context": []}
# ========================= TEST QUESTIONS =========================
test_dataset = [
    {
        "input": "What are the programming languages known by this person?",
        "expected_output": "JavaScript, TypeScript, Java, SQL, HTML5, CSS3"
    },
    {
        "input": "What frameworks and libraries does this person know?",
        "expected_output": "React.js, Node.js, Express.js, React Native, Tailwind CSS, Chart.js, Recharts"
    },
    {
        "input": "What databases does this person have experience with?",
        "expected_output": "MongoDB, REST API, Vector Databases"
    },
    {
        "input": "What projects has this person built?",
        "expected_output": "AI Chatbot with RAG Pipeline, Contact Management System, Prompt-to-Image Generator"
    },
    {
        "input": "What is the person's email and location?",
        "expected_output": "dineshmaharana13@gmail.com, Bhubaneswar, India"
    },
    {
        "input": "What developer tools does this person use?",
        "expected_output": "VS Code, Git, GitHub, Expo CLI, Postman, Thunder Client"
    },
    {
        "input": "What concepts does this person know?",
        "expected_output": "MVC Architecture, RAG Pipeline, State Management, Agile, CI/CD, API Integration"
    },
]

# ========================= BUILD TEST CASES =========================
def build_test_cases():
    test_cases = []

    print("=" * 55)
    print(f"Testing {len(test_dataset)} questions on the resume")
    print("=" * 55)

    for i, item in enumerate(test_dataset):
        print(f"\n[{i+1}/{len(test_dataset)}] {item['input']}")
        result = query_rag(item["input"])
        print(f"  Answer:  {result['answer'][:100]}...")
        print(f"  Chunks:  {len(result['context'])} retrieved")

        test_cases.append(LLMTestCase(
            input             = item["input"],
            actual_output     = result["answer"],
            expected_output   = item["expected_output"],
            retrieval_context = result["context"],
        ))

    return test_cases

# ========================= RUN =========================
if __name__ == "__main__":
    test_cases = build_test_cases()

    print(f"\n{'='*55}")
    print("Running accuracy evaluation...")
    print(f"{'='*55}\n")

    evaluate(test_cases, [
        AnswerRelevancyMetric(threshold=0.7, model=groq_evaluator, verbose_mode=True),
        FaithfulnessMetric(threshold=0.7, model=groq_evaluator, verbose_mode=True),
        ContextualRecallMetric(threshold=0.7, model=groq_evaluator, verbose_mode=True),
        ContextualPrecisionMetric(threshold=0.7, model=groq_evaluator, verbose_mode=True),
    ])

    print("\nDone! View results: https://app.confident-ai.com")