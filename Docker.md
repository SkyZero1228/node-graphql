## Running Docker file

### Dockerfile

- Inside of the Dockerfile, there is the build for Docker. It sets the default environment variables.
  To run this build for an image we named culturalink-app-container:

  ```
  docker build . -t culturalink-app-container
  ```

  This builds the image locally.

  To run this build,

  ```
  docker run -e DATABASE_HOST={your network ip ie. 10.0.0.5} -p 4000:4000 culturalink-app-container
  ```

### docker-compose

- Inside of the docker-compose.yml, change the environment variable DATABASE_HOST to your network
  ip address ie. 10.0.0.5.

  To build:

  ```
  docker-compose build
  ```

  To Run:

  ```
  docker-compose up
  ```

#### Either one of these methods will work
