#!/usr/bin/env bash

set -a
source .env
set +a

girder-client --api-url $API_URL download --parent-type collection $COLL_ID $LOCAL_FOLDER
