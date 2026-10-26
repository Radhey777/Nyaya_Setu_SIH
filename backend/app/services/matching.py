"""
Baseline case relationship matching service for AICTE C³.

Algorithm version: v1.0-baseline

Detects potential relationships between cases using:
- Institution co-occurrence
- Category matching
- Normalized text similarity (word-overlap ratio on title)

Scoring thresholds:
  score > 0.8  → POSSIBLE_DUPLICATE
  0.5 ≤ score ≤ 0.8 → RELATED_COMPLAINT
  same institution only → SAME_INSTITUTION_UNRELATED (score=0)

This service is fully offline and makes no external calls.
"""
import re
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ALGORITHM_VERSION = "v1.0-baseline"


def _normalize(text: str) -> List[str]:
    """Lowercase, remove punctuation, return word list."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [w for w in text.split() if len(w) > 2]


def _word_overlap_ratio(a: str, b: str) -> float:
    """Jaccard-like word overlap ratio between two strings."""
    words_a = set(_normalize(a))
    words_b = set(_normalize(b))
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def detect_relationships(case, db: Session) -> List[dict]:
    """Detect case relationships for the given case against existing cases.

    Args:
        case: The Case ORM object (the new/updated case).
        db: SQLAlchemy Session.

    Returns:
        List of dicts with keys:
            case_b_id, relationship_type, score, reasons, matching_evidence
    """
    from app.models.case import Case
    from app.models.relationship import CaseRelationship, RelationshipType, ReviewStatus

    results: List[dict] = []

    try:
        # Fetch sibling cases at same institution (exclude self)
        siblings = (
            db.query(Case)
            .filter(
                Case.institution_id == case.institution_id,
                Case.id != case.id,
                Case.is_active == True,
            )
            .all()
        )

        for sibling in siblings:
            # --- Check idempotency ---
            existing = (
                db.query(CaseRelationship)
                .filter(
                    (
                        (CaseRelationship.case_a_id == case.id) &
                        (CaseRelationship.case_b_id == sibling.id)
                    ) | (
                        (CaseRelationship.case_a_id == sibling.id) &
                        (CaseRelationship.case_b_id == case.id)
                    )
                )
                .first()
            )
            if existing:
                continue

            score = 0.0
            reasons: List[str] = []
            evidence = {}

            # --- Category match ---
            same_category = (
                case.category and sibling.category and
                case.category.strip().lower() == sibling.category.strip().lower()
            )
            if same_category:
                score += 0.3
                reasons.append("Same complaint category")
                evidence["category_match"] = case.category

            # --- Title similarity ---
            title_score = 0.0
            if case.title and sibling.title:
                title_score = _word_overlap_ratio(case.title, sibling.title)
                evidence["title_overlap_ratio"] = round(title_score, 4)
                if title_score > 0:
                    score += title_score * 0.7
                    reasons.append(f"Title overlap ratio: {title_score:.2f}")

            # --- Determine relationship type ---
            if score > 0.8:
                rel_type = RelationshipType.POSSIBLE_DUPLICATE
            elif score >= 0.5:
                rel_type = RelationshipType.RELATED_COMPLAINT
            else:
                # Same institution but low similarity
                rel_type = RelationshipType.SAME_INSTITUTION_UNRELATED
                reasons = ["Same institution, different complaints"]
                evidence["institution_id"] = case.institution_id

            result = {
                "case_b_id": sibling.id,
                "relationship_type": rel_type,
                "score": round(min(score, 1.0), 4),
                "reasons": reasons,
                "matching_evidence": evidence,
            }
            results.append(result)

            # --- Persist the relationship ---
            rel = CaseRelationship(
                case_a_id=case.id,
                case_b_id=sibling.id,
                relationship_type=rel_type,
                score=round(min(score, 1.0), 4),
                reasons=reasons,
                matching_evidence=evidence,
                algorithm_version=ALGORITHM_VERSION,
                review_status=ReviewStatus.PENDING,
            )
            db.add(rel)

        db.commit()

    except Exception as exc:
        logger.error("Relationship detection failed: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

    return results


def detect_cross_bureau_relationships(db: Session) -> dict:
    """Detect cross-bureau relationships for all active institutions.

    Finds institutions with active cases in more than one bureau and
    creates SAME_INSTITUTION_UNRELATED or ACTION_CONFLICT relationships
    if they don't already exist.

    Uses rapidfuzz for institution name fuzzy matching (optional fallback
    to word-overlap if rapidfuzz unavailable).

    Returns: dict with keys: new_relationships_created, institutions_checked,
             skipped_existing, errors
    """
    from app.models.case import Case
    from app.models.relationship import CaseRelationship, RelationshipType, ReviewStatus
    from sqlalchemy import text

    # Try to import rapidfuzz; fall back to word-overlap if unavailable
    try:
        from rapidfuzz import fuzz as _fuzz
        def _title_similarity(a: str, b: str) -> float:
            return _fuzz.token_set_ratio(a, b) / 100.0
    except ImportError:
        logger.warning("rapidfuzz not available; falling back to word-overlap ratio")
        def _title_similarity(a: str, b: str) -> float:  # type: ignore[misc]
            return _word_overlap_ratio(a, b)

    ALGORITHM_VERSION_CB = "v1.1-cross-bureau"

    new_relationships_created = 0
    institutions_checked = 0
    skipped_existing = 0
    errors = 0

    try:
        # Find institutions with active cases in more than one bureau
        rows = db.execute(
            text(
                "SELECT institution_id, COUNT(DISTINCT bureau_id) AS bureau_count "
                "FROM cases "
                "WHERE is_active = true AND bureau_id IS NOT NULL "
                "GROUP BY institution_id "
                "HAVING COUNT(DISTINCT bureau_id) > 1"
            )
        ).fetchall()
    except Exception as exc:
        logger.error("Cross-bureau query failed: %s", exc)
        return {
            "new_relationships_created": 0,
            "institutions_checked": 0,
            "skipped_existing": 0,
            "errors": 1,
        }

    for row in rows:
        institution_id = row[0]
        institutions_checked += 1

        try:
            # Fetch all active cases for this institution that belong to some bureau
            inst_cases = (
                db.query(Case)
                .filter(
                    Case.institution_id == institution_id,
                    Case.is_active == True,
                    Case.bureau_id.isnot(None),
                )
                .all()
            )

            # Build pairs from different bureaus
            for i, case_a in enumerate(inst_cases):
                for case_b in inst_cases[i + 1:]:
                    if case_a.bureau_id == case_b.bureau_id:
                        continue  # same bureau — skip

                    # Idempotency check
                    existing = (
                        db.query(CaseRelationship)
                        .filter(
                            (
                                (CaseRelationship.case_a_id == case_a.id) &
                                (CaseRelationship.case_b_id == case_b.id)
                            ) | (
                                (CaseRelationship.case_a_id == case_b.id) &
                                (CaseRelationship.case_b_id == case_a.id)
                            )
                        )
                        .first()
                    )
                    if existing:
                        skipped_existing += 1
                        continue

                    score = 0.0
                    reasons: List[str] = []
                    evidence: dict = {"cross_bureau": True, "institution_id": institution_id}

                    # Category match
                    same_category = (
                        case_a.category and case_b.category and
                        case_a.category.strip().lower() == case_b.category.strip().lower()
                    )
                    if same_category:
                        score += 0.3
                        reasons.append("Same complaint category")
                        evidence["category_match"] = case_a.category

                    # Title similarity
                    title_overlap_ratio = 0.0
                    if case_a.title and case_b.title:
                        title_overlap_ratio = _title_similarity(case_a.title, case_b.title)
                        evidence["title_overlap_ratio"] = round(title_overlap_ratio, 4)
                        if title_overlap_ratio > 0:
                            score += title_overlap_ratio * 0.7
                            reasons.append(f"Title overlap ratio: {title_overlap_ratio:.2f}")

                    # Determine relationship type based on title overlap
                    if title_overlap_ratio > 0.8:
                        rel_type = RelationshipType.POSSIBLE_DUPLICATE
                    elif title_overlap_ratio > 0.5:
                        rel_type = RelationshipType.RELATED_COMPLAINT
                    else:
                        rel_type = RelationshipType.SAME_INSTITUTION_UNRELATED
                        if not reasons:
                            reasons = ["Same institution, different bureaus, low title similarity"]

                    rel = CaseRelationship(
                        case_a_id=case_a.id,
                        case_b_id=case_b.id,
                        relationship_type=rel_type,
                        score=round(min(score, 1.0), 4),
                        reasons=reasons,
                        matching_evidence=evidence,
                        algorithm_version=ALGORITHM_VERSION_CB,
                        review_status=ReviewStatus.PENDING,
                    )
                    db.add(rel)
                    new_relationships_created += 1

            # Commit per institution to keep batches small
            db.commit()

        except Exception as exc:
            logger.error(
                "Cross-bureau detection failed for institution_id=%s: %s",
                institution_id, exc
            )
            try:
                db.rollback()
            except Exception:
                pass
            errors += 1

    return {
        "new_relationships_created": new_relationships_created,
        "institutions_checked": institutions_checked,
        "skipped_existing": skipped_existing,
        "errors": errors,
    }
