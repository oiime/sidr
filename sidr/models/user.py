import itsdangerous
from flask import current_app
from flask.ext.login import UserMixin
from itsdangerous import JSONWebSignatureSerializer
from sqlalchemy.exc import IntegrityError
from sidr import validator, const, mailer
from sidr.orm import db, sa_utils
from sidr.validator import ApiValidationError, ValidationError
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterEqDate, random_string

__all__ = ['User']


class User(ObjectTable, UserMixin):
    __tablename__ = 'user'
    __export__ = {
        const.ACL_OWNER: ['id', 'name', 'email', 'orgnization', 'status', 'role', 'state'],
        const.ACL_READ: ['id', 'name', 'orgnization', 'role']
    }
    default_cmp_user_id = 'id'

    email = db.Column(db.String(255), unique=True, index=True)
    name = db.Column(db.String(255))
    orgnization = db.Column(db.String(255))
    password = db.Column(sa_utils.PasswordType(schemes=['pbkdf2_sha512']))
    signature = db.Column(db.String(64), default=random_string)
    status = db.Column(db.SmallInteger, default=const.STATUS_ACTIVE)
    role = db.Column(db.SmallInteger, default=const.ROLE_USER)
    state = db.Column(sa_utils.JSONType())

    leads = db.relationship("Lead", backref="user")
    entries = db.relationship("Entry", backref="user")
    actions = db.relationship("Action", backref="user")

    __table_args__ = (
        db.UniqueConstraint('email'),
    )
    validate_save = validator.parser({
        "+email": validator.Email,
        "+name": "string",
        "+password": "string",
        "?state": {
            'focus_domain_id': "integer"
        }
    })
    validate_update = validator.parser({
        "?email": validator.Email,
        "?name": "string",
        "?password": "string",
        "?state": {
            'focus_domain_id': "integer"
        }
    })

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        try:
            if obj_id is not None:
                user = cls_.get_restricted(current_user, obj_id, 'id')
                data = cls_.validate_update.validate(data)
                user.update(**data)
                return user.jsonify(current_user), user
            else:
                data = cls_.validate_save.validate(data)
                user = cls_(**data)
                user.save()
                return user.jsonify(acl=const.ACL_OWNER), user
        except IntegrityError:
            raise ApiValidationError(ValidationError('Email already exists'))

    @classmethod
    def af_map(cls_, current_user):
        return cls_.af_find(current_user, {'status': const.STATUS_ACTIVE})

    @classmethod
    def af_find(cls_, current_user, data):
        q = UserQuery(current_user)
        q.assign_request(data)
        return q.execute()

    @classmethod
    def af_reset_send(cls_, email, returnurl):
        user = cls_.find_first({'email': email})
        if not user:
            raise ApiValidationError(ValidationError('Unknown email'))

        serializer = JSONWebSignatureSerializer(current_app.config['API_KEY'])
        resettoken = serializer.dumps({"id": user.id, "signature": user.signature}).decode('utf-8')
        content = 'Click here to reset your password: %s' % (returnurl + resettoken)
        mailer.send(user.email, user.name, 'Password reset link', content)
        return {'success': True}

    @classmethod
    def af_reset_recieve(cls_, token, password):
        serializer = JSONWebSignatureSerializer(current_app.config['API_KEY'])
        try:
            payload = serializer.loads(token)
            user = cls_.get(payload['id'])
            if user is None or payload['signature'] != user.signature or user.status != const.STATUS_ACTIVE:
                raise ApiValidationError(ValidationError('User reset not allowed'))
            user.update(password=password, signature=random_string())
            return user.jsonify(acl=const.ACL_OWNER)
        except (itsdangerous.SignatureExpired, itsdangerous.BadSignature):
            raise ApiValidationError(ValidationError('Token is broken'))

    def connect_domain(self, domain_id):
        from sidr.models import DomainUser
        return DomainUser.add_connection(self.id, domain_id)


class UserQuery(Query):
    __model__ = User
    __sortable__ = ['id', 'name', 'orgnization', 'status']
    __sortable_default__ = ('id', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(User.id),
        'status': QueryFilterEq(User.status),
        'created_at': QueryFilterEqDate(User.created_at)

    }

    def jsonify(self, row):
        rsp = row.jsonify(acl=const.ACL_READ)
        rsp['status'] = row.status
        rsp['created_at'] = row.created_at
        return rsp
