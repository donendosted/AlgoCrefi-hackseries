"use client";
import { useEffect, useRef } from "react";

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const curr = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
    };

    const expand = () => {
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.borderColor = "#7B2FFF";
    };
    const shrink = () => {
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.borderColor = "#00FFD1";
    };

    function tick() {
      curr.current.x = lerp(curr.current.x, pos.current.x, 0.1);
      curr.current.y = lerp(curr.current.y, pos.current.y, 0.1);
      el!.style.transform = `translate(${curr.current.x}px,${curr.current.y}px) translate(-50%,-50%)`;
      rafId.current = requestAnimationFrame(tick);
    }
    tick();

    const attach = () => {
      document.querySelectorAll("a,button,[data-cursor]").forEach((node) => {
        node.removeEventListener("mouseenter", expand);
        node.removeEventListener("mouseleave", shrink);
        node.addEventListener("mouseenter", expand);
        node.addEventListener("mouseleave", shrink);
      });
    };
    attach();

    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "10px",
        height: "10px",
        border: "1.5px solid #00FFD1",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 99999,
        mixBlendMode: "difference",
        transition: "width 0.15s ease, height 0.15s ease, border-color 0.15s ease",
        willChange: "transform",
      }}
    />
  );
}
