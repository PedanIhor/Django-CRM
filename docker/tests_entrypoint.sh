#!/bin/bash

# Execute startup scripts
./wait-for-postgres.sh "$DBHOST"
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py test