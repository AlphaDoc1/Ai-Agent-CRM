"use client";

import { useEffect, useState } from "react";
import { useDistributorStore } from "@/lib/store";
import { EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { formatDate } from "@/lib/utils";
import { Plus, Users, X, Edit2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDistributorSchema, type CreateDistributorInput } from "@/lib/validations";

export default function DistributorsPage() {
  const { distributors, isLoading, fetchDistributors } = useDistributorStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateDistributorInput>({
    resolver: zodResolver(createDistributorSchema),
  });

  const openEdit = (d: CreateDistributorInput & { id: string }) => {
    setEditId(d.id);
    setValue("name", d.name);
    setValue("state", d.state);
    setValue("region", d.region || "");
    setValue("city", d.city || "");
    setValue("phone", d.phone);
    setValue("email", d.email);
    setValue("address", d.address || "");
    setShowForm(true);
  };

  const onSubmit = async (data: CreateDistributorInput) => {
    setSubmitting(true);
    try {
      const url = editId ? `/api/distributors/${editId}` : "/api/distributors";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        reset();
        setShowForm(false);
        setEditId(null);
        fetchDistributors();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this distributor?")) return;
    try {
      await fetch(`/api/distributors/${id}`, { method: "DELETE" });
      fetchDistributors();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Distributors</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Manage your distribution network
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); reset(); setShowForm(true); }}>
          <Plus size={16} /> Add Distributor
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : distributors.length === 0 ? (
        <EmptyState
          title="No distributors"
          description="Add your first distributor to enable auto lead routing"
          icon={<Users size={28} />}
          action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Distributor</button>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {distributors.map((d) => (
            <div key={d.id} className="glass-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "12px",
                    background: d.is_active ? "var(--gradient-success)" : "rgba(107,107,128,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px", fontWeight: 700, color: "white",
                  }}>
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 600 }}>{d.name}</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {d.state}{d.region ? ` • ${d.region}` : ""}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button className="btn-ghost" style={{ padding: "6px", border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => openEdit({ ...d, region: d.region || "", city: d.city || "", address: d.address || "" })}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px", border: "none", background: "none", cursor: "pointer", color: "var(--accent-red)" }} onClick={() => handleDelete(d.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "2px" }}>Email</p>
                  <p style={{ color: "var(--text-secondary)" }}>{d.email}</p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "2px" }}>Phone</p>
                  <p style={{ color: "var(--text-secondary)" }}>{d.phone}</p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "2px" }}>Leads</p>
                  <p style={{ fontWeight: 600 }}>{d.total_leads_assigned}</p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", marginBottom: "2px" }}>Conversions</p>
                  <p style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>{d.total_conversions}</p>
                </div>
              </div>

              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", fontSize: "12px", color: "var(--text-muted)" }}>
                Added {formatDate(d.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditId(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 600 }}>{editId ? "Edit" : "Add"} Distributor</h2>
              <button style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }} onClick={() => { setShowForm(false); setEditId(null); }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Name *</label>
                  <input className={`input ${errors.name ? "input-error" : ""}`} placeholder="Distributor name" {...register("name")} />
                  {errors.name && <p style={{ color: "var(--accent-red)", fontSize: "12px", marginTop: "4px" }}>{errors.name.message}</p>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>State *</label>
                    <input className={`input ${errors.state ? "input-error" : ""}`} placeholder="Maharashtra" {...register("state")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Region</label>
                    <input className="input" placeholder="West" {...register("region")} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>City</label>
                    <input className="input" placeholder="Mumbai" {...register("city")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Phone *</label>
                    <input className={`input ${errors.phone ? "input-error" : ""}`} placeholder="+91-XXXXXXXXXX" {...register("phone")} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Email *</label>
                  <input className={`input ${errors.email ? "input-error" : ""}`} placeholder="email@example.com" {...register("email")} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Address</label>
                  <textarea className="input" rows={2} placeholder="Full address" style={{ resize: "vertical" }} {...register("address")} />
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Saving..." : editId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
