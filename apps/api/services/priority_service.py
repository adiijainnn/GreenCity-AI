from typing import Dict, Any

class PriorityService:
    @staticmethod
    def calculate_ward_priority_score(
        green_coverage_pct: float,
        target_coverage_pct: float,
        avg_health_score: float,
        open_report_count: int,
        accessibility_300m_pct: float
    ) -> Dict[str, Any]:
        """
        Municipal Decision Support Priority Engine:
        Priority Score (0 to 100):
        Higher score = Urgency for intervention.
        Factors:
        - Low Green Coverage Deficit (35%)
        - Poor Health Contribution (25%)
        - Citizen Complaint Volume (20%)
        - Accessibility Gap (20%)
        """
        coverage_deficit = max(0.0, target_coverage_pct - green_coverage_pct)
        coverage_score = min(100.0, (coverage_deficit / target_coverage_pct) * 100.0) if target_coverage_pct > 0 else 50.0
        
        health_deficit_score = max(0.0, 100.0 - avg_health_score)
        
        complaint_score = min(100.0, open_report_count * 12.0)
        
        accessibility_gap_score = max(0.0, 100.0 - accessibility_300m_pct)
        
        total_priority = (
            (coverage_score * 0.35) +
            (health_deficit_score * 0.25) +
            (complaint_score * 0.20) +
            (accessibility_gap_score * 0.20)
        )
        
        priority_score = round(total_priority, 1)
        
        if priority_score >= 70:
            level = "CRITICAL"
        elif priority_score >= 50:
            level = "HIGH"
        elif priority_score >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "priority_score": priority_score,
            "level": level,
            "breakdown": {
                "coverage_deficit_impact": round(coverage_score * 0.35, 1),
                "health_deficit_impact": round(health_deficit_score * 0.25, 1),
                "complaint_volume_impact": round(complaint_score * 0.20, 1),
                "accessibility_gap_impact": round(accessibility_gap_score * 0.20, 1)
            },
            "formula_weights": {
                "coverage_deficit": "35%",
                "health_deficit": "25%",
                "complaints": "20%",
                "accessibility_gap": "20%"
            }
        }
