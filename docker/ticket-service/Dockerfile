# Stage 1: Build the Go application
FROM golang:1.25 AS builder

WORKDIR /app

COPY ticket-service/go.mod ticket-service/go.sum ./

RUN go mod download

COPY ticket-service/main.go .

RUN go build -o ticket-service main.go


# Stage 2: Runtime image
FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/ticket-service .

EXPOSE 8002

CMD ["./ticket-service"]