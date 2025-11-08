import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { socket, SOCKET_URL } from "./socket.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

const StatusDot = ({ color }) => {
  const bg = color === "green" ? "#28a745" : color === "orange" ? "#fd7e14" : "#dc3545";
  return (
    <span
      style={{
        display: "inline-block",
        height: 14,
        width: 14,
        borderRadius: "50%",
        marginLeft: 6,
        border: "1px solid #333",
        verticalAlign: "middle",
        backgroundColor: bg,
      }}
    />
  );
};

export default function SectionsView() {
  const [machines, setMachines] = useState([]);
  const [filterBySection, setFilterBySection] = useState({});
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { section: sectionParam } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const API_BASE = SOCKET_URL === "/" ? "" : SOCKET_URL;
    fetch(`${API_BASE}/api/machines`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.machines) setMachines(j.data.machines);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleNetwork = (data) => {
      setMachines((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data.machines)) return prev;
        return data.machines;
      });
    };

    socket.on("network-status", handleNetwork);
    return () => socket.off("network-status", handleNetwork);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedMachine(null);
    };
    if (selectedMachine) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMachine]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of machines) {
      const key = m.section || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    for (const [_k, arr] of map) {
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [machines]);

  const getOverallColor = (m) => {
    return (
      m.results?.ip?.color ||
      m.results?.gateway?.color ||
      m.results?.kiosk_pc?.color ||
      "red"
    );
  };

  const selectedSection = sectionParam || searchParams.get("section") || "";
  const setSection = (section) => {
    if (section) navigate(`/sections/${encodeURIComponent(section)}`);
    else navigate(`/sections`);
  };

  const renderDetailsModal = () => {
    if (!selectedMachine) return null;
    const m = selectedMachine;
    return (
      <div className="modal fade show" style={{ display: "block" }} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg" role="document" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{m.name}</h5>
              <button type="button" className="btn-close" onClick={() => setSelectedMachine(null)}></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="card p-2">
                    <div className="d-flex justify-content-between"><span>Machine IP</span><StatusDot color={m.results?.ip?.color} /></div>
                    <div className="fw-semibold">{m.results?.ip?.ip || "-"}</div>
                    <div className="text-muted small">{m.results?.ip?.alive ? `${m.results?.ip?.ping} ms` : "DOWN"}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card p-2">
                    <div className="d-flex justify-content-between"><span>Gateway</span><StatusDot color={m.results?.gateway?.color} /></div>
                    <div className="fw-semibold">{m.results?.gateway?.ip || "-"}</div>
                    <div className="text-muted small">{m.results?.gateway?.alive ? `${m.results?.gateway?.ping} ms` : "DOWN"}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card p-2">
                    <div className="d-flex justify-content-between"><span>Kiosk</span><StatusDot color={m.results?.kiosk_pc?.color} /></div>
                    <div className="fw-semibold">{m.results?.kiosk_pc?.ip || "-"}</div>
                    <div className="text-muted small">{m.results?.kiosk_pc?.alive ? `${m.results?.kiosk_pc?.ping} ms` : "DOWN"}</div>
                  </div>
                </div>
              </div>
              <div className="row g-3 mt-2">
                <div className="col-md-12">
                  <table className="table table-sm">
                    <tbody>
                      <tr><th style={{width:160}}>Name</th><td>{m.name || "-"}</td></tr>
                      <tr><th>Machine IP</th><td>{m.ip || m.results?.ip?.ip || "-"}</td></tr>
                      <tr><th>Gateway</th><td>{m.gateway || m.results?.gateway?.ip || "-"}</td></tr>
                      <tr><th>Kiosk PC</th><td>{m.kiosk_pc || m.results?.kiosk_pc?.ip || "-"}</td></tr>
                      <tr><th>Uplink</th><td>{m.uplink || "-"}</td></tr>
                      <tr><th>Source Switch</th><td>{m.source_switch || "-"}</td></tr>
                      <tr><th>Column</th><td>{m.column || "-"}</td></tr>
                      <tr><th>Bay</th><td>{m.bay || "-"}</td></tr>
                      <tr><th>Section</th><td>{m.section || "-"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedMachine(null)}>Close</button>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show" onClick={() => setSelectedMachine(null)}></div>
      </div>
    );
  };

  return (
    <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-primary mb-0">Machines by Section</h3>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => navigate("/")}>Table View</button>
          <button className="btn btn-warning" onClick={() => navigate("/yaml-editor")}>Edit YAML</button>
        </div>
      </div>

      {grouped
        .filter(([section]) => !selectedSection || section === selectedSection)
        .map(([section, items]) => {
          const q = (filterBySection[section] || "").toLowerCase();
          const filtered = q
            ? items.filter(
                (m) =>
                  (m.name || "").toLowerCase().includes(q) ||
                  (m.results?.ip?.ip || "").toLowerCase().includes(q) ||
                  (m.results?.gateway?.ip || "").toLowerCase().includes(q) ||
                  (m.results?.kiosk_pc?.ip || "").toLowerCase().includes(q)
              )
            : items;
          return (
        <div key={section} className="card mb-3 shadow-sm">
          <div className="card-header fw-semibold d-flex align-items-center justify-content-between">
            <span role="button" onClick={() => setSection(section)}>Section {section}</span>
            <input
              className="form-control"
              placeholder="Search in section"
              style={{ maxWidth: 260 }}
              value={filterBySection[section] || ""}
              onChange={(e) =>
                setFilterBySection((s) => ({ ...s, [section]: e.target.value }))
              }
            />
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2">
              {filtered.map((m, idx) => (
                <div
                  key={`${m.name}-${idx}`}
                  className="badge bg-light text-dark border shadow-sm p-3 d-flex align-items-center"
                  style={{ borderRadius: 12, minWidth: 140, justifyContent: "space-between" }}
                  title={`${m.name}\nIP: ${m.results?.ip?.ip || "-"}\nGW: ${m.results?.gateway?.ip || "-"}\nKiosk: ${m.results?.kiosk_pc?.ip || "-"}`}
                  onClick={() => setSelectedMachine(m)}
                >
                  <span className="fw-semibold">{m.name}</span>
                  <StatusDot color={getOverallColor(m)} />
                </div>
              ))}
            </div>
          </div>
        </div>
          );
        })}
      {renderDetailsModal()}
    </div>
  );
}
