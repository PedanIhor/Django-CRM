#!/bin/bash

# Execute startup scripts
./wait-for-postgres.sh "$DBHOST"
python3 manage.py collectstatic --noinput
python3 manage.py makemigrations
python3 manage.py migrate

CONTAINER_ALREADY_STARTED="CONTAINER_ALREADY_STARTED_PLACEHOLDER"
if [ ! -e $CONTAINER_ALREADY_STARTED ]; then
    touch $CONTAINER_ALREADY_STARTED
    echo "-- First container startup --"
    # YOUR_JUST_ONCE_LOGIC_HERE
    python3 manage.py loaddata roles.yaml

else
    echo "-- Not first container startup --"
fi

python3 manage.py runserver 0.0.0.0:8000