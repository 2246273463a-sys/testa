FROM node:20-alpine AS build

WORKDIR /app
COPY frontend_notes_app/package.json frontend_notes_app/package-lock.json* /app/
RUN npm ci

COPY frontend_notes_app /app
ARG REACT_APP_API_BASE_URL=/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend_notes_app/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
