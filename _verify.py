import json
data = json.load(open("jobs.json", "r", encoding="utf-8"))
companies = set(j["company"] for j in data)
locations = set(j["location"] for j in data)
urls = set(j["apply_url"] for j in data)
print(f"Total jobs: {len(data)}")
print(f"\nCompanies ({len(companies)}):")
for c in sorted(companies):
    print(f"  - {c}")
print(f"\nLocations: {sorted(locations)}")
print(f"\nApply URLs: {urls}")