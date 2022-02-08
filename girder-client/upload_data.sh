#!/usr/bin/env bash

set -a
source .env
set +a

girder-client --no-ssl-verify --api-url $API_URL upload $COLL_ID $LOCAL_FOLDER --parent-type collection --leaf-folders-as-items --reuse 
