"""RAG layer for pharmaceutical text knowledge & Ghana seasonal demand patterns.

Provides grounded text context (not numbers). All quantitative figures
must come from deterministic structured database tools.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

GHANA_SEASONAL_KNOWLEDGE = [
    {
        "season": "Rainy Season (Major: April–July, Minor: September–October)",
        "climate": "Heavy tropical precipitation, increased humidity, standing water pools.",
        "disease_patterns": [
            "Malaria transmission spikes dramatically due to mosquito breeding in standing water.",
            "Waterborne diseases and diarrheal illnesses (gastroenteritis, cholera risks).",
            "Upper respiratory tract infections and childhood pneumonia.",
        ],
        "key_pharmaceutical_categories": [
            "Artemisinin-based combination therapies (Artemether-Lumefantrine, Artesunate-Amodiaquine)",
            "Malaria rapid diagnostic test kits (RDTs)",
            "Oral rehydration salts (ORS) and Zinc sulfate tablets",
            "Broad-spectrum antibiotics (Amoxicillin, Azithromycin, Ciprofloxacin)",
            "Antipyretics and analgesics (Paracetamol, Ibuprofen)",
        ],
        "advisory": "Ensure antimalarials and ORS have at least 6 months shelf-life remaining prior to April. Do not overstock syrups with short expiry.",
    },
    {
        "season": "Harmattan (December–February)",
        "climate": "Dry, dusty, north-easterly trade winds blowing from Sahara Desert; low relative humidity, sharp drop in nighttime temperature.",
        "disease_patterns": [
            "Acute respiratory infections, throat irritation, dry hacking cough, asthma exacerbations.",
            "Allergic rhinitis and epistaxis (nosebleeds) from dry nasal mucosa.",
            "Dry itchy skin, cracked lips, and contact dermatitis.",
            "Conjunctivitis (Apollo) and ocular irritation from airborne sand particulates.",
        ],
        "key_pharmaceutical_categories": [
            "Expectorant and antitussive cough syrups (Dextromethorphan, Guaifenesin)",
            "Throat lozenges (Amylmetacresol, Menthol)",
            "Antihistamines (Cetirizine, Loratadine, Chlorpheniramine)",
            "Lubricating eye drops (Carboxymethylcellulose, Artificial Tears)",
            "Saline nasal sprays and decongestants",
            "Topical emollients, Petroleum Jelly, Hydrocortisone 1% cream",
        ],
        "advisory": "Stock up early in November. Demand for cough syrups and eye drops accelerates rapidly within 48 hours of harmattan onset.",
    },
    {
        "season": "Back-to-School (September & January)",
        "climate": "School resumption periods; high child density in classrooms and boarding facilities.",
        "disease_patterns": [
            "Common pediatric colds, conjunctivitis, skin abrasions, intestinal worm infestations.",
        ],
        "key_pharmaceutical_categories": [
            "Pediatric multivitamin syrups (Lysine, Cod liver oil, Zinc)",
            "Broad-spectrum antihelminthics / dewormers (Albendazole 400mg, Mebendazole 500mg)",
            "First aid and antiseptic supplies (Dettol, Methylated spirit, Adhesive bandages, Povidone iodine)",
        ],
        "advisory": "Boarding school parents purchase bulk multivitamins and first-aid kits during late August and early January.",
    },
]

DISPENSING_POLICY_KNOWLEDGE = [
    {
        "topic": "FEFO Protocol (First-Expired, First-Out)",
        "rule": "Always dispense the batch with the nearest expiry date, regardless of arrival sequence.",
        "guideline": "Batches in the CRITICAL window (<= 7 days) must not be sold; record as EXPIRED or dispose according to FDA Ghana standards.",
    },
    {
        "topic": "Supplier Return Window",
        "rule": "Wholesale distributors in Ghana (e.g., PharmaCorp, Tobinco, Ernest Chemists) typically allow returns 60-90 days prior to expiry.",
        "guideline": "Monitor batches with 60 to 90 days remaining to submit return authorizations before distributor cutoff dates.",
    },
    {
        "topic": "Overstock Prevention",
        "rule": "Never reorder products where current sellable stock provides > 90 days of cover, unless seasonal surge is mathematically verified.",
    },
]


def retrieve_rag_context(query: str) -> dict[str, Any]:
    """Retrieve relevant text knowledge entries based on query keywords."""
    q = query.lower()
    matched_seasons = []
    for s in GHANA_SEASONAL_KNOWLEDGE:
        name = s["season"].lower()
        if any(w in q for w in ["season", "rain", "malaria", "weather", "july", "april", "october"]) and "rainy" in name:
            matched_seasons.append(s)
        elif any(w in q for w in ["harmattan", "dust", "cold", "cough", "december", "january", "dry"]) and "harmattan" in name:
            matched_seasons.append(s)
        elif any(w in q for w in ["school", "child", "student", "september", "deworm", "vitamin"]) and "school" in name:
            matched_seasons.append(s)
        elif any(w in q for w in ["stock up", "what should i buy", "what to order", "buying plan", "upcoming"]):
            matched_seasons.append(s)

    matched_policies = []
    if any(w in q for w in ["return", "supplier", "credit", "rma"]):
        matched_policies.append(DISPENSING_POLICY_KNOWLEDGE[1])
    if any(w in q for w in ["fefo", "shelf life", "expire", "expiring"]):
        matched_policies.append(DISPENSING_POLICY_KNOWLEDGE[0])
    if any(w in q for w in ["reorder", "overstock", "too much", "stop"]):
        matched_policies.append(DISPENSING_POLICY_KNOWLEDGE[2])

    if not matched_seasons and any(w in q for w in ["season", "buy", "stock"]):
        matched_seasons = GHANA_SEASONAL_KNOWLEDGE[:2]

    return {
        "ghana_seasonal_demand": matched_seasons,
        "pharmacy_policies": matched_policies,
    }
