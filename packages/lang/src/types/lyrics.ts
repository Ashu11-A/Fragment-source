/* eslint-disable @typescript-eslint/no-explicit-any */

export type ExtractVariables<S extends string> =
  S extends `${string}{{${infer Var}}}${infer Rest}`
    ? Var | ExtractVariables<Rest>
    : never;

export type ExtractAllVariables<T> = T extends Record<string, any>
  ? { [K in keyof T]: ExtractAllVariables<T[K]> }[keyof T]
  : T extends string
  ? ExtractVariables<T>
  : never;

export type ExtractObjectPath<T, Key extends keyof T> = Key extends string
? T[Key] extends Record<string, any>
  ? `${Key}.${ExtractObjectPath<T[Key], Extract<keyof T[Key], string>>}`
  : `${Key}`
  : never

export type Paths<T> = ExtractObjectPath<T, keyof T>

export type ValueOfLang<T, P extends Paths<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Paths<T[Key]>
      ? ValueOfLang<T[Key], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never