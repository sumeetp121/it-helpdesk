FROM golang:latest

WORKDIR /app

COPY ticket-service/go.mod ticket-service/go.sum ./

RUN go mod download

COPY ticket-service/main.go .

EXPOSE 8002

CMD ["go", "run", "main.go"]