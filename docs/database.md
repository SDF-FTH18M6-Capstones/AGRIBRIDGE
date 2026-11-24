# AGRIBRIDGE Database Documentation

## Schema & ORM Files
* `schema.dbml`: Contains database tables and DBML foreign-key references.
* `models.py`: Contains matching Flask-SQLAlchemy models and ORM relationships.

## Relationship Cardinalities

| Relationship | Cardinality |
| :--- | :--- |
| **User → FarmerProfile** | one-to-zero-or-one |
| **User → BuyerProfile** | one-to-zero-or-one |
| **FarmerProfile → Product** | one-to-many |
| **Category → Product** | one-to-many |
| **Product → ProductImage** | one-to-many |
| **BuyerProfile → BuyerRequest** | one-to-many |
| **Category → BuyerRequest** | one-to-many |
| **BuyerRequest → RequestResponse** | one-to-many |
| **FarmerProfile → RequestResponse** | one-to-many |
| **BuyerProfile → Order** | one-to-many |
| **FarmerProfile → Order** | one-to-many |
| **Order → OrderItem** | one-to-many |
| **Product → OrderItem** | one-to-many |
| **Order → Payment** | one-to-many |
| **Order → Review** | one-to-zero-or-one |

---

## Flask & SQLAlchemy Setup

Import the single `db` instance into your main app entry point and initialize it once:

```python
from flask import Flask
from flask_migrate import Migrate
from models import db

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///marketplace.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)