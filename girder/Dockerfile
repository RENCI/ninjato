FROM renci/girder_build:latest 

ARG GIRDER_CFG_FILE
ARG ASSET_STORE_DATA_DIR

WORKDIR /girder
RUN mkdir data log 
COPY $ASSET_STORE_DATA_DIR /girder/data
COPY plugins /girder/plugins
COPY requirements.txt /girder/requirements.txt
COPY $GIRDER_CFG_FILE /etc/girder.cfg

RUN pip install -r requirements.txt \
  && girder build 

ENTRYPOINT ["girder", "serve"]
