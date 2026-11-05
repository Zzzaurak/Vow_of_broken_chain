import type { ButtonHTMLAttributes } from 'react';
export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`border border-[#c7b17a]/40 bg-[#203137]/80 px-5 py-3 text-sm tracking-wider transition hover:border-[#e5c783] hover:bg-[#304249] ${className}`}
      {...props}
    />
  );
}
