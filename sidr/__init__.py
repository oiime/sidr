from flask import Flask, Blueprint, request_finished
import logging.config
import flask_cors
import json
from sidr.orm import init_app as init_orm
logger = logging.getLogger(__name__)


def init_config(app):
    filename_logging_json = '/etc/sidr/logging.json'
    filename_config = '/etc/sidr/server.conf'

    with open(filename_logging_json, 'rt') as f:
        config = json.load(f)
    logging.config.dictConfig(config)

    logger.info('Loading configuration')
    app.config.from_pyfile(filename_config)


def init_routes(app):
    from sidr.api import init_app as init_api
    from sidr import resources

    app.config['CORS_HEADERS'] = 'Content-Type,Authorization'
    flask_cors.CORS(app)
    bp_api_v1 = Blueprint('v1_api', __name__, url_prefix='/v1')
    api = init_api(bp_api_v1, app)
    resources.init_app(api)
    app.register_blueprint(bp_api_v1)


app = Flask(__name__)

init_config(app)
init_orm(app)
init_routes(app)

if __name__ == "__main__":
    app.run()
