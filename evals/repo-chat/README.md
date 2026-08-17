# Repo Chat RAG Eval Dataset

This folder stores the first evaluation dataset for RepoMind repo chat. It is intentionally data-first: the dataset can be reviewed before adding paid model calls, runners, or CI jobs.

## Dataset

- `rag-eval-dataset.json` contains 100 evaluation questions for RepoMind's RAG pipeline.
- Each item has a stable `id`, target `repo`, `category`, `question`, `expectedJudgeCheck`, `expectedSources`, and `difficulty`.
- `expectedSources` is optional guidance for deterministic retrieval/citation checks. Empty arrays mean the judge should evaluate from retrieved context instead of a fixed source list.

## Eval Dimensions

The later LLM-as-judge runner should score each answer on:

- `retrieval_relevance`: retrieved chunks are relevant to the question.
- `answer_correctness`: answer matches known repo facts or expected answer points.
- `faithfulness`: answer is supported by retrieved/report context.
- `citation_support`: displayed citations support the answer's claims.
- `completeness`: answer covers the requested scope without unnecessary detail.
- `refusal_quality`: answer says there is not enough context when evidence is missing.

## Suggested Rubric

- `5`: correct, grounded, complete, and supported by strong citations.
- `4`: mostly correct with minor missing detail or weak wording.
- `3`: usable but incomplete, generic, or weakly cited.
- `2`: partially wrong, poorly grounded, or misses the main request.
- `1`: hallucinated, misleading, unsupported, or failed.

## Recommended First Run

Use a 30-question subset before running all 100 items:

- RepoMind implementation questions.
- One small repo such as `yuvidew/ImgSeek`.
- One medium Next.js repo.
- Negative/refusal questions.
- Citation stress tests.

After the judge prompt is tuned, run the full dataset and save JSON plus Markdown reports.
