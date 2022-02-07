#!/usr/bin/env bash

set -a
source .env
set +a

girder-client --api-url $API_URL localsync $COLL_ID $LOCAL_FOLDER --parent-type collection