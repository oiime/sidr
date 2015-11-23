from sidr import validator
from sidr.orm import db, sa_utils
from .model import ObjectTable

__all__ = ['DomainUser']


class DomainUser(ObjectTable):
    __tablename__ = 'domain_user'

    user_id = db.Column(db.BigInteger, db.ForeignKey('user.id'), index=True, nullable=False)
    domain_id = db.Column(db.BigInteger, db.ForeignKey('domain.id'), index=True, nullable=True)

    @classmethod
    def add_connection(cls_, user_id, domain_id):
        domain_user = cls_(user_id=user_id, domain_id=domain_id)
        domain_user.save()
        return domain_user
