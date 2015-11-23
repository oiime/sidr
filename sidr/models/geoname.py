import json
import pycountry
import os
from whoosh.index import create_in, open_dir, exists_in
from whoosh import fields, qparser, query
from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import ObjectTable

__all__ = ['Geoname']


class Geoname(ObjectTable):
    __tablename__ = 'geoname'

    __export__ = {
        const.ACL_READ: ['id', 'parent_id', 'name', 'asciiname', 'name_alternate', 'latitude', 'longitude', 'country_code', 'feature_code']
    }

    parent_id = db.Column(db.BigInteger)
    name = db.Column(db.String(255))
    asciiname = db.Column(db.String(255))
    name_alternate = db.Column(sa_utils.ScalarListType(str))
    latitude = db.Column(db.Float())
    longitude = db.Column(db.Float())
    country_code = db.Column(db.String(10))
    feature_code = db.Column(db.String(10))

    @classmethod
    def af_autocomplete(cls_, country_code, value):
        ix = open_dir(os.path.dirname(os.path.realpath(__file__)) + '/../../indexer', indexname="adms")
        ids = []
        rsp = []
        with ix.searcher() as s:
            qp = qparser.QueryParser("names", schema=ix.schema)
            results = s.search(qp.parse(value), limit=20, filter=query.Term("country_code", country_code))
            for res in results:
                ids.append(res['gid'])

        if len(ids) > 0:
            rows = cls_.get_query().filter(cls_.id.in_((ids))).all()
            for row in rows:
                data = row.jsonify(acl=const.ACL_READ)
                data['location_id'] = data['id']
                rsp.append(data)
        return {'results': rsp}
