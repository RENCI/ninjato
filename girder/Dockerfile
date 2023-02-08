FROM renci/girder_build:latest 

ARG GIRDER_CFG_FILE

WORKDIR /girder
RUN mkdir data log 
COPY data /girder/data
COPY plugins /girder/plugins
COPY requirements.txt /girder/requirements.txt
COPY $GIRDER_CFG_FILE /etc/girder.cfg

RUN pip install -r requirements.txt \
  && girder build 

ENTRYPOINT ["girder", "serve"]
