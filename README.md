# PetConnect

Community web app for reporting lost and found pets, adoption, animal awareness and a small pet-supplies marketplace.

**Stack:** HTML + CSS + JavaScript (front end) | Python Flask (back end) | SQLite (database)

## Project structure

```
PetConnect/
├── backend/
│   ├── app.py              Flask server + REST API + SQLite setup
│   ├── requirements.txt
│   ├── petconnect.db       created automatically on first run
│   └── uploads/            photos uploaded through the Report Pet form
└── frontend/
    ├── index.html          all pages (Home, Lost, Found, Report, Adoption, Library, Marketplace, Contact)
    ├── css/style.css
    ├── js/app.js
    └── images/             logo, product pictures, pet placeholders
```

## Run it in VS Code

1. Install Python 3.10+ and open the `PetConnect` folder in VS Code (File > Open Folder).
2. Open a terminal (Terminal > New Terminal) and run:

   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate          (Windows)   |   source venv/bin/activate   (Mac/Linux)
   pip install -r requirements.txt
   python app.py
   ```
3. Open http://127.0.0.1:5000 in your browser.

The database file and sample pets are created automatically the first time the server starts.

Front end only? Open `frontend/index.html` (or use the Live Server extension). Pages show built-in sample data, but sign-up, login and reports need the Flask server running.

## API summary

| Method | Route | Purpose |
|---|---|---|
| POST | /api/register, /api/login | Create account, log in (returns a token) |
| GET | /api/pets?type=lost\|found&q=&species= | Search reports |
| POST | /api/pets | Submit a lost/found report with photo (login required) |
| POST | /api/pets/<id>/resolve | Owner marks a report as reunited |
| GET | /api/adoptions | Adoptable animals |
| POST | /api/contact | Contact & Help form |
| GET | /api/stats | Counts shown on the home page |

## Images

- **Pets and products:** the sample lost, found and adoption reports and the marketplace products use real photographs hosted by Unsplash (free to use). They need an internet connection; if a photo can't load, an illustrated placeholder is shown instead. Photos users upload are saved in `backend/uploads/`.
- **Use a different photo:** open a photo on unsplash.com, right-click it, choose "Copy image address", and keep only the part after `photo-` (for example `1552053831-71594a27632d`). Paste it into `ph('...')` in `frontend/js/app.js` (products, sample data) or `ph("...")` in `backend/app.py` (sample reports).
- **Add a product:** add one line to the `PRODUCTS` list in `frontend/js/app.js`.
- **Hero photo:** drop any cat or dog photo at `frontend/images/hero.jpg` and it replaces the online placeholder photo.
- **Refreshing sample data:** delete `backend/petconnect.db` and restart the server to rebuild the sample reports.

## Before deploying

Set a real `SECRET_KEY` environment variable and turn `debug=True` off in `app.py`. To use MySQL instead of SQLite, replace the `sqlite3` calls in `app.py` with `mysql-connector-python` or SQLAlchemy.

- **Home page photo:** the picture behind "Welcome to PetConnect" is the local file `frontend/images/hero.jpg`. It never changes and needs no internet. To use a different photo, save it with the same name (`hero.jpg`) in `frontend/images/`.

## Deploy online with Render

This project is prepared for deployment as a Render Python Web Service. Render's official Flask deployment uses a Python web service with `pip install -r requirements.txt` as the build command and Gunicorn as the production server.

1. Upload the `PetConnect` folder to a GitHub repository. Do **not** upload a `venv` folder or any passwords/secrets.
2. In Render, choose **New > Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `pip install -r requirements.txt`.
5. Set **Start Command** to `gunicorn app:app`.
6. Add an environment variable named `SECRET_KEY` with a long random value.
7. For simple college demonstrations, the included SQLite database can be used. For persistent user-submitted data and uploads, attach a persistent disk and set `DATA_DIR` to the disk's mount path (for example `/var/data`).

Render gives the service a public `onrender.com` URL after a successful deployment.
