FROM ubuntu:22.04

RUN apt-get -y update && \
    apt-get -y upgrade && \
    DEBIAN_FRONTEND=noninteractive \
    apt-get -y install --no-install-recommends \
        libmysqlclient-dev \
        libmysql++-dev \
        make \
        flex \
        gcc \
        g++ \
        dos2unix \
        openjdk-11-jdk \
        python3 \
        python3-pip \
        fp-compiler && \
    rm -rf /var/lib/apt/lists/*

COPY src/ /judge/src/
COPY setup.sh /judge/setup.sh
COPY entrypoint.sh /judge/entrypoint.sh

# Fix Windows CRLF line endings
RUN dos2unix /judge/setup.sh /judge/entrypoint.sh && \
    find /judge/src/install -type f | xargs dos2unix 2>/dev/null || true

RUN bash /judge/setup.sh

VOLUME ["/home/judge/data"]

ENV HOSTNAME=db
ENV DATABASE=jol
ENV USERNAME=hustoj
ENV PASSWORD=hustoj

ENTRYPOINT ["/bin/bash", "/judge/entrypoint.sh"]
