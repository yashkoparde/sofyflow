import os
import json
import numpy as np
from datasets import load_dataset

# Fallback embedding helper using TF-IDF / Cosine Similarity if sentence-transformers is optional
try:
    from sentence_transformers import SentenceTransformer
    HAS_ST = True
except ImportError:
    HAS_ST = False
    from sklearn.feature_extraction.text import TfidfVectorizer

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

class VoiceHindiRAGPipeline:
    def __init__(self, dataset_name="ai4bharat/MSMARCO-XI", config="hi", split="train", limit=500):
        print(f"Loading dataset {dataset_name} ({config})...")
        self.raw_dataset = load_dataset(dataset_name, config, split=split)
        print(f"Dataset loaded. Total samples: {len(self.raw_dataset)}")
        
        self.passages = []
        self.doc_map = []
        
        count = 0
        for item in self.raw_dataset:
            query = item.get("query", "")
            answers = item.get("answers", [])
            passages = item.get("passages", [])
            
            for p in passages:
                p_text = p.get("passage_text", "") if isinstance(p, dict) else str(p)
                if p_text.strip():
                    self.passages.append(p_text)
                    self.doc_map.append({
                        "query": query,
                        "answers": answers,
                        "passage": p_text
                    })
            count += 1
            if limit and count >= limit:
                break
                
        print(f"Indexed {len(self.passages)} passages from first {count} dataset items.")
        
        if HAS_ST:
            print("Initializing multilingual embedding model (paraphrase-multilingual-MiniLM-L12-v2)...")
            self.model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
            print("Encoding passages...")
            self.embeddings = self.model.encode(self.passages, show_progress_bar=True, normalize_embeddings=True)
        else:
            print("SentenceTransformers not found, using TF-IDF Vectorizer for Hindi text matching...")
            self.vectorizer = TfidfVectorizer()
            self.embeddings = self.vectorizer.fit_transform(self.passages)

    def retrieve(self, query_text: str, top_k: int = 3):
        print(f"\n[Retrieval] Query: '{query_text}'")
        if HAS_ST:
            query_vec = self.model.encode([query_text], normalize_embeddings=True)
            scores = np.dot(self.embeddings, query_vec.T).squeeze()
            top_indices = np.argsort(scores)[::-1][:top_k]
            results = []
            for idx in top_indices:
                results.append({
                    "score": float(scores[idx]),
                    "passage": self.passages[idx],
                    "metadata": self.doc_map[idx]
                })
            return results
        else:
            from sklearn.metrics.pairwise import cosine_similarity
            query_vec = self.vectorizer.transform([query_text])
            scores = cosine_similarity(self.embeddings, query_vec).squeeze()
            top_indices = np.argsort(scores)[::-1][:top_k]
            results = []
            for idx in top_indices:
                results.append({
                    "score": float(scores[idx]),
                    "passage": self.passages[idx],
                    "metadata": self.doc_map[idx]
                })
            return results

    def transcribe_audio_groq(self, audio_filepath: str, api_key: str = None) -> str:
        api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is required for audio transcription.")
        
        if not HAS_GROQ:
            import requests
            headers = {"Authorization": f"Bearer {api_key}"}
            with open(audio_filepath, "rb") as f:
                files = {"file": (os.path.basename(audio_filepath), f, "audio/wav")}
                data = {
                    "model": "whisper-large-v3",
                    "prompt": "Transcribe the speech accurately in Hindi / English."
                }
                res = requests.post("https://api.groq.com/openai/v1/audio/transcriptions", headers=headers, files=files, data=data)
                res.raise_for_status()
                return res.json().get("text", "")
        else:
            client = Groq(api_key=api_key)
            with open(audio_filepath, "rb") as file:
                transcription = client.audio.transcriptions.create(
                    file=(os.path.basename(audio_filepath), file.read()),
                    model="whisper-large-v3",
                    prompt="Transcribe the speech accurately in Hindi / English."
                )
            return transcription.text

    def generate_answer_groq(self, query_text: str, retrieved_passages: list, api_key: str = None) -> str:
        context_str = "\n\n".join([f"Passage {i+1}:\n{r['passage']}" for i, r in enumerate(retrieved_passages)])
        system_prompt = (
            "You are a helpful Voice RAG Assistant for Hindi and English queries. "
            "Answer the user's question accurately using only the provided context passages below. "
            "If the context does not contain the answer, state that clearly."
        )
        user_prompt = f"Context:\n{context_str}\n\nQuestion: {query_text}\n\nAnswer:"
        
        api_key = api_key or os.environ.get("GROQ_API_KEY")
        if not api_key:
            return f"[Simulated LLM Answer based on top context]\nContext excerpt: {retrieved_passages[0]['passage'][:200]}..."

        if not HAS_GROQ:
            import requests
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        else:
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            return completion.choices[0].message.content

    def end_to_end_voice_rag(self, audio_filepath: str = None, text_query: str = None, api_key: str = None):
        if audio_filepath:
            print(f"\n--- Step 1: Transcribing Audio ({audio_filepath}) ---")
            query = self.transcribe_audio_groq(audio_filepath, api_key=api_key)
            print(f"Transcribed Text: {query}")
        elif text_query:
            query = text_query
        else:
            raise ValueError("Provide either audio_filepath or text_query")
            
        print("\n--- Step 2: Retrieving Context Passages ---")
        passages = self.retrieve(query, top_k=3)
        for i, p in enumerate(passages):
            print(f"[{i+1}] (Score: {p['score']:.4f}) {p['passage'][:150]}...")
            
        print("\n--- Step 3: Generating Answer ---")
        answer = self.generate_answer_groq(query, passages, api_key=api_key)
        print(f"\nFinal Answer:\n{answer}")
        
        return {
            "query": query,
            "retrieved_passages": passages,
            "answer": answer
        }

if __name__ == "__main__":
    print("Initializing MSMARCO-XI Hindi RAG Pipeline...")
    pipeline = VoiceHindiRAGPipeline(limit=100)
    
    # Test query from MSMARCO dataset sample
    sample_item = pipeline.raw_dataset[0]
    test_query = sample_item.get("query", "भारत की राजधानी क्या है?")
    print(f"\nTesting RAG pipeline with sample query: '{test_query}'")
    pipeline.end_to_end_voice_rag(text_query=test_query)
