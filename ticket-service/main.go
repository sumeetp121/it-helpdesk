package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

const (
	dbHost     = "localhost"
	dbPort     = 5432
	dbUser     = "helpdesk_app"
	dbPassword = "helpdesk123"
	dbName     = "helpdesk_db"
)

var (
	db *sql.DB
	mu sync.Mutex
)

type Ticket struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Priority    string `json:"priority"`
	Status      string `json:"status"`
	UserID      int    `json:"user_id"`
}

func main() {

	var err error

	connectionString := "host=" + dbHost +
		" port=" + strconv.Itoa(dbPort) +
		" user=" + dbUser +
		" password=" + dbPassword +
		" dbname=" + dbName +
		" sslmode=require"

	db, err = sql.Open("postgres", connectionString)

	if err != nil {
		panic(err)
	}

	err = db.Ping()

	if err != nil {
		panic(err)
	}

	defer db.Close()

	r := gin.Default()

	r.GET("/health", health)

	r.POST("/api/tickets", createTicket)

	r.GET("/api/tickets", getTickets)

	r.GET("/api/tickets/:id", getTicket)

	r.PUT("/api/tickets/:id", updateTicket)

	r.DELETE("/api/tickets/:id", deleteTicket)

	r.Run(":8002")
}


func health(c *gin.Context) {

	err := db.Ping()

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "unhealthy",
			"service": "ticket-service",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "ticket-service",
	})
}


func userExists(userID int) bool {

	url := "http://localhost:8001/api/users/" +
		strconv.Itoa(userID)

	resp, err := http.Get(url)

	if err != nil {
		return false
	}

	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}


func createNotification(userID int, ticketID int) error {

	notification := map[string]interface{}{
		"user_id":   userID,
		"message":   "Your ticket has been created successfully.",
		"ticket_id": ticketID,
		"read":      false,
	}

	body, err := json.Marshal(notification)

	if err != nil {
		return err
	}

	resp, err := http.Post(
		"http://localhost:8003/api/notifications",
		"application/json",
		strings.NewReader(string(body)),
	)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {

		return fmt.Errorf(
			"notification service returned status %d",
			resp.StatusCode,
		)
	}

	return nil
}


func deleteTicketNotifications(ticketID int) error {

	url := "http://localhost:8003/api/notifications/ticket/" +
		strconv.Itoa(ticketID)

	req, err := http.NewRequest(
		http.MethodDelete,
		url,
		nil,
	)

	if err != nil {
		return err
	}

	client := &http.Client{}

	resp, err := client.Do(req)

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {

		return fmt.Errorf(
			"notification service returned status %d",
			resp.StatusCode,
		)
	}

	return nil
}


func createTicket(c *gin.Context) {

	var ticket Ticket

	if err := c.ShouldBindJSON(&ticket); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})

		return
	}

	if !userExists(ticket.UserID) {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User not found",
		})

		return
	}

	if ticket.Status == "" {
		ticket.Status = "Open"
	}

	mu.Lock()
	defer mu.Unlock()

	err := db.QueryRow(
		`
		INSERT INTO tickets
		(title, description, category, priority, status, user_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
		`,
		ticket.Title,
		ticket.Description,
		ticket.Category,
		ticket.Priority,
		ticket.Status,
		ticket.UserID,
	).Scan(&ticket.ID)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create ticket",
		})

		return
	}

	err = createNotification(ticket.UserID, ticket.ID)

	if err != nil {

		fmt.Printf(
			"Warning: failed to create notification for ticket %d: %v\n",
			ticket.ID,
			err,
		)
	}

	c.JSON(http.StatusOK, ticket)
}


func getTickets(c *gin.Context) {

	mu.Lock()
	defer mu.Unlock()

	rows, err := db.Query(
		`
		SELECT id, title, description, category,
		       priority, status, user_id
		FROM tickets
		ORDER BY id
		`,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get tickets",
		})

		return
	}

	defer rows.Close()

	tickets := []Ticket{}

	for rows.Next() {

		var ticket Ticket

		err := rows.Scan(
			&ticket.ID,
			&ticket.Title,
			&ticket.Description,
			&ticket.Category,
			&ticket.Priority,
			&ticket.Status,
			&ticket.UserID,
		)

		if err != nil {

			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to read ticket",
			})

			return
		}

		tickets = append(tickets, ticket)
	}

	c.JSON(http.StatusOK, tickets)
}


func getTicket(c *gin.Context) {

	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ticket ID",
		})

		return
	}

	mu.Lock()
	defer mu.Unlock()

	var ticket Ticket

	err = db.QueryRow(
		`
		SELECT id, title, description, category,
		       priority, status, user_id
		FROM tickets
		WHERE id = $1
		`,
		id,
	).Scan(
		&ticket.ID,
		&ticket.Title,
		&ticket.Description,
		&ticket.Category,
		&ticket.Priority,
		&ticket.Status,
		&ticket.UserID,
	)

	if err == sql.ErrNoRows {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Ticket not found",
		})

		return
	}

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get ticket",
		})

		return
	}

	c.JSON(http.StatusOK, ticket)
}


func updateTicket(c *gin.Context) {

	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ticket ID",
		})

		return
	}

	var updated Ticket

	if err := c.ShouldBindJSON(&updated); err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})

		return
	}

	if !userExists(updated.UserID) {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User not found",
		})

		return
	}

	mu.Lock()
	defer mu.Unlock()

	result, err := db.Exec(
		`
		UPDATE tickets
		SET title = $1,
		    description = $2,
		    category = $3,
		    priority = $4,
		    status = $5,
		    user_id = $6
		WHERE id = $7
		`,
		updated.Title,
		updated.Description,
		updated.Category,
		updated.Priority,
		updated.Status,
		updated.UserID,
		id,
	)

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update ticket",
		})

		return
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil || rowsAffected == 0 {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Ticket not found",
		})

		return
	}

	updated.ID = id

	c.JSON(http.StatusOK, updated)
}


func deleteTicket(c *gin.Context) {

	id, err := strconv.Atoi(c.Param("id"))

	if err != nil {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ticket ID",
		})

		return
	}

	/*
		First verify that the ticket exists.
	*/

	mu.Lock()

	var exists bool

	err = db.QueryRow(
		`
		SELECT EXISTS(
			SELECT 1
			FROM tickets
			WHERE id = $1
		)
		`,
		id,
	).Scan(&exists)

	mu.Unlock()

	if err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check ticket",
		})

		return
	}

	if !exists {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Ticket not found",
		})

		return
	}

	/*
		Delete notifications first.

		The notifications table has a foreign key:

		notifications.ticket_id
		        ↓
		tickets.id

		So the notifications must be removed first.
	*/

	err = deleteTicketNotifications(id)

	if err != nil {

		fmt.Printf(
			"Failed to delete notifications for ticket %d: %v\n",
			id,
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete ticket notifications",
		})

		return
	}

	/*
		Now delete the ticket.
	*/

	mu.Lock()
	defer mu.Unlock()

	result, err := db.Exec(
		`
		DELETE FROM tickets
		WHERE id = $1
		`,
		id,
	)

	if err != nil {

		fmt.Printf(
			"Failed to delete ticket %d: %v\n",
			id,
			err,
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete ticket",
		})

		return
	}

	rowsAffected, err := result.RowsAffected()

	if err != nil || rowsAffected == 0 {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Ticket not found",
		})

		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Ticket deleted",
	})
}