import 'react'
declare module 'react' {
  interface HTMLAttributes<T> {
    'data-card'?: any;
    'data-id'?: any;
    'data-column'?: any;
  }
}
export {}