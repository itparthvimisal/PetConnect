"""
PetConnect - Flask back end (SQLite)

Run:
    pip install -r requirements.txt
    python app.py
Then open http://127.0.0.1:5000
"""
import os
import sqlite3
import uuid
from datetime import date
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
# Set DATA_DIR to a persistent directory (for example /var/data on Render)
# when you want uploaded photos and the SQLite database to survive restarts.
DATA_DIR = os.environ.get("DATA_DIR", BASE_DIR)
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
DB_PATH = os.path.join(DATA_DIR, "petconnect.db")
ALLOWED_EXT = {"png", "jpg", "jpeg", "gif", "webp"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-before-deploying")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB per upload
CORS(app)  # lets index.html work even when opened straight from disk

serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])


# ---------------------------------------------------------------- database
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL CHECK (report_type IN ('lost','found')),
    name TEXT,
    species TEXT NOT NULL,
    breed TEXT,
    color TEXT,
    location TEXT NOT NULL,
    event_date TEXT,
    description TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'open',
    user_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS adoptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    age TEXT,
    gender TEXT,
    shelter TEXT,
    location TEXT,
    about TEXT,
    image_url TEXT
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

def ph(photo_id):
    """Real photographs hosted by Unsplash (free to use, hot-linking allowed)."""
    return f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w=600&h=450&q=70"


SEED_PETS = [
    ("lost", "Bruno", "Dog", "Labrador Retriever", "Golden yellow", "Gandhi Park, Sector 12", "2026-09-04",
     "Friendly, wearing a red collar with a bell. Responds to his name.", "Ravi", "98765 43210",
     ph("1552053831-71594a27632d")),
    ("lost", "Misty", "Cat", "Long-haired domestic cat", "White and grey", "MG Road near City Mall", "2026-09-02",
     "Very shy with a fluffy white and grey coat. Missing since the evening.", "Anita", "98111 22233",
     ph("1472491235688-bdc81a63246e")),
    ("lost", "Coco", "Dog", "Beagle", "Brown and white", "Lake View Colony", "2026-08-30",
     "Microchipped. Slightly limps on the left back leg.", "Karan", "99887 76655",
     ph("1511870381062-cb2443fb0fd9")),
    ("lost", "Snowy", "Rabbit", "White rabbit", "White", "Green Avenue Society", "2026-09-05",
     "Escaped from the garden. Very soft white fur.", "Meera", "97000 11122",
     ph("1589933767411-38a58367efd7")),
    ("found", "", "Dog", "Mixed breed", "Black", "Railway Station Road", "2026-09-03",
     "Found wandering, calm and well fed. Wearing a blue collar without a tag.", "Sameer", "96543 21098",
     ph("1518020382113-a7e8fc38eac9")),
    ("found", "", "Cat", "Tabby", "Brown tabby", "Temple Street Market", "2026-09-01",
     "Healthy and friendly cat found near a tea stall.", "Priya", "95432 10987",
     ph("1543852786-1cf6624b9987")),
    ("found", "", "Bird", "Parakeet", "Green and white", "City Library Garden", "2026-09-06",
     "Green parakeet that seems tame. Currently safe and being looked after.", "Imran", "94321 09876",
     ph("1580233791453-ae1f0e05fd16")),
    ("found", "", "Dog", "Long-haired mixed breed", "White and brown", "Highway Service Road", "2026-08-31",
     "Large, friendly and well trained, so probably someone's pet.", "Deepa", "93210 98765",
     ph("1587300003388-59208cc962cb")),
]

