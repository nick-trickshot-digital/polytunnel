/**
 * Shared recommendation prompt used by both the cached GET endpoint
 * and the forced-refresh POST endpoint.
 */
export const RECOMMENDATION_PROMPT = `Based on the current tunnel state, weather, and the time of year, generate 3-5 specific, actionable recommendations for Ant. Each should reference specific bed IDs and be immediately useful. Consider: empty space, companion planting, crop rotation, weather conditions, and seasonal timing.

For recommendations that suggest planting something, include an "action" object so the user can act on it with one tap. For recommendations that suggest a task (maintenance, watering schedule, etc.), include a task action instead. Not every recommendation needs an action — advice-only is fine too.

IMPORTANT for plant actions:
- Use the exact plant name from the database (e.g. "Broad Beans" not "broad beans" or "Fava Beans")
- Use real empty bed IDs from the tunnel state above
- bedFraction should be "full", "half", "third", or "quarter"

Format your response as a JSON array (and nothing else — no markdown, no explanation):
[
  {
    "title": "Short headline",
    "detail": "Full recommendation text",
    "priority": "low|medium|high",
    "relatedBeds": ["L1", "M3"],
    "category": "planting|maintenance|harvest|warning",
    "action": {
      "type": "plant",
      "plantName": "Tomatoes",
      "bedId": "L2",
      "bedFraction": "half"
    }
  },
  {
    "title": "Short headline for a task",
    "detail": "Full recommendation text",
    "priority": "medium",
    "relatedBeds": ["R1"],
    "category": "maintenance",
    "action": {
      "type": "task",
      "taskTitle": "Check broad bean supports",
      "taskCategory": "maintenance"
    }
  },
  {
    "title": "Advice without action",
    "detail": "Just informational advice",
    "priority": "low",
    "relatedBeds": [],
    "category": "planting"
  }
]`;
