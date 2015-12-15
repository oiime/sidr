import json
import pycountry
from whoosh.index import create_in, open_dir, exists_in
from whoosh import fields, qparser, query
from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import BaseTable

__all__ = ['EntryLocation']


location_sources = [
    const.LOCATION_SOURCE_GEONAME,
    const.LOCATION_SOURCE_SELF
]


class EntryLocation(BaseTable):
    __tablename__ = 'entry_location'

    __export__ = {
        const.ACL_READ: ['location_id', 'source', 'asciiname', 'country_code', 'data']
    }

    entry_id = db.Column(db.BigInteger, db.ForeignKey('entry.id'), primary_key=True)
    location_id = db.Column(db.String(255), primary_key=True, autoincrement=False)
    source = db.Column(db.BigInteger, primary_key=True, autoincrement=False)
    asciiname = db.Column(db.String(255))
    data = db.Column(sa_utils.JSONType())
    country_code = db.Column(db.String(3))

    __table_args__ = (
        db.UniqueConstraint("entry_id", "location_id", "source"),
    )

    @classmethod
    def update_locations(cls_, entry, locations):
        cls_.delete({'entry_id': entry.id})
        for data in locations:
            udata = {
                'location_id': data['location_id'],
                'source': data['source'],
                'asciiname': data['asciiname'],
                'data': data['data'] if 'data' in data else None,
                'country_code': entry.country_code,
                'entry_id': entry.id
            }
            el = cls_(**udata)
            el.save()

    @classmethod
    def get_overview(cls_, current_user, domain_id):
        sql = 'SELECT location_id, data, source, entry_id, entry.severity, entry_location.asciiname, geoname.latitude, geoname.longitude FROM entry_location'
        sql += ' INNER JOIN entry ON (entry.id=entry_location.entry_id)'
        sql += ' LEFT JOIN geoname ON (geoname.id=location_id AND source=%s)' % const.LOCATION_SOURCE_GEONAME
        sql += ' WHERE entry.status !=%s AND domain_id=%s' % (const.STATUS_DELETED, int(domain_id))

        rows = db.session.execute(sql)
        rsp = []
        for row in rows:
            rsp.append({
                'location_id': row['location_id'],
                'source': row['source'],
                'entry_id': row['entry_id'],
                'severity': row['severity'],
                'asciiname': row['asciiname'],
                'latitude': row['latitude'],
                'longitude': row['longitude'],
                'data': json.loads(row['data']) if row['data'] is not None else None
            })
        return rsp
