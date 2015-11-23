from flask_sqlalchemy import SQLAlchemy
import sqlalchemy_utils as sa_utils
import logging

db = SQLAlchemy()


def init_app(app):
    db.init_app(app)
    if app.config['DEBUG'] is True:
        logging.basicConfig()
        logging.getLogger('sqlalchemy.engine').setLevel(logging.DEBUG)


def create_all():
    db.create_all()


def rebuild_all():
    db.drop_all()
    create_all()
