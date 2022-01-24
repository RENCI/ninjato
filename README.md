# ninjatō
**n**euro**i**magi**n**g **j**oint **a**nnotation **t**ool

Web-based segmentation tool for 3D tissue cleared microscopy images of nuclei.

## Development Setup

This section provides guidance for setting up docker-based girder server and React-based client development and deployment environments for the ninjato tool.

### Prerequisite

[Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) need to be installed. On Windows 10 and above, native Docker may be installed and used. Otherwise, a Linux VM is needed. 

### Steps to set up and run the tool in local development environment

- git clone source code from this repo.

  ```
  git clone https://github.com/RENCI/ninjato.git
  cd ninjato

- Get the client and server containers running with test data loaded into the girder backend database container.

  ```
  ./up.sh
  ```

- Remove the client and server containers

  ```
  ./down.sh
  ```

  

