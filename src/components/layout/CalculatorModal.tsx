"use client";

import React, { useState, useEffect } from "react";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [memory, setMemory] = useState<number>(0);
  const [hasMemory, setHasMemory] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Center modal on mount
  useEffect(() => {
    setPosition({ x: window.innerWidth / 2 - 170, y: window.innerHeight / 2 - 250 });
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize center position on first open
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: window.innerWidth / 2 - 170, y: window.innerHeight / 2 - 250 });
    }
  }, [isOpen]);

  // Handle drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      };
      const handleMouseUp = () => setIsDragging(false);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      // Handle keyboard input
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); handleNumber(e.key); }
      if (['+', '-', '*', '/'].includes(e.key)) { e.preventDefault(); handleOperator(e.key); }
      if (e.key === "Enter" || e.key === "=") { e.preventDefault(); handleCalculate(); }
      if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); }
      if (e.key === "." || e.key === ",") { e.preventDefault(); handleDecimal(); }
      if (e.key === "%") { e.preventDefault(); handlePercent(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, display, equation, isNewNumber]);

  if (!isOpen) return null;

  const handleNumber = (num: string) => {
    if (equation.includes("=")) setEquation("");
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      // Limit to 12 digits like typical casio
      if (display.replace(/[^0-9]/g, "").length < 12) {
        setDisplay(display === "0" ? num : display + num);
      }
    }
  };

  const handleOperator = (op: string) => {
    if (equation.includes("=")) {
      setEquation(display + " " + op);
      setIsNewNumber(true);
      return;
    }
    if (!isNewNumber) {
      setEquation(equation + (equation ? " " : "") + display + " " + op);
      setIsNewNumber(true);
    } else if (equation) {
      // Update operator
      setEquation(equation.slice(0, -1) + op);
    } else {
      setEquation(display + " " + op);
    }
  };

  const handleCalculate = () => {
    if (!equation || equation.includes("=")) return;
    try {
      const fullEquation = equation + " " + display;
      let result = new Function('return ' + fullEquation.replace(/×/g, '*').replace(/÷/g, '/'))();
      
      // Handle decimal precision issues
      result = Math.round(result * 10000000000) / 10000000000;
      
      setDisplay(String(result));
      setEquation(fullEquation + " =");
      setIsNewNumber(true);
    } catch (e) {
      setDisplay("Error");
      setEquation("");
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    if (equation.includes("=")) setEquation("");
    setIsNewNumber(true);
  };

  const handleAllClear = () => {
    setDisplay("0");
    setEquation("");
    setIsNewNumber(true);
  };

  const handleBackspace = () => { // Acts as the ▶ button
    if (isNewNumber) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
      setIsNewNumber(true);
    }
  };

  const handleDecimal = () => {
    if (isNewNumber) {
      setDisplay("0.");
      setIsNewNumber(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleToggleSign = () => {
    if (display !== "0") {
      setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    }
  };

  const handleSqrt = () => {
    try {
      const val = parseFloat(display);
      if (val < 0) {
        setDisplay("Error");
      } else {
        setDisplay(String(Math.sqrt(val)));
      }
      setIsNewNumber(true);
    } catch(e) {}
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      setDisplay(String(val / 100));
      setIsNewNumber(true);
    } catch(e) {}
  };

  // Memory functions
  const handleMC = () => { setMemory(0); setHasMemory(false); };
  const handleMR = () => { setDisplay(String(memory)); setIsNewNumber(true); };
  const handleMMinus = () => { setMemory(memory - parseFloat(display || "0")); setHasMemory(true); setIsNewNumber(true); };
  const handleMPlus = () => { setMemory(memory + parseFloat(display || "0")); setHasMemory(true); setIsNewNumber(true); };

  // Helper to format number with thousands separators for display
  const formatDisplay = (numStr: string) => {
    if (numStr === "Error" || numStr === "0.") return numStr;
    const parts = numStr.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'"); // Casio often uses apostrophe or comma
    return parts.join(".");
  };

  const mainBg = "linear-gradient(135deg, #2a2a2c 0%, #1a1a1c 100%)";
  const btnColor = "#1a1a1c";
  const textPrimary = "#f1f1f1";
  const screenBg = "#e0ebe4";

  return (
    <>
      {/* Casio Calculator Body */}
      <div 
        style={{
          background: mainBg, 
          width: 340, 
          borderRadius: 20,
          boxShadow: isDragging ? "0 25px 50px rgba(0,0,0,0.6)" : "0 15px 35px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.1), inset 0 -2px 5px rgba(0,0,0,0.5)", 
          overflow: "hidden",
          border: "2px solid #333",
          padding: "20px",
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          fontFamily: "sans-serif",
          cursor: isDragging ? "grabbing" : "auto",
          transition: isDragging ? "none" : "box-shadow 0.2s"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand & Drag Handle */}
        <div 
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15, cursor: "grab" }}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
          }}
        >
          <div style={{ color: "#d1d1d1", fontWeight: 900, fontSize: 18, letterSpacing: 1, textShadow: "0 1px 1px rgba(0,0,0,0.8)" }}>
            CASIO
          </div>
          <div style={{ 
            width: 100, height: 25, background: "#3a2a2a", 
            border: "1px solid #111", borderRadius: 3,
            boxShadow: "inset 0 2px 5px rgba(0,0,0,0.6)"
          }} />
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#666", marginTop: -5, marginRight: -5 }}>
             <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* LCD Screen */}
        <div style={{ 
          background: screenBg, 
          padding: "10px 15px", 
          borderRadius: 8, 
          marginBottom: "20px", 
          textAlign: "right",
          boxShadow: "inset 0 3px 6px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.1)",
          minHeight: 80,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "2px solid #b5c4bd"
        }}>
          {/* Status indicators & Equation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 10, color: "#111", fontWeight: 600 }}>{hasMemory ? "MEMORY" : ""}</div>
            <div style={{ 
              fontSize: "13px", 
              color: "#555", 
              fontFamily: "'Share Tech Mono', 'Courier New', Courier, monospace",
              textAlign: "right",
              minHeight: "16px",
              lineHeight: 1.2
            }}>
              {equation.replace(" =", "")}{!isNewNumber && !equation.includes("=") ? (equation ? " " : "") + display : ""}
            </div>
          </div>
          
          {/* Main Display */}
          <div style={{ 
            fontSize: "34px", 
            fontWeight: 400, 
            color: "#1a1a1c", 
            fontFamily: "'Share Tech Mono', 'Courier New', Courier, monospace", /* Use monospace to mimic LCD */
            letterSpacing: "-1px",
            lineHeight: 1
          }}>
            {formatDisplay(display)}
          </div>
        </div>

        {/* Sliders (Decorative) */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15, padding: "0 10px" }}>
          <div style={{ fontSize: 9, color: "#999", textAlign: "center" }}>
            F CUT 5/4<br/>
            <div style={{ background: "#111", width: 40, height: 12, borderRadius: 2, margin: "2px auto 0", position: "relative" }}>
              <div style={{ position: "absolute", left: 2, top: 1, bottom: 1, width: 10, background: "#444", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#999", textAlign: "center" }}>
            4 3 2 1 0 ADD₂<br/>
            <div style={{ background: "#111", width: 60, height: 12, borderRadius: 2, margin: "2px auto 0", position: "relative" }}>
              <div style={{ position: "absolute", left: 15, top: 1, bottom: 1, width: 10, background: "#444", borderRadius: 1 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>TAX RATE</div>
              <button style={{ background: "#222", border: "1px solid #111", color: "#a3e635", fontSize: 10, padding: "4px 8px", borderRadius: 4, boxShadow: "0 2px 0 #111" }}>TAX-</button>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>TAX RATE</div>
              <button style={{ background: "#222", border: "1px solid #111", color: "#a3e635", fontSize: 10, padding: "4px 8px", borderRadius: 4, boxShadow: "0 2px 0 #111" }}>TAX+</button>
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
          
          {/* Row 1: Sub-functions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>RATE</span>
            <button className="casio-btn-small" onClick={() => {}}>MULTI<br/>EXCHANGE</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>SET</span>
            <button className="casio-btn-small" onClick={handlePercent}>%</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "transparent", marginBottom: 2 }}>.</span>
            <button className="casio-btn-small" onClick={handleSqrt}>√</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "transparent", marginBottom: 2 }}>.</span>
            <button className="casio-btn-small" onClick={handleBackspace}>▶</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "transparent", marginBottom: 2 }}>.</span>
            <button className="casio-btn-small" onClick={() => {}}>GRAND<br/>TOTAL</button>
          </div>

          {/* Row 2: Memory */}
          <button className="casio-btn-mem" onClick={handleMC}>MEMORY<br/>CLEAR</button>
          <button className="casio-btn-mem" onClick={handleMR}>MEMORY<br/>RECALL</button>
          <button className="casio-btn-mem" onClick={handleMMinus}>MEMORY<br/>−</button>
          <button className="casio-btn-mem" onClick={handleMPlus}>MEMORY<br/>+</button>
          <button className="casio-btn-op" onClick={() => handleOperator('/')}>÷</button>

          {/* Row 3 */}
          <button className="casio-btn-op" onClick={handleToggleSign}>+/−</button>
          <button className="casio-btn-num" onClick={() => handleNumber('7')}>7</button>
          <button className="casio-btn-num" onClick={() => handleNumber('8')}>8</button>
          <button className="casio-btn-num" onClick={() => handleNumber('9')}>9</button>
          <button className="casio-btn-op" onClick={() => handleOperator('*')}>×</button>

          {/* Row 4 */}
          <button className="casio-btn-clear" onClick={handleClear}>C</button>
          <button className="casio-btn-num" onClick={() => handleNumber('4')}>4</button>
          <button className="casio-btn-num" onClick={() => handleNumber('5')}>5</button>
          <button className="casio-btn-num" onClick={() => handleNumber('6')}>6</button>
          <button className="casio-btn-op" onClick={() => handleOperator('-')}>−</button>

          {/* Row 5 */}
          <button className="casio-btn-clear" onClick={handleAllClear} style={{ position: "relative" }}>
            <span style={{ position: "absolute", top: -14, left: 2, fontSize: 8, color: "#999" }}>ON</span>
            AC
          </button>
          <button className="casio-btn-num" onClick={() => handleNumber('1')}>1</button>
          <button className="casio-btn-num" onClick={() => handleNumber('2')}>2</button>
          <button className="casio-btn-num" onClick={() => handleNumber('3')}>3</button>
          <button className="casio-btn-op" style={{ gridRow: "span 2", paddingBottom: "20px" }} onClick={() => handleOperator('+')}>+</button>

          {/* Row 6 */}
          <button className="casio-btn-num" onClick={() => handleNumber('0')}>0</button>
          <button className="casio-btn-num" onClick={() => handleNumber('00')}>00</button>
          <button className="casio-btn-num" onClick={handleDecimal}>.</button>
          <button className="casio-btn-op" onClick={handleCalculate}>=</button>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        .casio-btn-small {
          background: #2a2a2c;
          border: 1px solid #111;
          color: #d1d1d1;
          font-size: 10px;
          border-radius: 4px;
          height: 32px;
          width: 100%;
          box-shadow: 0 2px 0 #111;
          cursor: pointer;
          font-weight: 600;
          line-height: 1.1;
          padding: 0;
        }
        .casio-btn-small:active {
          transform: translateY(2px);
          box-shadow: none;
        }
        .casio-btn-mem {
          background: #222;
          border: 1px solid #111;
          color: #38bdf8;
          font-size: 9px;
          border-radius: 4px;
          height: 38px;
          width: 100%;
          box-shadow: 0 3px 0 #0a0a0a;
          cursor: pointer;
          font-weight: 600;
          line-height: 1.1;
        }
        .casio-btn-mem:active {
          transform: translateY(3px);
          box-shadow: none;
        }
        .casio-btn-num {
          background: #333;
          border: 1px solid #111;
          color: #fff;
          font-size: 20px;
          border-radius: 5px;
          height: 42px;
          width: 100%;
          box-shadow: 0 4px 0 #0a0a0a, inset 0 1px 1px rgba(255,255,255,0.1);
          cursor: pointer;
          font-weight: 400;
        }
        .casio-btn-num:active {
          transform: translateY(4px);
          box-shadow: none;
        }
        .casio-btn-op {
          background: #222;
          border: 1px solid #111;
          color: #fff;
          font-size: 20px;
          border-radius: 5px;
          height: 100%;
          min-height: 42px;
          width: 100%;
          box-shadow: 0 4px 0 #0a0a0a, inset 0 1px 1px rgba(255,255,255,0.05);
          cursor: pointer;
          font-weight: 400;
        }
        .casio-btn-op:active {
          transform: translateY(4px);
          box-shadow: none;
        }
        .casio-btn-clear {
          background: #222;
          border: 1px solid #111;
          color: #ef4444;
          font-size: 20px;
          border-radius: 5px;
          height: 42px;
          width: 100%;
          box-shadow: 0 4px 0 #0a0a0a, inset 0 1px 1px rgba(255,255,255,0.05);
          cursor: pointer;
          font-weight: 400;
        }
        .casio-btn-clear:active {
          transform: translateY(4px);
          box-shadow: none;
        }
      `}} />
    </>
  );
}
