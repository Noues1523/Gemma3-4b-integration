import os
import sqlite3
from flask import Flask, jsonify
from dotenv import load_dotenv

from admin.routes import admin_bp
from frontend.routes import front_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def create_app():
    load_dotenv()

    app = Flask(
        __name__,
        static_folder=os.path.join('frontend', 'public'),
        template_folder=os.path.join('frontend', 'templates')
    )

    # Config
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_secret')
    app.config['ADMIN_DB_PATH'] = os.path.join(BASE_DIR, 'admin', 'data', 'admin.db')


    # Register blueprints
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(front_bp, url_prefix="")

    # Health check
    @app.get("/health")
    def health():
        return jsonify(ok=True)

    return app


app = create_app()

print("🔥 Using DB at:", app.config["ADMIN_DB_PATH"])



if __name__ == "__main__":
    app.run(debug=True)



