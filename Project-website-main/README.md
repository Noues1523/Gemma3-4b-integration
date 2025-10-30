
# Merged Flask Project (Frontend + Admin)

## Structure
```
project/
├─ app.py
├─ requirements.txt
├─ frontend/
│  ├─ public/ (css/js/image/index.html)
│  └─ routes.py
└─ admin/
   ├─ routes.py
   ├─ templates/admin.html
   └─ static/(css/js/...)
```

## Quick Start
```bash
# 1) Create venv (Windows)
python -m venv venv
venv\Scripts\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Run
python app.py
# Frontend: http://127.0.0.1:5000/
# Admin:    http://127.0.0.1:5000/admin
```

## Move Your Existing Files
- Move your **separated_frontend/public/** into **frontend/public/**
- Move **admindashboard/templates/** → **admin/templates/**
- Move **admindashboard/static/** → **admin/static/**
- Move your SQLite files (**admin.db**, **admin.db-shm**, **admin.db-wal**) into **admin/data/**

Then update any paths if needed.
