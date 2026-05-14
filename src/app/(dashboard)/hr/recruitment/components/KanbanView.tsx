"use client";

import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Candidate, COLUMNS } from "../types";

interface Props {
  data: Record<string, Candidate[]>;
  setData: (data: Record<string, Candidate[]>) => void;
}

export function KanbanView({ data, setData }: Props) {
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = [...data[source.droppableId]];
    const destCol = source.droppableId === destination.droppableId ? sourceCol : [...data[destination.droppableId]];
    
    const [removed] = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, removed);

    const newData = {
      ...data,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol,
    };
    setData(newData);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-100 d-flex gap-4 overflow-x-auto pb-3 custom-scrollbar">
        {COLUMNS.map((col) => (
          <div key={col.id} className="d-flex flex-column" style={{ minWidth: "300px", maxWidth: "300px", flexShrink: 0 }}>
            {/* Column Header */}
            <div className="d-flex align-items-center justify-content-between mb-3 px-1">
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 32, height: 32, background: `color-mix(in srgb, ${col.color} 15%, transparent)`, color: col.color }}>
                  <i className={`bi ${col.icon}`} />
                </div>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{col.label}</span>
                <span className="badge rounded-pill bg-light text-muted border px-2 py-1" style={{ fontSize: "10px" }}>
                  {data[col.id]?.length || 0}
                </span>
              </div>
            </div>

            {/* Droppable Column Body */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-grow-1 d-flex flex-column gap-3 p-2 rounded-4 transition-all"
                  style={{ 
                    background: snapshot.isDraggingOver ? "rgba(0,0,0,0.02)" : "transparent",
                    minHeight: "100px"
                  }}
                >
                  {(data[col.id] || []).map((can, index) => (
                    <Draggable key={can.id} draggableId={can.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.8 : 1,
                          }}
                        >
                          <CandidateCard candidate={can} isRequest={col.id === "requests"} color={col.color} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  <button className="btn btn-outline-dashed w-100 border-2 py-2 text-muted mt-2" style={{ borderRadius: "12px", fontSize: "12px", fontWeight: 600, borderStyle: "dashed" }}>
                    <i className="bi bi-plus-lg me-1" /> Thêm mới
                  </button>
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

function CandidateCard({ candidate, isRequest, color }: { candidate: Candidate; isRequest: boolean; color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -2, boxShadow: "0 8px 16px -4px rgba(0,0,0,0.1)" }}
      className="bg-card p-3 shadow-sm border rounded-4 position-relative overflow-hidden cursor-pointer"
      style={{ borderLeft: candidate.urgent ? "4px solid #ef4444" : "1px solid var(--border)" }}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: candidate.urgent ? "#ef4444" : "var(--muted-foreground)", letterSpacing: "0.05em" }}>
          {isRequest ? "Yêu cầu nhân sự" : candidate.source}
        </span>
        <div className="d-flex gap-1">
          {candidate.matchScore >= 90 && <span className="badge bg-success-subtle text-success border-0 px-2" style={{ fontSize: "9px" }}>Top Match</span>}
        </div>
      </div>

      <h5 className="mb-1" style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>{candidate.name}</h5>
      <p className="mb-3 text-muted" style={{ fontSize: "12px" }}>{candidate.position}</p>

      <div className="d-flex align-items-center justify-content-between pt-2 border-top">
        <div className="d-flex">
           <div className="rounded-circle" style={{ width: 22, height: 22, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800 }}>
             {candidate.name.charAt(0)}
           </div>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: "11px" }}>
            <i className="bi bi-chat-text" /> 2
          </span>
          <span className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: "11px" }}>
            <i className="bi bi-paperclip" /> 1
          </span>
        </div>
      </div>

      <div className="position-absolute bottom-0 start-0 w-100" style={{ height: "3px", background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
        <div style={{ width: `${candidate.matchScore}%`, height: "100%", background: color }} />
      </div>
    </motion.div>
  );
}
