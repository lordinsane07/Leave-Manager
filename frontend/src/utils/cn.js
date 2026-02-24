import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges Tailwind classes with clsx for conditional class composition
export const cn = (...inputs) => twMerge(clsx(inputs));
