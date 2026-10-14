import os, json, csv, io, uuid, time, random, logging
from datetime import datetime, timedelta
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from databricks.sdk import WorkspaceClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ANZ Emergency Command Centre")
w = WorkspaceClient()

# ── constants ───────────────────────────────────────────────────────────
SPACE_ID        = "01f1c75681f014bb990ca57cedb34541"
PIPELINE_ID     = "013be777-1e0b-4eb3-bbb0-dd687c31465a"
DASHBOARD_ID    = "01f1c756879d1eb8b3c708f312c35bb4"
LB_ENDPOINT     = "projects/anz-emergency-mgmt/branches/production/endpoints/primary"
LB_HOST         = "ep-proud-bird-d6baoihj.database.ap-southeast-2.cloud.databricks.com"
LB_DB           = "emergency_mgmt"
LB_USER         = os.environ.get("DATABRICKS_SP_CLIENT_ID", "5aafef4b-2fd9-45a2-b359-4e92e51f0f1f")
LANDING_ZONE    = "/Volumes/gsethi/emergency_bronze/landing_zone"
WORKSPACE_URL   = os.environ.get("DATABRICKS_HOST", "")

# ── reference data ──────────────────────────────────────────────────────
REGIONS = [
    ("AU-NSW-SYD","Greater Sydney","NSW","AU",-33.87,151.21,12368,5312000,"high","bushfire"),
    ("AU-NSW-NC","North Coast NSW","NSW","AU",-29.43,153.36,49000,312000,"high","flood"),
    ("AU-VIC-MEL","Melbourne Metro","VIC","AU",-37.81,144.96,9993,5078000,"moderate","storm"),
    ("AU-VIC-GIP","Gippsland","VIC","AU",-38.17,146.04,41500,274000,"extreme","bushfire"),
    ("AU-QLD-SEQ","SE Queensland","QLD","AU",-27.47,153.03,22420,3800000,"high","flood"),
    ("AU-QLD-NQ","North Queensland","QLD","AU",-19.26,146.8,148000,230000,"extreme","cyclone"),
    ("AU-SA-ADL","Adelaide Metro","SA","AU",-34.93,138.6,3260,1380000,"moderate","bushfire"),
    ("AU-WA-PER","Perth Metro","WA","AU",-31.95,115.86,6418,2100000,"moderate","storm"),
    ("AU-WA-KIM","Kimberley","WA","AU",-15.77,128.74,419000,40000,"extreme","cyclone"),
    ("AU-TAS-HOB","Hobart Metro","TAS","AU",-42.88,147.33,1696,250000,"moderate","bushfire"),
    ("AU-NT-DRW","Darwin Metro","NT","AU",-12.46,130.84,3163,148000,"high","cyclone"),
    ("AU-ACT-CAN","Canberra","ACT","AU",-35.28,149.13,2358,460000,"moderate","bushfire"),
    ("NZ-AKL","Auckland","AKL","NZ",-36.85,174.76,5600,1660000,"moderate","flood"),
    ("NZ-WLG","Wellington","WLG","NZ",-41.29,174.78,4440,420000,"high","earthquake"),
    ("NZ-CHC","Christchurch","CAN","NZ",-43.53,172.64,4500,390000,"high","earthquake"),
]

INCIDENT_TYPES = ["bushfire","flood","storm","cyclone","earthquake"]
SEVERITIES     = ["low","medium","high","critical"]
AGENCIES       = ["NSW RFS","VIC CFA","QLD QFES","SA CFS","WA DFES","TAS TFS","NT PFES","ACT ESA","NZ FENZ"]
RESOURCE_TYPES = ["personnel","vehicle","aircraft","equipment","boat"]
STATUSES       = ["active","contained","resolved"]
WEATHER_STATIONS = [
    ("WS-SYD-01","Sydney Observatory","NSW","AU",-33.86,151.21),
    ("WS-MEL-01","Melbourne Olympic Park","VIC","AU",-37.82,144.98),
    ("WS-BNE-01","Brisbane Aero","QLD","AU",-27.38,153.13),
    ("WS-ADL-01","Adelaide Airport","SA","AU",-34.94,138.52),
    ("WS-PER-01","Perth Airport","WA","AU",-31.94,115.97),
    ("WS-HOB-01","Hobart Ellerslie","TAS","AU",-42.89,147.33),
    ("WS-DRW-01","Darwin Airport","NT","AU",-12.42,130.89),
    ("WS-CAN-01","Canberra Airport","ACT","AU",-35.31,149.20),
    ("WS-AKL-01","Auckland Aero","AKL","NZ",-37.01,174.80),
    ("WS-WLG-01","Wellington Kelburn","WLG","NZ",-41.28,174.77),
]

