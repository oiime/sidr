# SIDR ( Secondary Information and Data Review Platform )


During emergencies, a wealth of information relevant to humanitarian decision makers is available through news media, NGOs reports, social media, meeting minutes, government press release, etc. Unfortunately, this information is not systematically captured and analysed in real time, mainly due to a lack of time. Capturing this information requires manpower and a collaborative, systematic and thorough way of screening all new available information, tagging them by field of interest and storing them in a tabular format to ease further analysis.

The Secondary Information and Data Review Platform was developed to ease the process of data capture and tagging during emergencies and ensuring no important information is missed. It was developed by and for the Digital Humanitarian Network and will hopefully fill an important technological gap in the way humanitarian operators capture and perform secondary data review.

The platform is administered by a group of three organizations, namely DHN, OCHA and ACAPS who are responsible for the appropriate and safe use, maintenance and development of the platform.

## API (incomplete) ##
#### POST /v1/auth ####

Authenticate a user to obtain a token
```
#REQUEST
{
	email: "email@example.com",
	password: "password"
}
```
```
#RESPONSE
{
  "token": "eaJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwic2lnbmF0dXJlIjoiaXo2TVRv5TTadXlvdXZIenQ1QnFEVWJxeG9LODRmYkpvQ0hZWjN1enprbW93WUFFTFVFYnlpa1IyU2xXZVVLZCJ9.gELjr-FBZMZN_cZQpcQvdtw3LgkJnrwHkNDLbAZ9Jjw",
  "user": {
    "email": "email@example.com",
    "id": 1,
    "name": "test user",
    "orgnization": null,
    "role": 10,
    "state": {
      "focus_domain_id": 1
    },
    "status": 1
  }
}
```
Save the token to be used for further interactions with the API, you can either pass it as auth=TOKEN in the query part of the URL or as Authorization=TOKEN in the HTTP request headers

#### POST /v1/lead ####
```
#REQUEST
{
	domain_id: 1,
	lead_type: "url",
	source_id: 65,
	name: "test name",
	website: "www.example.com",
	url: "http://www.example.com/home"
}
```
- domain_id: domain to add the lead to, list of domains can be obtained via a GET call to /v1/domains
- lead_type: [url, manual, attachment]
- source_id: list of sources, can be obtained via CALL
```
#RESPONSE
{
  "binbags": null,
  "created_at": "2015-11-23T17:17:51.000000Z",
  "domain_id": 1,
  "id": 8,
  "lead_type": "url",
  "name": "test name",
  "published_at": "2015-11-02T22:00:00.000000Z",
  "source_id": 65,
  "status": 3,
  "url": "http://www.example.com/home",
  "user_id": 1,
  "website": "www.example.com"
}
```


## Deployment ##

### Requirements ###
- Python >= 3.4.3

### Installation ###
```
pip install -r requirements.txt
```

### Upstart script ###
*Assuming the code is located in /var/www/sidr

```
# /etc/init/sidr-uwsgi.conf

description "uwsgi sidr instance"
start on runlevel [2345]
stop on runlevel [06]

script
	export ENV='production'
  	. /var/www/sidr/env/bin/activate
	uwsgi --ini /etc/sidr/uwsgi.ini --master --die-on-term
end script
```

### nginx virtual hosts ###
```
upstream uwsgiclustersidr {
  server 127.0.0.1:8000;
}
server {
    listen 80;

    server_name api.sidr.localhost;
    access_log /var/log/sidr/api.access.log;
    error_log /var/log/sidr/api.error.log;
    chunked_transfer_encoding on;

    location /v1 {
            include            uwsgi_params;
            uwsgi_pass         uwsgiclustersidr;
            uwsgi_read_timeout 3600;
            proxy_read_timeout 3600;
            proxy_redirect     off;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Host $server_name;
    }

}
```
```
server {
        listen 80;
        server_name www.sidr.localhost;
        access_log /var/log/sidr/www.access.log;
        error_log /var/log/sidr/www.error.log;

        root /var/www/sidr/www/dist;
        charset utf-8;
        keepalive_timeout 5;

        location ~ ^/(scripts|styles|images|bower_components|assets) {
                gzip_static on;
                expires 30m;
                add_header Cache-Control public;
                add_header ETag "";
                break;
        }
        location / {
                 try_files $uri /index.html;
        }
}
```
### /etc/sidr/uwsgi.ini ###
```
[uwsgi]
master = true
socket = 127.0.0.1:8000

logto      = /var/log/sidr/uwsgi.log
log-date   = true

processes  = 1
# plugins    = http,python

base       = /var/www/sidr
home       = %(base)/env
pythonpath = %(base)/env

module     = sidr
callable   = app
chdir      = %(base)

```
### /etc/sidr/logging.json ###
```
{
    "version": 1,
    "disable_existing_loggers": false,
    "formatters": {
        "simple": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        }
    },

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "simple",
            "stream": "ext://sys.stdout"
        },
        "error_file_handler": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "formatter": "simple",
            "filename": "/var/log/sidr/api.err.log",
            "maxBytes": 10485760,
            "backupCount": 20,
            "encoding": "utf8"
        }

    },

    "root": {
        "level": "INFO",
        "handlers": ["console", "error_file_handler"]
    }
}
```
### /etc/sidr/server.conf ###
```
DEBUG=True
SQLALCHEMY_DATABASE_URI='mysql+pymysql://root@localhost/sidr'
SECRET_KEY='SECRET_VALUE'
API_KEY='SECRET_VALUE'
```


Platform code contributed by Itamar Maltz, Licensed under GPLv2

bootstrap template by [almasaeed2010 - AdminLTE](https://github.com/almasaeed2010/AdminLTE)