SEED_ADOPTIONS = [
    ("Luna", "Dog", "Indie", "8 months", "Female", "Paws Shelter", "Pune",
     "Playful puppy, vaccinated and dewormed. Great with kids.",
     ph("1537151625747-768eb6cf92b2")),
    ("Simba", "Cat", "Orange tabby", "1 year", "Male", "Whisker Home", "Mumbai",
     "Cuddly and litter trained. Gets along with other cats.",
     ph("1596854407944-bf87f6fdd49e")),
    ("Max", "Dog", "Black and white mix", "3 years", "Male", "Second Chance Rescue", "Delhi",
     "Calm, loyal and house trained. Needs a home with space to run.",
     ph("1503256207526-0d5d80fa2f47")),
    ("Bella", "Cat", "Silver tabby", "2 years", "Female", "Whisker Home", "Bengaluru",
     "Gentle and curious, loves window seats and quiet company.",
     ph("1574158622682-e40e69881006")),
    ("Mimi", "Cat", "Calico", "3 years", "Female", "Small Paws Care", "Hyderabad",
     "Independent but affectionate. Spayed and vaccinated.",
     ph("1503777119540-ce54b422baff")),
    ("Thumper", "Rabbit", "Dutch", "1 year", "Male", "Small Paws Care", "Hyderabad",
     "Gentle rabbit, used to being handled. Eats hay and veggies.",
     ""),  # empty = illustrated rabbit placeholder
    ("Rocky", "Dog", "Small mixed breed", "4 years", "Male", "Paws Shelter", "Chennai",
     "Sweet and lazy. Healthy, neutered and vaccinated.",
     ph("1588943211346-0908a1fb0b01")),
]


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA)
    # Older versions used random placeholder photos. Remove those sample rows so the
    # new sample data (with correct photos) is inserted. Real user reports are kept.
    db.execute("DELETE FROM pets WHERE user_id IS NULL AND image_url LIKE '%loremflickr.com%'")
    db.execute("DELETE FROM adoptions WHERE image_url LIKE '%loremflickr.com%'")
    if db.execute("SELECT COUNT(*) FROM pets WHERE user_id IS NULL").fetchone()[0] == 0:
        db.executemany(
            """INSERT INTO pets (report_type,name,species,breed,color,location,event_date,
               description,contact_name,contact_phone,image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            SEED_PETS,
        )
    if db.execute("SELECT COUNT(*) FROM adoptions").fetchone()[0] == 0:
        db.executemany(
            """INSERT INTO adoptions (name,species,breed,age,gender,shelter,location,about,image_url)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            SEED_ADOPTIONS,
        )
    db.commit()
    db.close()


# ---------------------------------------------------------------- auth helpers
def make_token(user_id):
    return serializer.dumps({"uid": user_id})


def current_user():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = serializer.loads(header[7:], max_age=60 * 60 * 24 * 7)  # 7 days
    except (BadSignature, SignatureExpired):
        return None
    return get_db().execute("SELECT id,name,email FROM users WHERE id=?", (data["uid"],)).fetchone()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify(error="Please log in to continue."), 401
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


# ---------------------------------------------------------------- pages / files
@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


# ---------------------------------------------------------------- auth API
@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not name or "@" not in email or len(password) < 6:
        return jsonify(error="Enter your name, a valid email and a password of at least 6 characters."), 400
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify(error="An account with this email already exists. Try logging in."), 409
    cur = db.execute(
        "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
        (name, email, generate_password_hash(password)),
    )
    db.commit()
    return jsonify(token=make_token(cur.lastrowid), user={"id": cur.lastrowid, "name": name, "email": email}), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = get_db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify(error="Email or password is incorrect."), 401
    return jsonify(token=make_token(user["id"]),
                   user={"id": user["id"], "name": user["name"], "email": user["email"]})


@app.get("/api/me")
@login_required
def me():
    return jsonify(user=dict(g.user))


# ---------------------------------------------------------------- pets API
@app.get("/api/pets")
def list_pets():
    """GET /api/pets?type=lost|found&q=text&species=Dog"""
    report_type = request.args.get("type")
    q = (request.args.get("q") or "").strip()
    species = (request.args.get("species") or "").strip()

    sql = "SELECT * FROM pets WHERE status='open'"
    params = []
    if report_type in ("lost", "found"):
        sql += " AND report_type=?"
        params.append(report_type)
    if species and species != "All":
        sql += " AND species=?"
        params.append(species)
    if q:
        like = f"%{q}%"
        sql += " AND (name LIKE ? OR breed LIKE ? OR color LIKE ? OR location LIKE ? OR description LIKE ?)"
        params += [like] * 5
    sql += " ORDER BY id DESC"
    rows = get_db().execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/pets")
