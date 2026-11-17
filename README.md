# AGRIBRIDGE

## Local development

Install the backend dependencies from the repository root:

```bash
pip install -r server/requirements.txt
```

The local `server/.env` uses SQLite at `server/instance/agribridge_dev.db` and
development-only secret keys. Populate or refresh the sample data with:

```bash
cd server
flask --app run.py seed
```

The seed command creates any missing tables and can be run repeatedly without
duplicating its sample records. Demo accounts all use `AgriBridge123!`:
`amina.farmer@example.com`, `peter.farmer@example.com`,
`grace.buyer@example.com`, `kisumu.buyer@example.com`, and `admin@example.com`.

To run the backend and frontend, use two terminals from the repository root.
In the first terminal:

```bash
cd server
python run.py
```

In the second terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL printed in the frontend terminal, usually
`http://localhost:5173`; the Flask API runs at `http://127.0.0.1:5000`.