# ── helpers ─────────────────────────────────────────────────────────────
def _rand_ts(year, month):
    day = random.randint(1, 28)
    h, m, s = random.randint(0,23), random.randint(0,59), random.randint(0,59)
    return datetime(year, month, day, h, m, s)

def _get_pg_conn():
    import psycopg2
    # Use REST API to /api/2.0/postgres/credentials (the path w.postgres uses)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    resp = w.api_client.do("POST", "/api/2.0/postgres/credentials",
                           body={"endpoint": LB_ENDPOINT}, headers=headers)
    token = resp.get("token") or resp.get("password", "")
    return psycopg2.connect(host=LB_HOST, port=5432, dbname=LB_DB,
                            user=LB_USER, password=token, sslmode="require")

# ── generators ──────────────────────────────────────────────────────────
def gen_incidents(n):
    rows = []
    for _ in range(n):
        r = random.choice(REGIONS)
        itype = random.choice(INCIDENT_TYPES)
        sev = random.choices(SEVERITIES, weights=[40,30,20,10])[0]
        now = datetime.utcnow()
        rep = _rand_ts(now.year, now.month)
        resp = rep + timedelta(minutes=random.randint(5, 480))
        res = resp + timedelta(hours=random.randint(1, 72))
        cas = random.choices([0,0,0,0,1,2,3,5,10], weights=[50,15,10,5,5,5,3,4,3])[0]
        props = random.randint(0, 500) if sev in ("high","critical") else random.randint(0, 20)
        rows.append({
            "incident_id": f"INC-{uuid.uuid4().hex[:8].upper()}",
            "incident_type": itype, "severity": sev,
            "reported_at": rep.isoformat(), "responded_at": resp.isoformat(),
            "resolved_at": res.isoformat(),
            "latitude": r[4]+random.uniform(-0.5,0.5),
            "longitude": r[5]+random.uniform(-0.5,0.5),
            "region_code": r[0], "country": r[3],
            "lead_agency": random.choice(AGENCIES),
            "status": random.choice(STATUSES),
            "casualties": cas, "properties_affected": props,
        })
    return rows

def gen_regions(_n=None):
    return [dict(zip(["region_code","region_name","state","country",
                      "centre_lat","centre_lon","area_sq_km","population",
                      "risk_category","primary_hazard"], r)) for r in REGIONS]

def gen_resource_deployments(n):
    rows = []
    for _ in range(n):
        r = random.choice(REGIONS)
        now = datetime.utcnow()
        dep = _rand_ts(now.year, now.month)
        rows.append({
            "deployment_id": f"DEP-{uuid.uuid4().hex[:8].upper()}",
            "resource_type": random.choice(RESOURCE_TYPES),
            "resource_id": f"RES-{random.randint(1000,9999)}",
            "agency": random.choice(AGENCIES),
            "incident_id": f"INC-{uuid.uuid4().hex[:8].upper()}",
            "deployed_at": dep.isoformat(),
            "released_at": (dep + timedelta(hours=random.randint(1,48))).isoformat(),
            "status": random.choice(["deployed","returning","available"]),
            "base_station": f"BASE-{r[2]}-{random.randint(1,5)}",
            "region_code": r[0],
        })
    return rows

def gen_citizen_reports(n):
    now = datetime.utcnow()
    rows = []
    for _ in range(n):
        r = random.choice(REGIONS)
        rows.append({
            "report_id": f"CR-{uuid.uuid4().hex[:8].upper()}",
            "citizen_name": f"Citizen_{random.randint(1000,9999)}",
            "phone": f"+61{random.randint(400000000,499999999)}",
            "email": f"citizen{random.randint(100,999)}@example.com",
            "report_text": random.choice([
                "Smoke visible from highway, large plume rising.",
                "Flooding in low-lying areas, roads impassable.",
                "Strong winds causing property damage.",
                "Tremor felt, minor structural cracks observed.",
                "Creek rising rapidly, evacuation may be needed.",
            ]),
            "incident_type": random.choice(INCIDENT_TYPES),
            "severity_estimate": random.choice(SEVERITIES),
            "latitude": r[4]+random.uniform(-0.3,0.3),
            "longitude": r[5]+random.uniform(-0.3,0.3),
            "reported_at": _rand_ts(now.year, now.month).isoformat(),
            "region_code": r[0],
            "video_url": f"https://storage.example.com/reports/{uuid.uuid4().hex[:12]}.mp4" if random.random()>0.5 else None,
            "number_of_people_affected": random.randint(0, 50),
            "accessibility_needs": random.choice([None, "wheelchair", "hearing_impaired", "vision_impaired"]),
        })
    return rows

