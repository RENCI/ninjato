FROM renci/girder_build:latest 

ARG GIRDER_CFG_FILE

WORKDIR /girder
RUN mkdir data log 
COPY data /girder/data
COPY $GIRDER_CFG_FILE /etc/girder.cfg

RUN pip install girder-ninjato-api==0.1.0 \
  && girder build 

ENTRYPOINT ["girder", "serve"]
