#!/usr/bin/env bash

set -a
source .env
set +a

girder-client --api-url $API_URL upload $COLL_ID $LOCAL_FOLDER --parent-type collection --leaf-folders-as-items --reuse