def gen_weather(n):
    now = datetime.utcnow()
    rows = []
    for _ in range(n):
        s = random.choice(WEATHER_STATIONS)
        temp = round(random.uniform(5, 45), 1)
        hum = random.randint(10, 95)
        wind = round(random.uniform(0, 120), 1)
        fdi = round(temp * wind / max(hum, 1), 1)
        rows.append({
            "station_id": s[0], "station_name": s[1],
            "observation_time": _rand_ts(now.year, now.month).isoformat(),
            "temperature_c": temp, "humidity_pct": hum,
            "wind_speed_kmh": wind,
            "wind_direction": random.choice(["N","NE","E","SE","S","SW","W","NW"]),
            "rainfall_mm": round(random.uniform(0, 50), 1),
            "pressure_hpa": round(random.uniform(990, 1030), 1),
            "fire_danger_index": fdi,
            "alert_category": "emergency" if fdi>75 else "warning" if fdi>50 else "watch" if fdi>25 else "none",
            "latitude": s[4], "longitude": s[5],
            "state": s[2], "country": s[3],
        })
    return rows

GENERATORS = {
    "incidents": gen_incidents,
    "regions": gen_regions,
    "resource_deployments": gen_resource_deployments,
    "citizen_reports": gen_citizen_reports,
    "weather": gen_weather,
}

# ── API routes ──────────────────────────────────────────────────────────
@app.post("/api/generate/{dataset}")
async def generate(dataset: str, request: Request):
    body = await request.json()
    n = int(body.get("count", 10))
    gen = GENERATORS.get(dataset)
    if not gen:
        return JSONResponse({"error": f"Unknown dataset: {dataset}"}, 400)
    data = gen(n)
    return {"dataset": dataset, "count": len(data), "data": data}

@app.post("/api/push/lakebase/{table}")
async def push_lakebase(table: str, request: Request):
    body = await request.json()
    rows = body.get("data", [])
    if not rows:
        return JSONResponse({"error": "No data to push"}, 400)
    try:
        conn = _get_pg_conn()
        cur = conn.cursor()
        cols = list(rows[0].keys())
        placeholders = ",".join(["%s"] * len(cols))
        col_names = ",".join(cols)
        sql = f'INSERT INTO emergency.{table} ({col_names}) VALUES ({placeholders})'
        for r in rows:
            cur.execute(sql, [r[c] for c in cols])
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "ok", "table": f"emergency.{table}", "rows_inserted": len(rows)}
    except Exception as e:
        logger.exception("Lakebase push failed")
        return JSONResponse({"error": str(e)}, 500)

@app.post("/api/push/volume/{dataset}")
async def push_volume(dataset: str, request: Request):
    body = await request.json()
    rows = body.get("data", [])
    if not rows:
        return JSONResponse({"error": "No data"}, 400)
    now = datetime.utcnow()
    yr, mo = now.year, f"{now.month:02d}"
    try:
        if dataset == "citizen_reports":
            fname = f"citizen_reports_{yr}_{mo}.json"
            fpath = f"{LANDING_ZONE}/citizen_reports/{fname}"
            content = "\n".join(json.dumps(r) for r in rows)
            w.files.upload(fpath, io.BytesIO(content.encode("utf-8")), overwrite=True)
        elif dataset == "weather":
            fname = f"weather_{yr}_{mo}.csv"
            fpath = f"{LANDING_ZONE}/weather/{fname}"
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            w.files.upload(fpath, io.BytesIO(buf.getvalue().encode("utf-8")), overwrite=True)
        else:
            return JSONResponse({"error": f"Unknown volume dataset: {dataset}"}, 400)
        return {"status": "ok", "path": fpath, "rows_written": len(rows)}
    except Exception as e:
        logger.exception("Volume push failed")
        return JSONResponse({"error": str(e)}, 500)

# ── pipeline ────────────────────────────────────────────────────────────
@app.post("/api/pipeline/run")
async def pipeline_run():
    try:
        resp = w.pipelines.start_update(pipeline_id=PIPELINE_ID)
        return {"update_id": resp.update_id}
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

