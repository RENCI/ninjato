#!/bin/bash

if [ -z "$1" ]; then
    docker cp dump_data.gz girder-mongodb:dump_data.gz
else
    docker cp $1 girder-mongodb:dump_data.gz	
fi    
docker exec girder-mongodb sh -c 'exec mongorestore --gzip --archive < dump_data.gz'
