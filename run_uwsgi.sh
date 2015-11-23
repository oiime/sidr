#!/bin/bash
source /home/ism/dev/sidr/env/bin/activate
uwsgi --ini /etc/sidr/uwsgi.ini --master --die-on-term

