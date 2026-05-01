services:

  labby-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: labby-frontend
    ports:
      - "8080:80"
    depends_on:
      - labby-backend
    restart: unless-stopped

  labby-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: labby-backend
    environment:
      - DATA_DIR=/data
    volumes:
      - labby-data:/data
    restart: unless-stopped

volumes:
  labby-data:
    driver: local
