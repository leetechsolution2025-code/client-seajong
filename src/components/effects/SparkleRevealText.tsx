"use client";

import React, { useEffect } from "react";

function GoldenSparks() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let particles: any[] = [];
    let animationFrame: number;
    let startTime = Date.now();
    const duration = 4000;

    const createParticle = (x: number, y: number, textHeight: number) => {
      return {
        x,
        // Dải đều từ đầu đến cuối chiều cao khối chữ (textHeight)
        y: y + (Math.random() * textHeight - (textHeight / 2)),
        // Bắn tốc độ nhanh và văng tủa ra rất gắt
        vx: (Math.random() - 0.5) * 12 + 4,
        vy: (Math.random() - 0.5) * 20,
        size: Math.random() * 4.5 + 1.5,
        life: 1,
        decay: Math.random() * 0.03 + 0.015
      };
    };

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.1); // Giới hạn progress
      
      if (progress >= 0.05 && progress <= 0.75) {
        const moveProgress = (progress - 0.05) / 0.70;
        const currentX = moveProgress * (w - 400) + 200; // offset left 200px do canvas bành ra
        for (let i = 0; i < 25; i++) {
           // Băng qua chiều cao thực tế của chữ (trừ độ dư 400 của canvas)
           particles.push(createParticle(currentX, h / 2, h - 400));
        }
      }

      ctx.globalCompositeOperation = 'screen';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${p.life})`;
        ctx.fill();
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#eab308';
      }
      
      animationFrame = requestAnimationFrame(loop);
    };

    const initCanvas = () => {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if(rect) {
          // Bành trướng canvas ra thêm 400px (200px mỗi bên) để tia lửa không bị cắt hụt
          canvas.width = rect.width + 400;
          canvas.height = rect.height + 400;
        }
    };
    initCanvas();
    loop();

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: '-200px', left: '-200px', width: 'calc(100% + 400px)', height: 'calc(100% + 400px)', pointerEvents: 'none', zIndex: 10 }} />;
}

export default function SparkleRevealText({ text, fontSize = "14px", fontWeight = 800 }: { text: string; fontSize?: string; fontWeight?: number | string }) {
  if (!text) return null;

  return (
    <div style={{ textAlign: "center" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .sparkle-reveal-wrapper {
          position: relative;
          display: inline-block;
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          color: rgba(0,0,0,0.05); /* Chữ chìm trên nền trắng */
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1.4;
          padding: 10px;
        }
        .sparkle-reveal-text {
          position: absolute;
          top: 10px; left: 10px; right: 10px; bottom: 10px;
          color: #eab308; /* Vàng sáng */
          pointer-events: none;
          /* Mặt nạ lộ diện từ từ */
          -webkit-mask-image: linear-gradient(to right, black 0%, black 50%, transparent 50.1%, transparent 100%);
          -webkit-mask-size: 200% 100%;
          -webkit-mask-position: 100% 0;
          animation: sparkMask 4s linear forwards;
          filter: drop-shadow(0 0 10px #ca8a04);
        }
        @keyframes sparkMask {
          0% { -webkit-mask-position: 100% 0; opacity: 0; }
          5% { -webkit-mask-position: 100% 0; opacity: 1; }
          75% { -webkit-mask-position: 0% 0; opacity: 1; filter: drop-shadow(0 0 10px #facc15); }
          85% { -webkit-mask-position: 0% 0; opacity: 1; filter: drop-shadow(0 0 2px #ca8a04); }
          100% { -webkit-mask-position: 0% 0; opacity: 1; filter: none; }
        }
      `}} />
      <div className="sparkle-reveal-wrapper">
        {text}
        <div className="sparkle-reveal-text">{text}</div>
        <GoldenSparks />
      </div>
    </div>
  );
}
