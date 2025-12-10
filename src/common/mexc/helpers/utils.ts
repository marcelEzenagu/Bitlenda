import axios, { AxiosInstance } from "axios";
import { Console } from "console";

// -------------------------------
// Types
// -------------------------------
type KeyValuePair = [string, any];

export const isEmptyValue = (input: any): boolean => {
  return (
    (!input && input !== false && input !== 0) ||
    (typeof input === "string" && /^\s+$/.test(input)) ||
    (input instanceof Object && !Array.isArray(input) && !Object.keys(input).length) ||
    (Array.isArray(input) && input.length === 0)
  );
};

export const removeEmptyValue = <T extends Record<string, any>>(obj: T): Partial<T> => {
  if (typeof obj !== "object" || obj === null) return {};
  const clone = { ...obj };

  Object.keys(clone).forEach((key) => {
    if (isEmptyValue(clone[key])) delete clone[key];
  });

  return clone;
};

export const stringifyKeyValuePair = ([key, value]: KeyValuePair): string => {
  const valueString = typeof value === "object" ? JSON.stringify(value) : value;
  return `${key}=${encodeURIComponent(valueString)}`;
};

export const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return "";
  return Object.entries(params).map(stringifyKeyValuePair).join("&");
};

// -------------------------------
// Axios helpers
// -------------------------------
export const getRequestInstance = (config: object): AxiosInstance => {
  return axios.create(config);
};

interface IRequestConfig {
  baseURL: string;
  apiKey?: string;
  method: string;
  url: string;
}

export const createRequest = (config: IRequestConfig) => {
  const { baseURL, apiKey, method, url } = config;

  return getRequestInstance({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-MEXC-APIKEY": apiKey } : {}),
    },
  }).request({
    method,
    url,
  });
};

// -------------------------------
// Functional Utils
// -------------------------------
export const flowRight =
  <T>(...functions: Array<(arg: T) => T>) =>
  (input: T): T =>
    functions.reduceRight((acc, fn) => fn(acc), input);

// -------------------------------
// Logger
// -------------------------------
export const defaultLogger = new Console({
  stdout: process.stdout,
  stderr: process.stderr,
});
