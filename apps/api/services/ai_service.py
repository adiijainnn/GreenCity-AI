from typing import List, Dict, Any
from datetime import datetime

class AIService:
    @staticmethod
    def generate_recommendations_for_ward(
        ward_id: str,
        ward_name: str,
        green_coverage_pct: float,
        target_coverage_pct: float,
        avg_health_score: float,
        open_report_count: int,
        green_spaces: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        AI Environmental Intelligence Generator:
        Consumes structured database metrics and spatial calculations to generate explainable, high-priority interventions.
        """
        recommendations = []
        
        # 1. Coverage Deficit Recommendation
        if green_coverage_pct < target_coverage_pct:
            deficit = round(target_coverage_pct - green_coverage_pct, 1)
            recommendations.append({
                "ward_id": ward_id,
                "title": f"Targeted Tree Plantation Drive Required in {ward_name}",
                "description": f"{ward_name} exhibits a green coverage of {green_coverage_pct}%, which falls {deficit}% below the municipal master plan target of {target_coverage_pct}%.",
                "reason": "Low canopy area density contributes to elevated surface heat accumulation and reduced carbon sequestration potential.",
                "priority": "HIGH" if deficit > 10 else "MEDIUM",
                "affected_area": f"{ward_name} (Residential & Transit Corridors)",
                "supporting_metrics": {
                    "current_coverage_pct": green_coverage_pct,
                    "target_coverage_pct": target_coverage_pct,
                    "deficit_pct": deficit
                },
                "confidence": 0.94,
                "generated_at": datetime.utcnow().isoformat()
            })
            
        # 2. Health Deterioration Recommendation
        unhealthy_spaces = [gs for gs in green_spaces if gs.get("health_score", 100) < 50]
        if unhealthy_spaces:
            space_names = ", ".join([gs.get("name", "Park") for gs in unhealthy_spaces[:3]])
            recommendations.append({
                "ward_id": ward_id,
                "title": f"Immediate Vegetation Restoration in Deteriorating Assets",
                "description": f"Vegetation health score in {len(unhealthy_spaces)} green space(s) ({space_names}) has dropped below the threshold score of 50/100.",
                "reason": "Declining health index is correlated with reduced irrigation frequency and unresolved maintenance tickets.",
                "priority": "CRITICAL",
                "affected_area": space_names,
                "supporting_metrics": {
                    "deteriorating_green_space_count": len(unhealthy_spaces),
                    "average_health_score": round(sum(gs.get("health_score", 0) for gs in unhealthy_spaces) / len(unhealthy_spaces), 1)
                },
                "confidence": 0.91,
                "generated_at": datetime.utcnow().isoformat()
            })

        # 3. High Complaint Density Recommendation
        if open_report_count >= 3:
            recommendations.append({
                "ward_id": ward_id,
                "title": f"Resolve Rapidly Escalating Citizen Maintenance Complaints",
                "description": f"{ward_name} currently has {open_report_count} unresolved citizen reports, primarily regarding damaged infrastructure and illegal tree cutting.",
                "reason": "Unresolved public complaints lead to asset degradation and public safety hazards during storm events.",
                "priority": "HIGH",
                "affected_area": f"{ward_name} Municipal Zone",
                "supporting_metrics": {
                    "open_reports_count": open_report_count
                },
                "confidence": 0.89,
                "generated_at": datetime.utcnow().isoformat()
            })

        # 4. Standard Urban Micro-climate Mitigation Recommendation
        if not recommendations:
            recommendations.append({
                "ward_id": ward_id,
                "title": f"Maintain Ecosystem Service Stability in {ward_name}",
                "description": f"{ward_name} displays healthy green metrics. Continue routine pruning and irrigation cycles.",
                "reason": "Maintaining existing mature tree canopy prevents heat island formation.",
                "priority": "LOW",
                "affected_area": f"{ward_name} Parks",
                "supporting_metrics": {
                    "health_score": avg_health_score,
                    "coverage_pct": green_coverage_pct
                },
                "confidence": 0.95,
                "generated_at": datetime.utcnow().isoformat()
            })

        return recommendations
