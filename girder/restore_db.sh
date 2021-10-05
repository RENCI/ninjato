#!/bin/bash

docker exec girder-mongodb sh -c 'exec mongorestore --gzip --archive < dump_data.gz'
