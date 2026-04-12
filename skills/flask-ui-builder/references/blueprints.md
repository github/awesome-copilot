# Flask Blueprints Reference

Use blueprints when a single `app.py` exceeds ~150 lines or has 3+ distinct feature areas.

## Structure

```
my_app/
├── app.py          # App factory
├── models.py
├── routes/
│   ├── __init__.py
│   ├── main.py     # General pages
│   ├── auth.py     # Login/logout
│   └── api.py      # JSON API
└── templates/
    ├── base.html
    ├── main/
    └── auth/
```

## App factory (app.py)

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "change-me"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"

    db.init_app(app)

    from routes.main import main_bp
    from routes.auth import auth_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")

    with app.app_context():
        db.create_all()

    return app

if __name__ == "__main__":
    create_app().run(debug=True)
```

## Blueprint file (routes/main.py)

```python
from flask import Blueprint, render_template
from app import db
from models import Item

main_bp = Blueprint("main", __name__, template_folder="../templates/main")

@main_bp.route("/")
def index():
    items = Item.query.all()
    return render_template("index.html", items=items)
```

## models.py

```python
from app import db
from datetime import datetime

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Item {self.name}>"
```