@app.get("/api/pipeline/status/{update_id}")
async def pipeline_status(update_id: str):
    try:
        u = w.pipelines.get_update(pipeline_id=PIPELINE_ID, update_id=update_id)
        return {"state": u.update.state.value if u.update.state else "UNKNOWN",
                "creation_time": str(u.update.creation_time) if u.update.creation_time else None}
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

@app.get("/api/pipeline/history")
async def pipeline_history():
    try:
        p = w.pipelines.get(pipeline_id=PIPELINE_ID)
        updates = []
        if p.latest_updates:
            for u in p.latest_updates[:10]:
                updates.append({
                    "update_id": u.update_id,
                    "state": u.state.value if u.state else "UNKNOWN",
                    "creation_time": str(u.creation_time) if u.creation_time else None,
                })
        return {"pipeline_name": p.name, "state": p.state.value if p.state else "UNKNOWN",
                "updates": updates}
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

# ── genie ───────────────────────────────────────────────────────────────
@app.post("/api/genie/ask")
async def genie_ask(request: Request):
    body = await request.json()
    question = body.get("question", "")
    try:
        resp = w.genie.start_conversation(space_id=SPACE_ID, content=question)
        return {"conversation_id": resp.conversation_id, "message_id": resp.message_id}
    except Exception as e:
        logger.exception("Genie ask failed")
        return JSONResponse({"error": str(e)}, 500)

@app.get("/api/genie/poll/{conversation_id}/{message_id}")
async def genie_poll(conversation_id: str, message_id: str):
    try:
        msg = w.genie.get_message(space_id=SPACE_ID,
                                  conversation_id=conversation_id,
                                  message_id=message_id)
        status = msg.status.value if msg.status else "UNKNOWN"
        result = {"status": status}

        # Extract text, SQL, and description from attachments
        if hasattr(msg, "attachments") and msg.attachments:
            for att in msg.attachments:
                if hasattr(att, "query") and att.query:
                    result["sql"] = getattr(att.query, "query", str(att.query))
                    desc = getattr(att.query, "description", None)
                    if desc:
                        result["description"] = desc
                if hasattr(att, "text") and att.text:
                    result["text"] = getattr(att.text, "content", str(att.text))

        # Fetch query result rows when message is COMPLETED
        if status == "COMPLETED":
            try:
                # Use get_message_query_result to fetch data rows
                qr = w.genie.get_message_query_result(
                    space_id=SPACE_ID,
                    conversation_id=conversation_id,
                    message_id=message_id)
                # Extract columns from manifest
                if hasattr(qr, "statement_response") and qr.statement_response:
                    sr = qr.statement_response
                    if hasattr(sr, "manifest") and sr.manifest:
                        schema = getattr(sr.manifest, "schema", None)
                        if schema and hasattr(schema, "columns") and schema.columns:
                            result["columns"] = [c.name for c in schema.columns]
                    if hasattr(sr, "result") and sr.result:
                        result["rows"] = getattr(sr.result, "data_array", []) or []
                # Fallback: try columns/rows at top level
                if "columns" not in result and hasattr(qr, "columns"):
                    result["columns"] = qr.columns
                if "rows" not in result and hasattr(qr, "rows"):
                    result["rows"] = qr.rows
            except Exception as qe:
                logger.warning(f"Could not fetch query result: {qe}")
                # Fallback: try statement_execution if query_result has statement_id
                if hasattr(msg, "query_result") and msg.query_result:
                    sid = getattr(msg.query_result, "statement_id", None)
                    if sid:
                        try:
                            stmt = w.statement_execution.get_statement(sid)
                            if stmt.manifest and stmt.manifest.schema and stmt.manifest.schema.columns:
                                result["columns"] = [c.name for c in stmt.manifest.schema.columns]
                            if stmt.result and stmt.result.data_array:
                                result["rows"] = stmt.result.data_array
                        except Exception as se:
                            logger.warning(f"Statement fallback failed: {se}")

        return result
    except Exception as e:
        logger.exception("Genie poll failed")
        return JSONResponse({"error": str(e)}, 500)

# ── dashboard info ──────────────────────────────────────────────────────
@app.get("/api/dashboard/url")
async def dashboard_url():
    return {"dashboard_id": DASHBOARD_ID, "workspace_url": WORKSPACE_URL,
            "embed_path": f"/embed/dashboardsv3/{DASHBOARD_ID}"}

# ── static files & root ─────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    with open(html_path) as f:
        return f.read()
