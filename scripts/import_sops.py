import json, re, unicodedata
from pathlib import Path
from datetime import datetime
from docx import Document

SOURCE = Path(r"C:\Users\erik-\Documents\Codex\2026-07-09\files-mentioned-by-the-user-sop\outputs\SOPs bijgewerkt magazijn afweging")
OUT = Path(__file__).resolve().parents[1] / "data" / "sops.json"

def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value))

def rows(doc):
    result = []
    for table in doc.tables:
        for row in table.rows:
            cells = [clean(c.text) for c in row.cells]
            if any(cells): result.append(cells)
    return result

def tables(doc):
    return [[[clean(c.text) for c in row.cells] for row in table.rows] for table in doc.tables]

def table_items(all_tables, header_terms, value_col=1):
    output = []
    for table in all_tables:
        if not table: continue
        header = " | ".join(table[0]).lower()
        if all(term in header for term in header_terms):
            for row in table[1:]:
                if len(row) > value_col and clean(row[value_col]):
                    label = clean(row[0])
                    value = clean(row[value_col])
                    output.append(f"{label}: {value}" if label and label.lower() not in {"systemen", "documenten", "formulieren"} else value)
    return output

def get_value(table_rows, labels):
    for cells in table_rows:
        for i, cell in enumerate(cells[:-1]):
            if clean(cell).lower().rstrip(":") in labels:
                return clean(cells[i + 1])
    return ""

def section_map(doc):
    sections, current = {}, "Inleiding"
    for p in doc.paragraphs:
        text = clean(p.text)
        if not text: continue
        style = (p.style.name or "").lower()
        numbered = re.match(r"^\d+(?:\.\d+)*[. ]+(.+)$", text)
        if "heading" in style or numbered:
            current = clean(numbered.group(1) if numbered else text).rstrip(".")
            sections.setdefault(current, [])
        else:
            sections.setdefault(current, []).append(text)
    return sections

def find_sections(sections, terms):
    output = []
    for title, values in sections.items():
        if any(term in title.lower() for term in terms):
            output.extend(values)
    return output

def split_items(values):
    result = []
    for value in values:
        bits = re.split(r"(?:\n|;|(?<=\.)\s+(?=[A-ZÀ-ÖØ-Þ]))", value)
        result.extend(clean(x).lstrip("•-–0123456789. ") for x in bits if clean(x))
    return [x for x in result if len(x) > 2]

def extract(path):
    doc, stat = Document(path), path.stat()
    table_rows, all_tables = rows(doc), tables(doc)
    sections = section_map(doc)
    all_text = "\n".join(clean(p.text) for p in doc.paragraphs if clean(p.text))
    filename_match = re.match(r"(SOP-\d{3})\s+(.+)\.docx$", path.name, re.I)
    sop_number = (filename_match.group(1).upper() if filename_match else get_value(table_rows, {"sop nummer", "sop-nummer", "documentnummer"}))
    title = filename_match.group(2) if filename_match else ""
    purpose = find_sections(sections, ["doel", "purpose"])
    scope = find_sections(sections, ["scope", "toepassing"])
    steps = table_items(all_tables, ["stap", "werkwijze"]) or split_items(find_sections(sections, ["procedure", "werkwijze", "processtap", "procesflow"]))
    roles = split_items(find_sections(sections, ["rollen", "verantwoordelijk", "raci"]))
    req_table = next((t for t in all_tables if t and "categorie" in " | ".join(t[0]).lower() and "benodigd" in " | ".join(t[0]).lower()), [])
    req = {clean(r[0]).lower(): clean(r[1]) for r in req_table[1:] if len(r)>1}
    systems = split_items([req.get("systemen", "")]); documents = split_items([req.get("documenten", ""), req.get("formulieren", "")])
    exceptions = table_items(all_tables, ["risico", "beheersmaatregel"]) + table_items(all_tables, ["beslismoment", "beslissingsregel"])
    escalations = table_items(all_tables, ["escalatie"]) or split_items(find_sections(sections, ["escalat"]))
    kpis = table_items(all_tables, ["kpi", "definitie"]); mistakes = split_items(find_sections(sections, ["veelgemaakte", "fout"])); related = re.findall(r"SOP-\d{3}", all_text, re.I)
    owner = get_value(table_rows[:12], {"functionele proceseigenaar", "proceseigenaar", "eigenaar", "owner"})
    version = get_value(table_rows, {"versie", "version"})
    status = get_value(table_rows, {"status"}) or "Niet vastgelegd"
    date = get_value(table_rows, {"datum", "laatste wijziging", "last updated"})
    category = get_value(table_rows[:12], {"functioneel procesgebied", "procesgebied", "categorie", "category"})
    process = get_value(table_rows[:12], {"functioneel procesgebied", "procesgebied", "proces", "process"})
    # Existing document titles define operational groupings when metadata is absent.
    n = int(sop_number[-3:]) if sop_number else 0
    inferred = [(range(1,5),"QMS & Master Data"),(range(5,11),"Inbound & Voorraad"),(range(11,16),"Order & Transport"),(range(16,19),"Claims & Retouren"),(range(19,24),"Planning & Partners"),(range(24,31),"Kwaliteit & Governance")]
    technical_category = next((label for nums,label in inferred if n in nums), "Niet vastgelegd")
    category = category or technical_category
    process = process or category
    summary = clean((purpose or scope or [all_text[:420]])[0])[:420]
    return {
      "id": sop_number.lower() if sop_number else slugify(title), "sopNumber": sop_number or "Niet vastgelegd", "title": title or "Niet vastgelegd", "slug": slugify(f"{sop_number}-{title}"),
      "category": category, "process": process, "summary": summary or "Niet vastgelegd", "purpose": "\n\n".join(purpose) or "Niet vastgelegd", "scope": "\n\n".join(scope) or "Niet vastgelegd",
      "owner": owner or "Jorn / Hidde", "department": "Jorn / Hidde", "roles": roles, "systems": systems, "documents": documents, "steps": steps,
      "exceptions": exceptions, "escalations": escalations, "kpis": kpis, "commonMistakes": mistakes, "relatedSops": sorted(set(x.upper() for x in related if x.upper()!=sop_number)),
      "status": status, "version": version or "Niet vastgelegd", "lastUpdated": date or datetime.fromtimestamp(stat.st_mtime).date().isoformat(), "reviewDate": "Niet vastgelegd",
      "keywords": sorted(set(re.findall(r"[A-Za-zÀ-ÿ0-9]{4,}", f"{title} {all_text}".lower())))[:150], "sourceFile": str(path), "fullText": all_text,
      "sourceSections": [{"title": k, "content": v} for k,v in sections.items() if v]
    }

files = sorted(SOURCE.glob("SOP-*.docx"))
data = [extract(p) for p in files]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Imported {len(data)} SOPs to {OUT}")
