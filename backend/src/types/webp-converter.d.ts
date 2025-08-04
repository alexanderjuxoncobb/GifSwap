declare module 'webp-converter' {
  export function grant_permission(): void;
  
  export function gwebp(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function cwebp(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function dwebp(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function webpmux_add(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function webpmux_extract(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function webpmux_strip(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function webpmux_info(
    inputFile: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function gif2webp(
    inputFile: string,
    outputFile: string,
    options: string,
    callback: (status: any, error?: any) => void
  ): void;
  
  export function webpinfo(
    inputFile: string,
    callback: (status: any, error?: any) => void
  ): void;
}