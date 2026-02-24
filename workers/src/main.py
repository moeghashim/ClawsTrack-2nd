from __future__ import annotations

from workers.src.analysis.comparison import build_comparison_run
from workers.src.analysis.openai_analyzer import OpenAIAnalyzer
from workers.src.analysis.rank_shift import detect_rank_shifts
from workers.src.common.config import settings
from workers.src.common.store import JsonlStore
from workers.src.ingestion.normalize import normalize_releases
from workers.src.ingestion.persist import persist_comparison_run, persist_repo_batch
from workers.src.ingestion.scrapling_github import GitHubScraplingIngestor
from workers.src.notifications import build_rank_shift_notifications


def run_ingestion() -> None:
    ingestor = GitHubScraplingIngestor()
    analyzer = OpenAIAnalyzer(settings.openai_api_key, settings.openai_model)
    file_store = JsonlStore()
    use_db = bool(settings.database_url)

    print(f"Starting ingestion for {len(settings.repo_urls)} repositories (db_persistence={use_db})")

    all_analysis_rows = []

    for repo_url in settings.repo_urls:
        snapshot = ingestor.fetch_snapshot(repo_url)
        releases = ingestor.fetch_releases(repo_url)
        normalized = normalize_releases(releases)

        analyses = []
        for ev in normalized:
            result = analyzer.analyze_change(ev.title, ev.body, str(ev.source_url))
            row = {"repo_url": repo_url, **result.model_dump(mode="json")}
            analyses.append(row)
            all_analysis_rows.append(row)

        # Always keep local artifact trail for debugging/audits.
        file_store.append_model("repository_snapshots", snapshot)
        for rel in releases:
            file_store.append_model("release_events", rel)
        for ev in normalized:
            file_store.append_model("normalized_events", ev)
        for a in analyses:
            file_store.append_raw("change_analyses", a)

        if use_db:
            result = persist_repo_batch(
                repo_url,
                snapshot.model_dump(mode="json"),
                [r.model_dump(mode="json") for r in releases],
                analyses,
            )
            print(
                "repo=%s releases_detected=%d normalized_events=%d analyses=%d db_releases=%d db_analyses=%d"
                % (
                    repo_url,
                    len(releases),
                    len(normalized),
                    len(analyses),
                    result["releases_written"],
                    result["analyses_written"],
                )
            )
        else:
            print(
                "repo=%s snapshot_at=%s releases_detected=%d normalized_events=%d analyses=%d"
                % (
                    repo_url,
                    snapshot.captured_at.isoformat(),
                    len(releases),
                    len(normalized),
                    len(analyses),
                )
            )

    if all_analysis_rows:
        history = file_store.read_all("comparison_runs")
        modes = ["executive", "technical", "security", "usecase"]

        for mode in modes:
            comparison = build_comparison_run(mode=mode, rows=all_analysis_rows)
            previous_same_mode = next((r for r in reversed(history) if r.get("mode") == mode), None)

            shifts = []
            notifications = []
            if previous_same_mode:
                shifts = detect_rank_shifts(previous_same_mode.get("results", []), comparison.get("results", []), min_shift=1)
                notifications = build_rank_shift_notifications(shifts)

            comparison["rankShifts"] = shifts
            comparison["notifications"] = notifications

            file_store.append_raw("comparison_runs", comparison)
            if use_db:
                persist_comparison_run(mode, comparison)

            print(
                f"comparison_run mode={mode} repos={len(comparison['repositories'])} shifts={len(shifts)} notifications={len(notifications)}"
            )


if __name__ == "__main__":
    run_ingestion()
