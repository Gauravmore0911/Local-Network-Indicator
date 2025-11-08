import React, { useEffect, useState, useMemo } from "react";
import { socket, SOCKET_URL } from "./socket.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "./assets/logo.png";
import { useNavigate } from "react-router-dom";
import { Funnel } from "react-bootstrap-icons";
 
// ✅ Debounce hook (prevents lag when typing)
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const App = () => {
  const [machines, setMachines] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [filterVisible, setFilterVisible] = useState(false);
  const [searchField, setSearchField] = useState("name");
  const [searchValue, setSearchValue] = useState("");

  const rowsPerPage = 20;
  const navigate = useNavigate();

  // ✅ Debounced search value for smoother filter typing
  const debouncedSearchValue = useDebounce(searchValue, 300);

  const StatusDot = ({ color }) => {
    const bg = color === "green" ? "#28a745" : color === "orange" ? "#fd7e14" : "#dc3545";
    return (
      <span
        style={{
          display: "inline-block",
          height: 14,
          width: 14,
          borderRadius: "50%",
          marginRight: 6,
          border: "1px solid #333",
          verticalAlign: "middle",
          backgroundColor: bg,
        }}
      />
    );
  };

  // --- SOCKET.IO NETWORK STATUS ---
  useEffect(() => {
    const API_BASE = SOCKET_URL === "/" ? "" : SOCKET_URL;
    fetch(`${API_BASE}/api/machines`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.machines) {
          setMachines(j.data.machines);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleNetwork = (data) => {
      // ✅ Prevent unnecessary re-renders (only update if data changed)
      setMachines((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data.machines)) return prev;
        return data.machines;
      });
      setLastUpdated(new Date(data.ts).toLocaleTimeString());
    };

    socket.on("connect", () => console.log("✅ Connected:", socket.id));
    socket.on("network-status", handleNetwork);

    return () => {
      socket.off("connect");
      socket.off("network-status", handleNetwork);
    };
  }, []);

  // --- Render Status Cell ---
  const renderStatus = (result) => {
    if (!result)
      return (
        <td className="text-center" style={{ fontWeight: 500, fontSize: "0.9rem" }}>
          <StatusDot color="red" /> N/A
        </td>
      );
    return (
      <td className="text-center" style={{ fontWeight: 500, fontSize: "0.9rem" }}>
        <StatusDot color={result.color} />{" "}
        {result.alive ? `${result.ip} (${result.ping} ms)` : "DOWN"}
      </td>
    );
  };

  // --- SORTING (memoized) ---
  const sortedMachines = useMemo(() => {
    if (!sortConfig.key) return machines;
    const sorted = [...machines].sort((a, b) => {
      const aPing = a.results?.[sortConfig.key]?.ping ?? Infinity;
      const bPing = b.results?.[sortConfig.key]?.ping ?? Infinity;
      return sortConfig.direction === "asc" ? aPing - bPing : bPing - aPing;
    });
    return sorted;
  }, [machines, sortConfig]);

  // --- FILTERING (memoized + debounced) ---
  const filteredMachines = useMemo(() => {
    const term = debouncedSearchValue.trim().toLowerCase();
    if (!term) return sortedMachines;

    return sortedMachines.filter((m) => {
      const getFieldValue = (field) => {
        switch (field) {
          case "name":
            return m.name;
          case "ip":
            return m.results?.ip?.ip;
          case "gateway":
            return m.results?.gateway?.ip;
          case "kiosk_pc":
            return m.results?.kiosk_pc?.ip;
          case "uplink":
            return m.uplink;
          case "switch":
            return m.source_switch;
          case "column":
            return m.column;
          case "bay":
            return m.bay;
          case "section":
            return m.section;
          default:
            return "";
        }
      };
      const value = getFieldValue(searchField);
      return value?.toString().toLowerCase().includes(term);
    });
  }, [sortedMachines, searchField, debouncedSearchValue]);

  // --- PAGINATION (memoized) ---
  const totalPages = Math.ceil(filteredMachines.length / rowsPerPage);
  const currentMachines = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMachines.slice(start, start + rowsPerPage);
  }, [filteredMachines, currentPage]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const clearFilter = () => {
    setSearchValue("");
    setSearchField("name");
    setFilterVisible(false);
    setCurrentPage(1);
  };

  return (
    <div className="container mt-3">
      {/* HEADER */}
      <div className="d-flex align-items-center mb-3">
        <img src={logo} alt="Logo" className="me-3" style={{ height: 70, objectFit: "contain" }} />
        <h2 className="text-primary flex-grow-1 text-center">
          Local Network Status
        </h2>
      </div>

      {/* ACTION BAR */}
      <div className="mt-2">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          {/* Left Section */}
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              className="btn btn-warning"
              onClick={() => navigate("/yaml-editor")}
            >
              Edit Machine YAML
            </button>

            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate("/sections")}
            >
              Section View
            </button>

            {/* Filter Icon */}
            <button
              className={`btn btn-outline-primary d-flex align-items-center ${
                filterVisible ? "active" : ""
              }`}
              onClick={() => setFilterVisible(!filterVisible)}
            >
              <Funnel size={18} className="me-1" />
              Filter
            </button>
          </div>

          {/* Right Side */}
          <div className="d-flex flex-column align-items-end">
            <span className="text-muted">
              Last updated: {lastUpdated || "--:--:--"}
            </span>
            <div className="d-flex gap-3 mt-1 small">
              <div><StatusDot color="green" /> Healthy (≤10ms)</div>
              <div><StatusDot color="orange" /> Warning (10–100ms)</div>
              <div><StatusDot color="red" /> Offline / {"100ms"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      {filterVisible && (
        <div className="card card-body mt-3 shadow-sm border-primary">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <label className="fw-semibold me-2 mb-0">Filter by:</label>
            <select
              className="form-select"
              value={searchField}
              style={{ width: "180px" }}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="name">Machine Name</option>
              <option value="ip">Machine IP</option>
              <option value="gateway">Gateway IP</option>
              <option value="kiosk_pc">Kiosk IP</option>
              <option value="uplink">Uplink</option>
              <option value="switch">Switch</option>
              <option value="column">Column</option>
              <option value="bay">Bay</option>
              <option value="section">Section</option>
            </select>

            <input
              type="text"
              className="form-control"
              style={{ width: "250px" }}
              placeholder={`Search by ${searchField.replace("_", " ")}...`}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setCurrentPage(1);
              }}
            />

            <button className="btn btn-secondary" onClick={clearFilter}>
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <table className="table table-bordered table-striped align-middle mt-3" style={{ backgroundColor: "#fff", border: "2px solid #007bff" }}>
        <thead className="text-center" style={{ backgroundColor: "#1d349a", color: "white" }}>
          <tr>
            <th>Sr.No</th>
            <th>Machine Name</th>
            <th
              onClick={() =>
                setSortConfig({
                  key: "ip",
                  direction: sortConfig.direction === "asc" ? "desc" : "asc",
                })
              }
              style={{ cursor: "pointer" }}
            >
              Machine IP{" "}
              {sortConfig.key === "ip"
                ? sortConfig.direction === "asc"
                  ? "↑"
                  : "↓"
                : "⇅"}
            </th>
            <th
              onClick={() =>
                setSortConfig({
                  key: "gateway",
                  direction: sortConfig.direction === "asc" ? "desc" : "asc",
                })
              }
              style={{ cursor: "pointer" }}
            >
              Gateway IP{" "}
              {sortConfig.key === "gateway"
                ? sortConfig.direction === "asc"
                  ? "↑"
                  : "↓"
                : "⇅"}
            </th>
            <th
              onClick={() =>
                setSortConfig({
                  key: "kiosk_pc",
                  direction: sortConfig.direction === "asc" ? "desc" : "asc",
                })
              }
              style={{ cursor: "pointer" }}
            >
              Kiosk IP{" "}
              {sortConfig.key === "kiosk_pc"
                ? sortConfig.direction === "asc"
                  ? "↑"
                  : "↓"
                : "⇅"}
            </th>
            <th>Uplink</th>
            <th>Switch</th>
            <th>Column</th>
            <th>Bay</th>
            <th>Section</th>
          </tr>
        </thead>
        <tbody>
          {currentMachines.map((m, i) => (
            <tr key={`${m.name}-${i}`}>
              <td className="text-center">
                {(currentPage - 1) * rowsPerPage + i + 1}
              </td>
              <td>{m.name}</td>
              {renderStatus(m.results?.ip)}
              {renderStatus(m.results?.gateway)}
              {renderStatus(m.results?.kiosk_pc)}
              <td className="text-center">{m.uplink || "-"}</td>
              <td className="text-center">{m.source_switch || "-"}</td>
              <td className="text-center">{m.column || "-"}</td>
              <td className="text-center">{m.bay || "-"}</td>
              <td className="text-center">{m.section || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINATION */}
      <nav>
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => paginate(currentPage - 1)}
            >
              Previous
            </button>
          </li>
          {Array.from({ length: totalPages }, (_, i) => (
            <li
              key={i + 1}
              className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
            >
              <button className="page-link" onClick={() => paginate(i + 1)}>
                {i + 1}
              </button>
            </li>
          ))}
          <li
            className={`page-item ${
              currentPage === totalPages ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() => paginate(currentPage + 1)}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default App;
