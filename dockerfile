FROM node:alpine as builder

# Add `package.json` to build Debian compatible NPM packages
WORKDIR /src
ADD package-lock.json .
ADD package.json .
# ADD nginx.conf .
# ADD run.sh .

# install everything (and clean up afterwards)
RUN apk -v --update add \
  python \
  py-pip \
  && \
  npm config set unsafe-perm true && \
  npm install -g concurrently rimraf copyfiles typescript && \
  pip install --upgrade awscli==1.14.5 s3cmd==2.0.1 && \
  apk -v --purge del py-pip && \
  rm /var/cache/apk/*

COPY env ./env

# Add the remaining project files
ADD . .

RUN npm install
RUN npm run build
# RUN npm start

# FROM nginx:alpine

## Remove default nginx website
# RUN rm -rf /usr/share/nginx/html/*

## From 'builder' copy website to default nginx public folder
# COPY --from=builder /src/build /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 5000
# CMD ["nginx", "-g", "daemon off;"]
CMD ["npm", "start"]
# CMD sh ./run.sh