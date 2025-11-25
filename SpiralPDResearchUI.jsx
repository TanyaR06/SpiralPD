import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SpiralPDResearchUI() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subjectId, setSubjectId] = useState("demo_subject");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [dark, setDark] = useState(true); // keep dark by default
  const inputRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const resp = await axios.get("/api/predictions");
        if (Array.isArray(resp.data)) {
          // map history items into UI-friendly format
          const mapped = resp.data.map(p => ({
            id: p._id,
            subjectId: p.subjectId,
            label: p.label,
            score: p.score,
            modelVersion: p.modelVersion || p.model || "rf-v2",
            time: p.createdAt,
          }));
          setHistory(mapped.slice(0, 50));
        }
      } catch (err) {
        // ignore if endpoint not present
      }
    })();
    // toggle body class for dark theme
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) { alert("Choose an image first"); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("subjectId", subjectId);
      form.append("spiral", file);

      const resp = await axios.post("/api/upload-and-predict", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (resp.data && resp.data.prediction) {
        const p = resp.data.prediction;
        const item = {
          id: p._id || String(Date.now()),
          subjectId: p.subjectId || subjectId,
          label: p.label,
          score: p.score,
          modelVersion: resp.data.modelVersion || p.model || "rf-v2",
          time: p.createdAt || new Date().toISOString(),
        };
        setResult(item);
        setHistory(prev => [item, ...prev].slice(0, 100));
      } else {
        alert("Model server returned unexpected result");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed — check console");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      {/* NAVBAR */}
      <nav className="navbar navbar-dark navbar-dark-custom rounded mb-4">
        <div className="container-fluid px-3">
          <div className="d-flex align-items-center gap-3">
            <div>
              <h4 className="mb-0 text-white">SpiralPD</h4>
              <div className="text-muted-neon small">Spiral-based Parkinson Detection — Research UI</div>
            </div>
            <div className="ms-3">
              <span className="badge-neon">rf-v2</span>
            </div>
          </div>

          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-light btn-sm me-2"
              onClick={() => { setDark(d => !d); }}
            >
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </nav>

      <div className="row gy-4">
        {/* Upload column */}
        <div className="col-lg-4">
          <div className="card neon p-3">
            <div className="card-body">
              <h5 className="neon-accent">Upload & Predict</h5>
              <form onSubmit={onSubmit} className="mt-3">
                <div className="mb-3">
                  <label className="form-label text-muted-neon">Subject ID</label>
                  <input value={subjectId} onChange={e => setSubjectId(e.target.value)} className="form-control bg-transparent text-white border-1" />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted-neon">Spiral image</label>
                  <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="form-control form-control-sm" />
                </div>
                <div className="d-grid">
                  <button className="btn btn-neon" disabled={loading}>{loading ? "Predicting…" : "Upload & Predict"}</button>
                </div>
              </form>

              <div className="mt-4">
                <h6 className="text-muted-neon mb-2">Preview</h6>
                <div className="preview-frame" style={{ height: 220 }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" style={{ maxHeight: 210 }} />
                  ) : (
                    <div className="text-muted-neon">No image selected</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Prediction + History column */}
        <div className="col-lg-8">
          <div className="card neon p-3 mb-3">
            <div className="card-body">
              <h5 className="neon-accent">Latest Prediction</h5>

              {result ? (
                <div className="row align-items-center mt-3">
                  <div className="col-md-8">
                    <h3 className="fw-bold" style={{ color: result.label === "parkinson" ? "#ff6b6b" : "#54e0a3" }}>
                      {result.label.toUpperCase()}
                    </h3>
                    <div className="text-muted-neon mb-2">Model: {result.modelVersion}</div>
                    <div className="mb-2">Confidence: <b>{(result.score*100).toFixed(1)}%</b></div>
                    <div className="text-muted-neon">Subject: {result.subjectId}</div>
                    <div className="text-muted-neon">Time: {result.time ? new Date(result.time).toLocaleString() : "N/A"}</div>
                  </div>

                  <div className="col-md-4 text-end">
                    <div className="preview-frame p-2" style={{ height: 150, width: 150, marginLeft: 'auto' }}>
                      {previewUrl ? <img src={previewUrl} style={{ maxHeight: 140 }} alt="latest" /> : <div className="text-muted-neon">N/A</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-neon mt-3">No prediction yet — upload a spiral to begin.</div>
              )}
            </div>
          </div>

          <div className="card neon p-3">
            <div className="card-body">
              <h5 className="neon-accent">History</h5>

              <div className="chart-box my-3" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history.map((h, i) => ({ index: i+1, score: h.score }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="index" stroke="rgba(255,255,255,0.4)" />
                    <YAxis stroke="rgba(255,255,255,0.4)" />
                    <Tooltip formatter={(v)=>`${(v*100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <ul className="list-group list-group-flush">
                {history.map(h => (
                  <li key={h.id} className="list-group-item bg-transparent border-0 d-flex justify-content-between align-items-center">
                    <div>
                      <div style={{ fontWeight:700, color: h.label === 'parkinson' ? '#ff6b6b' : '#54e0a3' }}>{h.label}</div>
                      <div className="text-muted-neon small">{h.subjectId} • {h.time ? new Date(h.time).toLocaleString() : 'Unknown'}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700 }}>{(h.score*100).toFixed(1)}%</div>
                      <div className="text-muted-neon small">{h.modelVersion}</div>
                    </div>
                  </li>
                ))}
                {history.length===0 && <li className="list-group-item bg-transparent border-0 text-muted-neon">No history yet</li>}
              </ul>

            </div>
          </div>

        </div>
      </div>

      <div className="footer">
        <div className="small">SpiralPD — research demo • Keep results private • For educational use</div>
      </div>
    </div>
  );
}
