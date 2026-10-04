import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = '', ...props }: CardProps) {
  return <section className={`ui-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={`ui-card-header ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`ui-card-title ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`ui-card-description ${className}`.trim()} {...props} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card-content ${className}`.trim()} {...props} />;
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={`ui-card-footer ${className}`.trim()} {...props} />;
}
