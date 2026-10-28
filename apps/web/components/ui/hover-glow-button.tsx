import React, { useRef, useState, MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* tailwind-merge lets the caller's className (e.g. the compact nav-pill
   sizing) override this component's default padding/text utilities. */
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  className?: string;
  disabled?: boolean;
  glowColor?: string;
  backgroundColor?: string;
  textColor?: string;
  hoverTextColor?: string;
  /** When set, renders a next/link <a> instead of a <button>. */
  href?: string;
  title?: string;
}

const HoverButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  onMouseEnter,
  className = "",
  disabled = false,
  glowColor = "#00ffc3",
  backgroundColor = "#111827", // gray-900 equivalent
  textColor = "#ffffff",
  hoverTextColor = "#67e8f9", // cyan-300 equivalent
  href,
  title,
}) => {
  const buttonRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setGlowPosition({ x, y });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const classes = cn(
    `relative inline-block px-8 py-4 border-none
    cursor-pointer overflow-hidden transition-colors duration-300
    text-xl rounded-lg z-10 font-sans
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`,
    className
  );

  const style: React.CSSProperties = {
    backgroundColor,
    color: isHovered ? hoverTextColor : textColor,
  };

  const glow = (
    <>
      {/* Glow effect div */}
      <div
        className={`
          absolute w-[200px] h-[200px] rounded-full opacity-50 pointer-events-none
          transition-transform duration-400 ease-out -translate-x-1/2 -translate-y-1/2
          ${isHovered ? "scale-120" : "scale-0"}
        `}
        style={{
          left: `${glowPosition.x}px`,
          top: `${glowPosition.y}px`,
          background: `radial-gradient(circle, ${glowColor} 10%, transparent 70%)`,
          zIndex: 0,
        }}
      />

      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </>
  );

  const sharedProps = {
    ref: buttonRef,
    className: classes,
    style,
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick,
    title,
  };

  if (href && !disabled) {
    return (
      <Link href={href} {...sharedProps}>
        {glow}
      </Link>
    );
  }

  return (
    <button {...sharedProps} disabled={disabled} type="button">
      {glow}
    </button>
  );
};

export { HoverButton };
