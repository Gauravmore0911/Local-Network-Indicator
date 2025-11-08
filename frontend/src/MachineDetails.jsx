import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "./socket.jsx";
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

export default function MachineDetails() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    const handleNetwork = (data) => setMachines(data.machines || []);
    socket.on("network-status", handleNetwork);
    return () => socket.off("network-status", handleNetwork);
  }, []);

  const machine = useMemo(
    () => machines.find((m) => (m.name || "").toLowerCase() === (name || "").toLowerCase()),
    [machines, name]
  );

  const field = (label, value) => (
    <tr>
      <th style={{ width: 160 }}>{label}</th>
      <td>{value ?? "-"}</td>
    </tr>
  );

  const color = machine && (machine.results?.ip?.color || machine.results?.gateway?.color || machine.results?.kiosk_pc?.color || "red");
  const alive = machine && (machine.results?.ip?.alive || machine.results?.gateway?.alive || machine.results?.kiosk_pc?.alive);

  return (
    <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-primary mb-0">Machine Details</h3>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary" onClick={() => navigate("/sections")}>Sections</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>Table</button>
        </div>
      </div>

      {!machine ? (
        <div className="alert alert-warning">Machine not found: {name}</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between">
            <span className="fw-semibold">{machine.name}</span>
            <span><StatusDot color={color} /> {alive ? "Online" : "Offline"}</span>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="card p-2">
                  <div className="d-flex justify-content-between"><span>Machine IP</span><StatusDot color={machine.results?.ip?.color} /></div>
                  <div className="fw-semibold">{machine.results?.ip?.ip || "-"}</div>
                  <div className="text-muted small">{machine.results?.ip?.alive ? `${machine.results?.ip?.ping} ms` : "DOWN"}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-2">
                  <div className="d-flex justify-content-between"><span>Gateway</span><StatusDot color={machine.results?.gateway?.color} /></div>
                  <div className="fw-semibold">{machine.results?.gateway?.ip || "-"}</div>
                  <div className="text-muted small">{machine.results?.gateway?.alive ? `${machine.results?.gateway?.ping} ms` : "DOWN"}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card p-2">
                  <div className="d-flex justify-content-between"><span>Kiosk</span><StatusDot color={machine.results?.kiosk_pc?.color} /></div>
                  <div className="fw-semibold">{machine.results?.kiosk_pc?.ip || "-"}</div>
                  <div className="text-muted small">{machine.results?.kiosk_pc?.alive ? `${machine.results?.kiosk_pc?.ping} ms` : "DOWN"}</div>
                </div>
              </div>
            </div>

            <div className="row g-3 mt-2">
              <div className="col-md-12">
                <table className="table table-sm">
                  <tbody>
                    {field("Name", machine.name)}
                    {field("Machine IP", machine.ip || machine.results?.ip?.ip)}
                    {field("Gateway", machine.gateway || machine.results?.gateway?.ip)}
                    {field("Kiosk PC", machine.kiosk_pc || machine.results?.kiosk_pc?.ip)}
                    {field("Uplink", machine.uplink)}
                    {field("Source Switch", machine.source_switch)}
                    {field("Column", machine.column)}
                    {field("Bay", machine.bay)}
                    {field("Section", machine.section)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
