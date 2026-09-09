import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Ticket,
  Bell,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Menu,
} from "lucide-react";

import { api } from "./api";


// ============================================================
// APP
// ============================================================

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [mobile, setMobile] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  // Workspace name
  const [workspace, setWorkspace] = useState(
    localStorage.getItem("workspace") || "IT Helpdesk"
  );

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------

  const pages = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["tickets", "Tickets", Ticket],
    ["notifications", "Notifications", Bell],
    ["users", "Users", Users],
    ["reports", "Reports", BarChart3],
    ["settings", "Settings", Settings],
  ];

  function nav(target) {
    setPage(target);
    setMobile(false);
    setSearch("");
  }

  // ----------------------------------------------------------
  // Toast
  // ----------------------------------------------------------

  function notify(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3000);
  }

  // ----------------------------------------------------------
  // Load all data
  // ----------------------------------------------------------

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [ticketData, userData, notificationData] =
        await Promise.all([
          api.getTickets(),
          api.getUsers(),
          api.getNotifications(),
        ]);

      setTickets(Array.isArray(ticketData) ? ticketData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setNotifications(
        Array.isArray(notificationData) ? notificationData : []
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ----------------------------------------------------------
  // Search
  // ----------------------------------------------------------

  const filteredTickets = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return tickets;
    }

    return tickets.filter((ticket) =>
      [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.priority,
        ticket.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [tickets, search]);

  // ----------------------------------------------------------
  // Counts
  // ----------------------------------------------------------

  const openCount = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // ----------------------------------------------------------
  // User helper
  // ----------------------------------------------------------

  function getUserName(userId) {
    const user = users.find((item) => item.id === userId);

    return user ? user.name : `User #${userId}`;
  }

  // ----------------------------------------------------------
  // Ticket operations
  // ----------------------------------------------------------

  async function createTicket(ticket) {
    try {
      await api.createTicket(ticket);
      notify("Ticket created successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to create ticket.");
    }
  }

  async function updateTicket(id, ticket) {
    try {
      await api.updateTicket(id, ticket);
      notify("Ticket updated successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to update ticket.");
    }
  }

  async function deleteTicket(id) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ticket #${id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.deleteTicket(id);
      notify("Ticket deleted successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to delete ticket.");
    }
  }

  // ----------------------------------------------------------
  // User operations
  // ----------------------------------------------------------

  async function createUser(user) {
    try {
      await api.createUser(user);
      notify("User created successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to create user.");
    }
  }

  async function updateUser(id, user) {
    try {
      await api.updateUser(id, user);
      notify("User updated successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to update user.");
    }
  }

  async function deleteUser(id) {
    const confirmed = window.confirm(
      `Are you sure you want to delete user #${id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.deleteUser(id);
      notify("User deleted successfully.");
      await load();
    } catch (err) {
      notify(err.message || "Unable to delete user.");
    }
  }

  // ----------------------------------------------------------
  // Notification operation
  // ----------------------------------------------------------

  async function markNotificationRead(notification) {
    if (notification.read) {
      return;
    }

    try {
      await api.updateNotification(notification.id, {
        user_id: notification.user_id,
        message: notification.message,
        ticket_id: notification.ticket_id,
        read: true,
      });

      await load();
    } catch (err) {
      notify(err.message || "Unable to update notification.");
    }
  }

  // ----------------------------------------------------------
  // Save workspace
  // ----------------------------------------------------------

  function saveWorkspace(value) {
    localStorage.setItem("workspace", value);
    setWorkspace(value);
    notify("Workspace name saved");
  }

  // ==========================================================
  // SIDEBAR
  // ==========================================================

  return (
    <div className="app">

      <aside className={mobile ? "sidebar open" : "sidebar"}>

        <div className="brand">
          <div className="brand-mark">IT</div>

          <div>
            <b>{workspace}</b>
            <small>Service Desk</small>
          </div>
        </div>

        <nav>
          {pages.map(([key, label, Icon]) => (
            <button
              className={page === key ? "nav active" : "nav"}
              key={key}
              onClick={() => nav(key)}
            >
              <Icon size={18} />

              <span>{label}</span>

              {key === "notifications" && unreadCount > 0 && (
                <em>{unreadCount}</em>
              )}
            </button>
          ))}
        </nav>

        <button
          className="nav logout"
          onClick={() =>
            notify("Logout is not configured yet")
          }
        >
          <LogOut size={18} />
          Sign out
        </button>

      </aside>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="main">

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>

          <div>
            <h1>
              {pages.find((item) => item[0] === page)?.[1]}
            </h1>

            <p>{workspace} Service Desk</p>
          </div>


          <div className="top-actions">

            <div className="search">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search tickets..."
              />
            </div>


            <button
              className="icon-btn"
              onClick={() => nav("notifications")}
            >
              <Bell size={19} />

              {unreadCount > 0 && <i />}
            </button>


            <button
              className="icon-btn"
              onClick={load}
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>

          </div>

        </header>


        <section className="content">

          {loading ? (
            <div className="panel">
              Loading...
            </div>
          ) : error ? (
            <div className="error">
              {error}

              <button onClick={load}>
                Retry
              </button>
            </div>
          ) : (
            <>

              {page === "dashboard" && (
                <DashboardPage
                  tickets={tickets}
                  users={users}
                  notifications={notifications}
                  openCount={openCount}
                  inProgressCount={inProgressCount}
                  resolvedCount={resolvedCount}
                  unreadCount={unreadCount}
                  getUserName={getUserName}
                  onNewTicket={() => nav("tickets")}
                />
              )}


              {page === "tickets" && (
                <TicketsPage
                  tickets={filteredTickets}
                  users={users}
                  getUserName={getUserName}
                  onCreate={createTicket}
                  onUpdate={updateTicket}
                  onDelete={deleteTicket}
                />
              )}


              {page === "notifications" && (
                <NotificationsPage
                  notifications={notifications}
                  onRead={markNotificationRead}
                />
              )}


              {page === "users" && (
                <UsersPage
                  users={users}
                  onCreate={createUser}
                  onUpdate={updateUser}
                  onDelete={deleteUser}
                />
              )}


              {page === "reports" && (
                <ReportsPage
                  tickets={tickets}
                  users={users}
                />
              )}


              {page === "settings" && (
                <SettingsPage
                  workspace={workspace}
                  onSave={saveWorkspace}
                />
              )}

            </>
          )}

        </section>

      </main>


      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

    </div>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function DashboardPage({
  tickets,
  users,
  notifications,
  openCount,
  inProgressCount,
  resolvedCount,
  unreadCount,
  getUserName,
  onNewTicket,
}) {
  const recentTickets = [...tickets]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const recentNotifications = [...notifications]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <>
      <div className="page-head">

        <div>
          <span>OVERVIEW</span>

          <h2>
            Welcome to your service desk
          </h2>

          <p>
            Live data from your services.
          </p>
        </div>

        <button
          className="primary"
          onClick={onNewTicket}
        >
          <Plus size={17} />
          New ticket
        </button>

      </div>


      <div className="stats">

        <div className="stat">
          <small>Tickets</small>
          <strong>{tickets.length}</strong>
        </div>

        <div className="stat">
          <small>Open</small>
          <strong>{openCount}</strong>
        </div>

        <div className="stat">
          <small>In Progress</small>
          <strong>{inProgressCount}</strong>
        </div>

        <div className="stat">
          <small>Resolved</small>
          <strong>{resolvedCount}</strong>
        </div>

        <div className="stat">
          <small>Users</small>
          <strong>{users.length}</strong>
        </div>

        <div className="stat">
          <small>Unread</small>
          <strong>{unreadCount}</strong>
        </div>

      </div>


      <div className="grid2">

        <div className="panel">

          <h3>Recent tickets</h3>

          {recentTickets.length === 0 ? (
            <div className="empty">
              No tickets found.
            </div>
          ) : (
            recentTickets.map((ticket) => (
              <div
                className="row"
                key={ticket.id}
              >

                <div>
                  <b>
                    #{ticket.id} {ticket.title}
                  </b>

                  <small>
                    {ticket.category} · {ticket.priority}
                  </small>
                </div>

                <span className="badge">
                  {ticket.status}
                </span>

              </div>
            ))
          )}

        </div>


        <div className="panel">

          <h3>Recent notifications</h3>

          {recentNotifications.length === 0 ? (
            <div className="empty">
              No notifications found.
            </div>
          ) : (
            recentNotifications.map(
              (notification) => (
                <div
                  className="row"
                  key={notification.id}
                >

                  <div>
                    <b>
                      {notification.message}
                    </b>

                    <small>
                      Ticket #{notification.ticket_id}
                    </small>
                  </div>

                  <span className="badge">
                    {notification.read
                      ? "Read"
                      : "Unread"}
                  </span>

                </div>
              )
            )
          )}

        </div>

      </div>
    </>
  );
}


// ============================================================
// TICKETS PAGE
// ============================================================

function TicketsPage({
  tickets,
  users,
  getUserName,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [modal, setModal] = useState(null);

  function openCreate() {
    setModal({
      type: "create",
      ticket: {
        title: "",
        description: "",
        category: "Network",
        priority: "Medium",
        status: "Open",
        user_id: users[0]?.id || 1,
      },
    });
  }

  function openEdit(ticket) {
    setModal({
      type: "edit",
      ticket: { ...ticket },
    });
  }

  async function submit(ticket) {
    if (!ticket.title.trim()) {
      return;
    }

    if (modal.type === "create") {
      await onCreate(ticket);
    } else {
      await onUpdate(ticket.id, ticket);
    }

    setModal(null);
  }

  return (
    <>
      <div className="page-head">

        <div>
          <span>TICKETS</span>

          <h2>Service desk tickets</h2>

          <p>
            All ticket data comes from PostgreSQL.
          </p>
        </div>

        <button
          className="primary"
          onClick={openCreate}
        >
          <Plus size={17} />
          New ticket
        </button>

      </div>


      <div className="panel table-wrap">

        {tickets.length === 0 ? (
          <div className="empty">
            No tickets found.
          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>User</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {tickets.map((ticket) => (
                <tr key={ticket.id}>

                  <td>#{ticket.id}</td>

                  <td>
                    <b>{ticket.title}</b>

                    <small>
                      {ticket.description}
                    </small>
                  </td>

                  <td>
                    {ticket.category}
                  </td>

                  <td>
                    <span className="badge">
                      {ticket.priority}
                    </span>
                  </td>

                  <td>
                    <span className="badge">
                      {ticket.status}
                    </span>
                  </td>

                  <td>
                    {getUserName(ticket.user_id)}
                  </td>

                  <td>

                    <button
                      className="small-btn"
                      title="Edit ticket"
                      onClick={() =>
                        openEdit(ticket)
                      }
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      className="small-btn danger"
                      title="Delete ticket"
                      onClick={() =>
                        onDelete(ticket.id)
                      }
                    >
                      <Trash2 size={15} />
                    </button>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        )}

      </div>


      {modal && (
        <TicketModal
          ticket={modal.ticket}
          users={users}
          title={
            modal.type === "create"
              ? "Create ticket"
              : "Edit ticket"
          }
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

    </>
  );
}


// ============================================================
// TICKET MODAL
// ============================================================

function TicketModal({
  ticket,
  users,
  title,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(ticket);

  function change(name, value) {
    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="overlay">

      <div className="modal">

        <div className="modal-head">

          <h2>{title}</h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>


        <form
          className="form"
          onSubmit={submit}
        >

          <label>
            Title

            <input
              value={form.title}
              onChange={(event) =>
                change(
                  "title",
                  event.target.value
                )
              }
              required
            />
          </label>


          <label>
            Description

            <textarea
              value={form.description}
              onChange={(event) =>
                change(
                  "description",
                  event.target.value
                )
              }
              required
            />
          </label>


          <div className="form2">

            <label>
              Category

              <select
                value={form.category}
                onChange={(event) =>
                  change(
                    "category",
                    event.target.value
                  )
                }
              >
                <option>Network</option>
                <option>Email</option>
                <option>Hardware</option>
                <option>Software</option>
                <option>Access</option>
                <option>Other</option>
              </select>

            </label>


            <label>
              Priority

              <select
                value={form.priority}
                onChange={(event) =>
                  change(
                    "priority",
                    event.target.value
                  )
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>

            </label>

          </div>


          <div className="form2">

            <label>
              Status

              <select
                value={form.status}
                onChange={(event) =>
                  change(
                    "status",
                    event.target.value
                  )
                }
              >
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>

            </label>


            <label>
              User

              <select
                value={form.user_id}
                onChange={(event) =>
                  change(
                    "user_id",
                    Number(event.target.value)
                  )
                }
              >
                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name}
                  </option>
                ))}
              </select>

            </label>

          </div>


          <div className="modal-actions">

            <button
              type="button"
              className="secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
            >
              Save
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


// ============================================================
// NOTIFICATIONS PAGE
// ============================================================

function NotificationsPage({
  notifications,
  onRead,
}) {
  const sorted = [...notifications].sort(
    (a, b) => b.id - a.id
  );

  return (
    <>
      <div className="page-head">

        <div>
          <span>NOTIFICATIONS</span>

          <h2>Notifications</h2>

          <p>
            Notifications from the helpdesk service.
          </p>
        </div>

      </div>


      <div className="panel">

        {sorted.length === 0 ? (
          <div className="empty">
            No notifications found.
          </div>
        ) : (
          sorted.map((notification) => (
            <div
              className={
                notification.read
                  ? "notification"
                  : "notification unread"
              }
              key={notification.id}
              onClick={() =>
                onRead(notification)
              }
            >

              <Bell size={18} />

              <div>

                <b>
                  {notification.message}
                </b>

                <p>
                  Ticket #{notification.ticket_id}
                </p>

              </div>

              {!notification.read && (
                <span className="dot" />
              )}

            </div>
          ))
        )}

      </div>
    </>
  );
}


// ============================================================
// USERS PAGE
// ============================================================

function UsersPage({
  users,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [modal, setModal] = useState(null);

  function openCreate() {
    setModal({
      type: "create",
      user: {
        name: "",
        email: "",
        department: "",
      },
    });
  }

  function openEdit(user) {
    setModal({
      type: "edit",
      user: { ...user },
    });
  }

  async function submit(user) {
    if (!user.name.trim() || !user.email.trim()) {
      return;
    }

    if (modal.type === "create") {
      await onCreate(user);
    } else {
      await onUpdate(user.id, user);
    }

    setModal(null);
  }

  return (
    <>
      <div className="page-head">

        <div>
          <span>USERS</span>

          <h2>Users</h2>

          <p>
            Manage helpdesk users.
          </p>
        </div>

        <button
          className="primary"
          onClick={openCreate}
        >
          <Plus size={17} />
          New user
        </button>

      </div>


      <div className="user-grid">

        {users.length === 0 ? (
          <div className="panel empty">
            No users found.
          </div>
        ) : (
          users.map((user) => (
            <div
              className="panel user-card"
              key={user.id}
            >

              <div className="avatar">
                {user.name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>

              <div className="grow">

                <h3>{user.name}</h3>

                <p>{user.email}</p>

                <small>
                  {user.department || "No department"}
                </small>

              </div>


              <div>

                <button
                  className="small-btn"
                  title="Edit user"
                  onClick={() =>
                    openEdit(user)
                  }
                >
                  <Pencil size={15} />
                </button>

                <button
                  className="small-btn danger"
                  title="Delete user"
                  onClick={() =>
                    onDelete(user.id)
                  }
                >
                  <Trash2 size={15} />
                </button>

              </div>

            </div>
          ))
        )}

      </div>


      {modal && (
        <UserModal
          user={modal.user}
          title={
            modal.type === "create"
              ? "Create user"
              : "Edit user"
          }
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

    </>
  );
}


// ============================================================
// USER MODAL
// ============================================================

function UserModal({
  user,
  title,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(user);

  function change(name, value) {
    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="overlay">

      <div className="modal">

        <div className="modal-head">

          <h2>{title}</h2>

          <button onClick={onClose}>
            <X />
          </button>

        </div>


        <form
          className="form"
          onSubmit={submit}
        >

          <label>
            Name

            <input
              value={form.name}
              onChange={(event) =>
                change(
                  "name",
                  event.target.value
                )
              }
              required
            />
          </label>


          <label>
            Email

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                change(
                  "email",
                  event.target.value
                )
              }
              required
            />
          </label>


          <label>
            Department

            <input
              value={form.department || ""}
              onChange={(event) =>
                change(
                  "department",
                  event.target.value
                )
              }
            />
          </label>


          <div className="modal-actions">

            <button
              type="button"
              className="secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
            >
              Save
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


// ============================================================
// REPORTS
// ============================================================

function ReportsPage({
  tickets,
  users,
}) {
  const categories = {};

  tickets.forEach((ticket) => {
    categories[ticket.category] =
      (categories[ticket.category] || 0) + 1;
  });

  return (
    <>
      <div className="page-head">

        <div>
          <span>REPORTS</span>

          <h2>Reports</h2>

          <p>
            Simple helpdesk statistics.
          </p>
        </div>

      </div>


      <div className="stats">

        <div className="stat">
          <small>Total tickets</small>
          <strong>{tickets.length}</strong>
        </div>

        <div className="stat">
          <small>Total users</small>
          <strong>{users.length}</strong>
        </div>

        <div className="stat">
          <small>Open tickets</small>
          <strong>
            {
              tickets.filter(
                (t) => t.status === "Open"
              ).length
            }
          </strong>
        </div>

        <div className="stat">
          <small>In Progress</small>
          <strong>
            {
              tickets.filter(
                (t) => t.status === "In Progress"
              ).length
            }
          </strong>
        </div>

        <div className="stat">
          <small>Resolved</small>
          <strong>
            {
              tickets.filter(
                (t) => t.status === "Resolved"
              ).length
            }
          </strong>
        </div>

        <div className="stat">
          <small>Critical</small>
          <strong>
            {
              tickets.filter(
                (t) => t.priority === "Critical"
              ).length
            }
          </strong>
        </div>

      </div>


      <div className="panel">

        <h3>Tickets by category</h3>

        {Object.keys(categories).length === 0 ? (
          <div className="empty">
            No ticket data available.
          </div>
        ) : (
          Object.entries(categories).map(
            ([category, count]) => (
              <div
                className="row"
                key={category}
              >
                <b>{category}</b>

                <span className="badge">
                  {count}
                </span>
              </div>
            )
          )
        )}

      </div>
    </>
  );
}


// ============================================================
// SETTINGS
// ============================================================

function SettingsPage({
  workspace,
  onSave,
}) {
  const [name, setName] = useState(workspace);

  useEffect(() => {
    setName(workspace);
  }, [workspace]);

  function submit(event) {
    event.preventDefault();

    const value = name.trim();

    if (!value) {
      return;
    }

    onSave(value);
  }

  return (
    <>
      <div className="page-head">

        <div>
          <span>CONFIGURATION</span>

          <h2>Settings</h2>

          <p>
            Simple frontend settings.
          </p>
        </div>

      </div>


      <form
        className="panel form"
        onSubmit={submit}
      >

        <label>
          Workspace name

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </label>


        <button
          type="submit"
          className="primary"
        >
          Save
        </button>

      </form>
    </>
  );
}createRoot(document.getElementById("root")).render(<App />);
