import os
import importlib


def init_app(app):
    for module in os.listdir(os.path.dirname(__file__)):
        if module == '__init__.py' or module[-3:] != '.py':
            continue
        r = importlib.import_module('.' + module[:-3], __name__)
        r.init_app(app)
