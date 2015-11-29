from sidr import validator, const
from sidr.orm import db, sa_utils
from sqlalchemy.orm import relationship, backref
from .model import BaseTable

__all__ = ['Tag']


class EntryTag(BaseTable):
    __tablename__ = 'entry_tag'
    __export__ = {
        const.ACL_READ: ['entry_id', 'tag_id', 'tag_class', 'data']
    }
    entry_id = db.Column(db.BigInteger, db.ForeignKey('entry.id'), primary_key=True)
    tag_id = db.Column(db.BigInteger, db.ForeignKey('tag.id'), primary_key=True)
    tag_class = db.Column(db.String(255))
    data = db.Column(sa_utils.JSONType())
    tag = relationship("Tag", backref="entry_assocs")

    __table_args__ = (
        db.UniqueConstraint("entry_id", "tag_id"),
    )

    @classmethod
    def update_tags(cls_, entry, utags):
        cls_.delete({'entry_id': entry.id})
        for tag_class, tags in utags.items():
            for tag in tags:
                if isinstance(tag, int):
                    el = cls_(entry_id=entry.id, tag_id=tag, tag_class=tag_class)
                    el.save()
                else:
                    el = cls_(entry_id=entry.id, tag_id=tag['id'], tag_class=tag_class, data=tag)
                    el.save()