@login_required
def create_pet():
    form = request.form
    report_type = form.get("report_type")
    species = (form.get("species") or "").strip()
    location = (form.get("location") or "").strip()
    if report_type not in ("lost", "found") or not species or not location:
        return jsonify(error="Report type, animal type and location are required."), 400

    image_url = ""
    photo = request.files.get("photo")
    if photo and photo.filename:
        if not allowed_file(photo.filename):
            return jsonify(error="Photo must be a PNG, JPG, GIF or WEBP image."), 400
        ext = photo.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{secure_filename(ext)}"
        photo.save(os.path.join(UPLOAD_DIR, filename))
        image_url = f"/uploads/{filename}"

    db = get_db()
    cur = db.execute(
        """INSERT INTO pets (report_type,name,species,breed,color,location,event_date,description,
           contact_name,contact_phone,image_url,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            report_type,
            (form.get("name") or "").strip(),
            species,
            (form.get("breed") or "").strip(),
            (form.get("color") or "").strip(),
            location,
            form.get("event_date") or str(date.today()),
            (form.get("description") or "").strip(),
            (form.get("contact_name") or g.user["name"]).strip(),
            (form.get("contact_phone") or "").strip(),
            image_url,
            g.user["id"],
        ),
    )
    db.commit()
    return jsonify(id=cur.lastrowid, message="Report submitted."), 201


@app.post("/api/pets/<int:pet_id>/resolve")
@login_required
def resolve_pet(pet_id):
    """Owner marks a report as reunited / closed."""
    db = get_db()
    pet = db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone()
    if pet is None:
        return jsonify(error="Report not found."), 404
    if pet["user_id"] != g.user["id"]:
        return jsonify(error="Only the person who posted this report can close it."), 403
    db.execute("UPDATE pets SET status='resolved' WHERE id=?", (pet_id,))
    db.commit()
    return jsonify(message="Report closed. Glad it worked out!")


@app.get("/api/my-reports")
@login_required
def my_reports():
    rows = get_db().execute(
        "SELECT * FROM pets WHERE user_id=? ORDER BY id DESC", (g.user["id"],)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/stats")
def stats():
    db = get_db()
    return jsonify(
        lost=db.execute("SELECT COUNT(*) FROM pets WHERE report_type='lost' AND status='open'").fetchone()[0],
        found=db.execute("SELECT COUNT(*) FROM pets WHERE report_type='found' AND status='open'").fetchone()[0],
        reunited=db.execute("SELECT COUNT(*) FROM pets WHERE status='resolved'").fetchone()[0],
        members=db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
    )


# ---------------------------------------------------------------- adoption + contact
@app.get("/api/adoptions")
def list_adoptions():
    species = (request.args.get("species") or "").strip()
    sql, params = "SELECT * FROM adoptions", []
    if species and species != "All":
        sql += " WHERE species=?"
        params.append(species)
    rows = get_db().execute(sql + " ORDER BY id DESC", params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/contact")
def contact():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()
    if not name or "@" not in email or not message:
        return jsonify(error="Please fill in your name, a valid email and a message."), 400
    db = get_db()
    db.execute(
        "INSERT INTO messages (name,email,subject,message) VALUES (?,?,?,?)",
        (name, email, (data.get("subject") or "").strip(), message),
    )
    db.commit()
    return jsonify(message="Thanks! We received your message and will reply soon."), 201


@app.errorhandler(413)
def too_large(_e):
    return jsonify(error="That photo is too large. Please upload an image under 5 MB."), 413


# Initialize the database when the module is imported by Gunicorn as well as
# when it is run directly with Python.
init_db()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG", "0") == "1",
    )
